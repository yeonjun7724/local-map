import fs from 'node:fs';
import Papa from 'papaparse';

const [graphPath = '.cache/routing/walk.graphml', placesPath = 'data/places.csv', pathsPath = 'data/route-paths.json', outputPath = 'data/route-connections.json'] = process.argv.slice(2);
const xml = fs.readFileSync(graphPath, 'utf8');
const places = Papa.parse(fs.readFileSync(placesPath, 'utf8'), { header: true, skipEmptyLines: true }).data
  .filter(place => place.latitude !== '' && place.longitude !== '')
  .map(place => ({ ...place, latitude: Number(place.latitude), longitude: Number(place.longitude) }))
  .filter(place => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
const metadata = new Map([...xml.matchAll(/<key id="([^"]+)"[^>]*attr\.name="([^"]+)"/g)].map(([, key, name]) => [key, name]));
const nodes = new Map();
for (const [, id, body] of xml.matchAll(/<node id="([^"]+)"[^>]*>([\s\S]*?)<\/node>/g)) {
  const node = Object.fromEntries([...body.matchAll(/<data key="([^"]+)">([^<]*)<\/data>/g)].map(([, key, value]) => [metadata.get(key), Number(value)]));
  if (Number.isFinite(node.x) && Number.isFinite(node.y)) nodes.set(id, { id, longitude: node.x, latitude: node.y });
}
const adjacency = new Map([...nodes.keys()].map(id => [id, new Map()]));
for (const [, from, to, body] of xml.matchAll(/<edge source="([^"]+)" target="([^"]+)"[^>]*>([\s\S]*?)<\/edge>/g)) {
  const values = Object.fromEntries([...body.matchAll(/<data key="([^"]+)">([^<]*)<\/data>/g)].map(([, key, value]) => [metadata.get(key), value]));
  const length = Number(values.length);
  if (Number.isFinite(length) && adjacency.has(from) && adjacency.has(to)
      && (!adjacency.get(from).has(to) || length < adjacency.get(from).get(to))) adjacency.get(from).set(to, length);
}

const radians = degrees => degrees * Math.PI / 180;
function distanceM(a, b) {
  const dLat = radians(a.latitude - b.latitude), dLon = radians(a.longitude - b.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function nearestNode(place) {
  let best = null, bestDistance = Infinity;
  for (const node of nodes.values()) {
    const distance = distanceM(place, node);
    if (distance < bestDistance) { best = node; bestDistance = distance; }
  }
  return { node: best, distance: bestDistance };
}

class MinHeap {
  items = [];
  push(item) {
    const a = this.items; a.push(item); let i = a.length - 1;
    while (i > 0) { const parent = (i - 1) >> 1; if (a[parent][0] <= item[0]) break; a[i] = a[parent]; i = parent; }
    a[i] = item;
  }
  pop() {
    const a = this.items, first = a[0], last = a.pop();
    if (a.length) { let i = 0; while (true) { let child = i * 2 + 1; if (child >= a.length) break; if (child + 1 < a.length && a[child + 1][0] < a[child][0]) child++; if (a[child][0] >= last[0]) break; a[i] = a[child]; i = child; } a[i] = last; }
    return first;
  }
  get size() { return this.items.length; }
}

const placeNodes = new Map(places.map(place => [place.id, nearestNode(place)]));
const connections = {};
for (const origin of places) {
  const start = placeNodes.get(origin.id);
  const distances = new Map([[start.node.id, 0]]), previous = new Map(), heap = new MinHeap();
  heap.push([0, start.node.id]);
  while (heap.size) {
    const [distance, current] = heap.pop();
    if (distance !== distances.get(current)) continue;
    for (const [next, length] of adjacency.get(current)) {
      const candidate = distance + length;
      if (candidate < (distances.get(next) ?? Infinity)) { distances.set(next, candidate); previous.set(next, current); heap.push([candidate, next]); }
    }
  }
  for (const destination of places) {
    if (origin.id === destination.id) continue;
    const finish = placeNodes.get(destination.id);
    const id = `${origin.id}::${destination.id}`;
    const base = { fromId: origin.id, toId: destination.id, status: 'unavailable', distanceM: null, durationS: null, geometry: [], fromSnapDistanceM: Math.round(start.distance * 10) / 10, toSnapDistanceM: Math.round(finish.distance * 10) / 10, reason: null };
    if (Math.max(start.distance, finish.distance) > 100) { base.reason = 'snap_too_far'; connections[id] = base; continue; }
    if (start.node.id === finish.node.id) { base.reason = 'same_network_node'; connections[id] = base; continue; }
    const distance = distances.get(finish.node.id);
    if (distance === undefined) { base.reason = 'no_walking_path'; connections[id] = base; continue; }
    const path = [finish.node.id];
    while (path.at(-1) !== start.node.id) path.push(previous.get(path.at(-1)));
    path.reverse();
    base.status = 'ready'; base.distanceM = Math.round(distance * 10) / 10; base.durationS = Math.round(distance / (4.5 / 3.6));
    base.geometry = path.map(nodeId => [nodes.get(nodeId).longitude, nodes.get(nodeId).latitude]); base.reason = null;
    connections[id] = base;
  }
  console.log(`${origin.id}: ${Object.values(connections).filter(item => item.fromId === origin.id && item.status === 'ready').length}/${places.length - 1} walking connections`);
}

const paths = JSON.parse(fs.readFileSync(pathsPath, 'utf8'));
const routeConnections = {
  generatedAt: new Date().toISOString(),
  source: paths.source,
  license: paths.license,
  walkingSpeedKmh: paths.walkingSpeedKmh,
  networkType: paths.networkType,
  graphRetrievedAt: paths.graphRetrievedAt,
  maxSnapDistanceM: paths.maxSnapDistanceM,
  osmnxVersion: paths.osmnxVersion,
  connections,
};
fs.writeFileSync(outputPath, `${JSON.stringify(routeConnections, null, 2)}\n`, 'utf8');
console.log(`Wrote ${Object.keys(connections).length} OSMnx graph connections to ${outputPath}`);
