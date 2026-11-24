import unittest
from dataclasses import replace
from unittest.mock import Mock

import numpy as np

from backend.app.services.recommendation_service import (
    LaptopPreferences,
    recommend_laptops,
)
from backend.app.services.model_loader import get_model_bundle


class RecommendationServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle = get_model_bundle()
        cls.preferences = LaptopPreferences(
            max_budget_eur=1200,
            ram_gb=16,
            weight_kg=2,
            ssd_gb=512,
            hdd_gb=0,
            cpu_family="Intel Core i5",
            cpu_base_ghz=2.5,
        )

    def test_normal_recommendation_and_alignment(self):
        results = recommend_laptops(self.preferences, self.bundle)
        self.assertEqual(len(results), 5)
        self.assertEqual([result.rank for result in results], [1, 2, 3, 4, 5])
        self.assertTrue(all(0 <= result.row_index < 1303 for result in results))
        self.assertTrue(
            all(
                result.distance <= next_result.distance
                for result, next_result in zip(results, results[1:])
            )
        )
        for result in results:
            row = self.bundle.original_dataset.iloc[result.row_index]
            self.assertEqual(result.product, row["Product"])
            self.assertEqual(result.memory, row["Memory"])
            self.assertEqual(result.price_eur, row["Price_euros"])
            self.assertEqual(len(result.memberships), 4)
            self.assertAlmostEqual(sum(result.memberships), 1.0, places=6)

    def test_budget_is_status_only(self):
        results = recommend_laptops(
            replace(self.preferences, max_budget_eur=1),
            self.bundle,
        )
        self.assertTrue(any(not result.within_budget for result in results))
        self.assertTrue(
            all(
                result.within_budget == (result.price_eur <= 1)
                for result in results
            )
        )

    def test_repeatability(self):
        first = recommend_laptops(self.preferences, self.bundle)
        second = recommend_laptops(self.preferences, self.bundle)
        self.assertEqual(
            [result.row_index for result in first],
            [result.row_index for result in second],
        )
        np.testing.assert_array_equal(
            [result.distance for result in first],
            [result.distance for result in second],
        )

    def test_normal_knn_indices(self):
        mock_model = Mock()
        mock_model.kneighbors.return_value = (
            np.array([[0.1, 0.2, 0.3, 0.4, 0.5]], dtype=float),
            np.array([[0, 1, 2, 3, 4]], dtype=int),
        )
        bundle = replace(self.bundle, knn_model=mock_model)

        results = recommend_laptops(self.preferences, bundle)

        self.assertEqual([result.row_index for result in results], [0, 1, 2, 3, 4])
        for result in results:
            row = bundle.original_dataset.iloc[result.row_index]
            fcm_row = bundle.fcm_results.iloc[result.row_index]
            self.assertEqual(result.product, row["Product"])
            self.assertEqual(result.fcm_cluster, int(fcm_row["Cluster"]))

    def test_negative_knn_index(self):
        mock_model = Mock()
        mock_model.kneighbors.return_value = (
            np.array([[0.1, 0.2, 0.3, 0.4, 0.5]], dtype=float),
            np.array([[0, 1, -1, 3, 4]], dtype=int),
        )
        bundle = replace(self.bundle, knn_model=mock_model)

        with self.assertRaisesRegex(RuntimeError, "negative index"):
            recommend_laptops(self.preferences, bundle)

    def test_knn_index_outside_dataset_bounds(self):
        mock_model = Mock()
        mock_model.kneighbors.return_value = (
            np.array([[0.1, 0.2, 0.3, 0.4, 0.5]], dtype=float),
            np.array([[0, 1, 1303, 3, 4]], dtype=int),
        )
        bundle = replace(self.bundle, knn_model=mock_model)

        with self.assertRaisesRegex(RuntimeError, "outside dataset bounds"):
            recommend_laptops(self.preferences, bundle)

    def test_non_integer_knn_index(self):
        mock_model = Mock()
        mock_model.kneighbors.return_value = (
            np.array([[0.1, 0.2, 0.3, 0.4, 0.5]], dtype=float),
            np.array([[0.0, 1.0, 2.0, 3.0, 4.0]], dtype=float),
        )
        bundle = replace(self.bundle, knn_model=mock_model)

        with self.assertRaisesRegex(RuntimeError, "non-integer index"):
            recommend_laptops(self.preferences, bundle)

    def test_mismatched_knn_index_and_distance_counts(self):
        mock_model = Mock()
        mock_model.kneighbors.return_value = (
            np.array([[0.1, 0.2, 0.3, 0.4, 0.5]], dtype=float),
            np.array([[0, 1, 2, 3]], dtype=int),
        )
        bundle = replace(self.bundle, knn_model=mock_model)

        with self.assertRaisesRegex(RuntimeError, "index count"):
            recommend_laptops(self.preferences, bundle)

    def test_invalid_inputs(self):
        invalid_cases = [
            replace(self.preferences, max_budget_eur=-1),
            replace(self.preferences, ram_gb=-1),
            replace(self.preferences, weight_kg=float("nan")),
            replace(self.preferences, cpu_base_ghz=float("inf")),
        ]
        for invalid in invalid_cases:
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):
                    recommend_laptops(invalid, self.bundle)
        with self.assertRaises(ValueError):
            recommend_laptops(self.preferences, self.bundle, top_n=0)
        with self.assertRaises(ValueError):
            recommend_laptops(self.preferences, self.bundle, top_n=1304)


if __name__ == "__main__":
    unittest.main()
