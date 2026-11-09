"""Generate ordered walking routes from OSM. Never invent missing facility locations."""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import subprocess

import networkx as nx
import osmnx as ox

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "OpenStreetMap 보행 네트워크 · OSMnx (network_type=walk)"


def input_coordinates(route, places):
    coordinates = []
    for place_id in route["placeIds"]:
        place = places[place_id]
        longitude, latitude = place["longitude"], place["latitude"]
        if bool(longitude) != bool(latitude):
            raise ValueError(f"{place_id}: longitude and latitude must be supplied together")
        if not longitude:
            coordinates.append(None)
            continue
        point = [float(longitude), float(latitude)]
        if not all(math.isfinite(value) for value in point) or not (-180 <= point[0] <= 180 and -90 <= point[1] <= 90):
            raise ValueError(f"{place_id}: invalid coordinate")
        coordinates.append(point)
    return coordinates


def path_geometry(graph, nodes):
    coordinates = []
    distance = 0.0
    for u, v in zip(nodes, nodes[1:]):
        edge = min(graph[u][v].values(), key=lambda data: data["length"])
        distance += float(edge["length"])
        start = [float(graph.nodes[u]["x"]), float(graph.nodes[u]["y"])]
        end = [float(graph.nodes[v]["x"]), float(graph.nodes[v]["y"])]
        points = [list(point[:2]) for point in edge["geometry"].coords] if "geometry" in edge else [start, end]
        if math.dist(points[-1], start) < math.dist(points[0], start):
            points.reverse()
        if coordinates and coordinates[-1] != points[0]:
            raise ValueError("OSM edge geometries are discontinuous")
        coordinates.extend(points[1:] if coordinates else points)
    return coordinates, distance


def generate_route(graph, route, places, speed, max_snap):
    ids = route["placeIds"]
    coordinates = input_coordinates(route, places)
    segments = []
    for index, (from_id, to_id) in enumerate(zip(ids, ids[1:])):
        segment = {"fromId": from_id, "toId": to_id, "status": "unavailable",
                   "distanceM": None, "durationS": None, "geometry": [],
                   "fromSnapDistanceM": None, "toSnapDistanceM": None, "reason": None}
        a, b = coordinates[index:index + 2]
        if a is None or b is None:
            segment["reason"] = "missing_coordinates"
        elif a == b:
            segment["reason"] = "coincident_coordinates"
        else:
            try:
                origin, origin_distance = ox.distance.nearest_nodes(graph, X=a[0], Y=a[1], return_dist=True)
                destination, destination_distance = ox.distance.nearest_nodes(graph, X=b[0], Y=b[1], return_dist=True)
                segment["fromSnapDistanceM"] = round(float(origin_distance), 1)
                segment["toSnapDistanceM"] = round(float(destination_distance), 1)
                if max(origin_distance, destination_distance) > max_snap:
                    segment["reason"] = "snap_too_far"
                elif origin == destination:
                    segment["reason"] = "same_network_node"
                else:
                    nodes = ox.routing.shortest_path(graph, origin, destination, weight="length")
                    if nodes is None:
                        segment["reason"] = "no_walking_path"
                    else:
                        geometry, distance = path_geometry(graph, nodes)
                        segment.update(status="ready", distanceM=round(distance, 1),
                                       durationS=round(distance / (speed / 3.6)), geometry=geometry)
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                segment["reason"] = "no_walking_path"
        segments.append(segment)
    ready = [segment for segment in segments if segment["status"] == "ready"]
    complete = len(ready) == len(segments) and bool(segments)
    geometry = []
    if complete:
        for segment in segments:
            if geometry and geometry[-1] != segment["geometry"][0]:
                raise ValueError(f"{route['routeId']}: route geometry is discontinuous")
            geometry.extend(segment["geometry"][1:] if geometry else segment["geometry"])
    return {"status": "ready" if complete else "partial" if ready else "unavailable",
            "placeIds": ids, "inputCoordinates": coordinates,
            "totalDistanceM": round(sum(s["distanceM"] for s in segments), 1) if complete else None,
            "totalDurationS": sum(s["durationS"] for s in segments) if complete else None,
            "segments": segments, "geometry": geometry}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--walking-speed-kmh", type=float, default=4.5)
    parser.add_argument("--max-snap-m", type=float, default=100)
    parser.add_argument("--graph", type=Path, default=ROOT / ".cache/routing/walk.graphml")
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--overpass-url", default="https://overpass-api.de/api")
    args = parser.parse_args()
    if args.walking_speed_kmh <= 0 or args.max_snap_m <= 0:
        parser.error("Speed and snap threshold must be positive")
    routes = json.loads((ROOT / "data/routes.json").read_text(encoding="utf-8-sig"))
    with (ROOT / "data/places.csv").open(encoding="utf-8-sig", newline="") as stream:
        records = list(csv.DictReader(stream))
    places = {row["id"]: row for row in records}
    if len(places) != len(records):
        raise ValueError("Duplicate place IDs")
    for route in routes:
        for place_id in route["placeIds"]:
            if place_id not in places:
                raise ValueError(f"Unknown place: {place_id}")
    points = [point for route in routes for point in input_coordinates(route, places) if point]
    if not points:
        raise ValueError("No route coordinates")
    ox.settings.use_cache = True
    ox.settings.cache_folder = str(ROOT / ".cache/routing/http")
    ox.settings.requests_timeout = 120
    ox.settings.overpass_url = args.overpass_url
    args.graph.parent.mkdir(parents=True, exist_ok=True)
    if args.graph.exists() and not args.refresh:
        graph = ox.io.load_graphml(args.graph)
        graph_date = datetime.fromtimestamp(args.graph.stat().st_mtime, timezone.utc).isoformat()
    else:
        longitudes, latitudes = zip(*points)
        # Download a walking network beyond the stop envelope to allow detours.
        bbox = (min(longitudes) - 0.015, min(latitudes) - 0.012,
                max(longitudes) + 0.015, max(latitudes) + 0.012)
        print("Downloading OSM walking network...", flush=True)
        graph = ox.graph.graph_from_bbox(bbox, network_type="walk", retain_all=True, simplify=False)
        ox.io.save_graphml(graph, args.graph)
        graph_date = datetime.now(timezone.utc).isoformat()
    output = {"generatedAt": datetime.now(timezone.utc).isoformat(), "source": SOURCE,
              "license": "ODbL 1.0", "walkingSpeedKmh": args.walking_speed_kmh,
              "networkType": "walk", "graphRetrievedAt": graph_date,
              "maxSnapDistanceM": args.max_snap_m, "osmnxVersion": ox.__version__, "routes": {}}
    for route in routes:
        result = generate_route(graph, route, places, args.walking_speed_kmh, args.max_snap_m)
        output["routes"][route["routeId"]] = result
        print(f"{route['routeId']}: {result['status']} ({sum(s['status'] == 'ready' for s in result['segments'])}/{len(result['segments'])} legs)", flush=True)
    destination = ROOT / "data/route-paths.json"
    temporary = destination.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(output, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(destination)
    print(f"Saved {destination}", flush=True)
    subprocess.run(["node", "scripts/generate_route_connections.mjs", str(args.graph)], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
