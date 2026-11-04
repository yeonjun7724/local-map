import unittest
import networkx as nx
from shapely.geometry import LineString
from generate_route_paths import generate_route, input_coordinates, walking_pairs
import json


class WalkingPathsTest(unittest.TestCase):
    def setUp(self):
        self.graph = nx.MultiDiGraph(crs="EPSG:4326")
        for node, x, y in [(1, 126.0, 37.0), (2, 126.001, 37.0), (3, 126.001, 37.001)]:
            self.graph.add_node(node, x=x, y=y)
        self.graph.add_edge(1, 2, length=100, geometry=LineString([(126.001, 37), (126, 37)]))
        self.graph.add_edge(2, 3, length=200)
        self.graph.add_edge(3, 2, length=200)
        self.graph.add_edge(2, 1, length=100)
        self.places = {"a": {"longitude": "126", "latitude": "37"},
                       "b": {"longitude": "126.001", "latitude": "37.001"}}

    def generate(self, ids):
        return generate_route(self.graph, {"routeId": "test", "placeIds": ids}, self.places, 4.5, 100)

    def test_network_length_and_geometry_not_straight_line(self):
        result = self.generate(["a", "b"])
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["totalDistanceM"], 300)
        self.assertEqual(result["totalDurationS"], 240)
        self.assertEqual(result["geometry"], [[126, 37], [126.001, 37], [126.001, 37.001]])

    def test_return_leg_keeps_visit_order(self):
        result = self.generate(["a", "b", "a"])
        self.assertEqual(result["totalDistanceM"], 600)
        self.assertEqual(len(result["segments"]), 2)

    def test_pair_generation_covers_both_directions_and_excludes_missing_coordinates(self):
        self.places["missing"] = {"longitude": "", "latitude": ""}
        pairs = walking_pairs(self.graph, self.places, 4.5, 100)
        self.assertEqual(len(pairs), 2)
        for ids in [["a", "b"], ["b", "a"]]:
            key = json.dumps(ids, separators=(",", ":"))
            self.assertEqual(pairs[key]["placeIds"], ids)
            self.assertEqual(pairs[key]["status"], "ready")

    def test_pair_generation_respects_directed_edges(self):
        self.graph.remove_edge(3, 2)
        pairs = walking_pairs(self.graph, self.places, 4.5, 100)
        self.assertEqual(pairs['["a","b"]']["status"], "ready")
        self.assertEqual(pairs['["b","a"]']["segments"][0]["reason"], "no_walking_path")

    def test_coincident_places_are_unavailable_not_zero_meters(self):
        self.places["b"] = self.places["a"].copy()
        result = self.generate(["a", "b"])
        self.assertEqual(result["status"], "unavailable")
        self.assertIsNone(result["totalDistanceM"])
        self.assertEqual(result["segments"][0]["reason"], "coincident_coordinates")

    def test_disconnected_graph_has_no_fallback_line(self):
        self.graph.remove_edge(2, 3)
        result = self.generate(["a", "b"])
        self.assertEqual(result["segments"][0]["reason"], "no_walking_path")
        self.assertEqual(result["geometry"], [])

    def test_far_snap_is_rejected(self):
        self.places["b"] = {"longitude": "127", "latitude": "38"}
        self.assertEqual(self.generate(["a", "b"])["segments"][0]["reason"], "snap_too_far")

    def test_invalid_or_half_filled_coordinates_fail_before_network_request(self):
        for longitude, latitude in [("126", ""), ("nan", "37"), ("37", "126")]:
            with self.subTest(longitude=longitude, latitude=latitude):
                with self.assertRaises(ValueError):
                    input_coordinates({"placeIds": ["a"]}, {"a": {"longitude": longitude, "latitude": latitude}})


if __name__ == "__main__":
    unittest.main()
