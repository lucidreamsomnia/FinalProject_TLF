import unittest
from dataclasses import replace

import numpy as np

from backend.app.services.model_loader import get_model_bundle
from backend.app.services.recommendation_service import (
    LaptopPreferences,
    recommend_laptops,
)


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

    def test_invalid_inputs(self):
        invalid_cases = [
            replace(self.preferences, max_budget_eur=-1),
            replace(self.preferences, ram_gb=-1),
            replace(self.preferences, weight_kg=float("nan")),
            replace(self.preferences, cpu_base_ghz=float("inf")),
            replace(self.preferences, cpu_family="AMD Ryzen 7"),
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
