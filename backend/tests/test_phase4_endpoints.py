import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.model_loader import MEMBERSHIP_COLUMNS, get_model_bundle


class Phase4EndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.preferences = {
            "budget_idr": 30_000_000,
            "ram_gb": 16,
            "ssd_gb": 512,
            "hdd_gb": 0,
            "weight_kg": 2,
            "cpu_family": "Intel Core i7",
            "cpu_base_ghz": 2.4,
        }

    def test_dashboard_catalog_and_system_info(self):
        dashboard = self.client.get("/api/dashboard")
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.json()["summary"]["total_laptops"], 1303)

        catalog = self.client.get("/api/catalog?page=1&page_size=8")
        self.assertEqual(catalog.status_code, 200)
        self.assertEqual(len(catalog.json()["items"]), 8)
        self.assertEqual(catalog.json()["total_records"], 1303)

        system_info = self.client.get("/api/system-info")
        self.assertEqual(system_info.status_code, 200)
        self.assertEqual(system_info.json()["dataset"]["row_count"], 1303)

    def test_input_validation_upload_and_recommendations(self):
        validated = self.client.post("/api/input/validate", json=self.preferences)
        self.assertEqual(validated.status_code, 200)
        self.assertEqual(validated.json()["budget_eur"], 1500)

        recommendations = self.client.post(
            "/api/recommendations",
            json={**self.preferences, "top_n": 5},
        )
        self.assertEqual(recommendations.status_code, 200)
        body = recommendations.json()
        self.assertEqual(len(body["recommendations"]), 5)
        self.assertTrue(
            all(
                item["cpu_base_ghz"] > 0
                for item in body["recommendations"]
            )
        )

        upload = self.client.post(
            "/api/input/upload",
            files={
                "file": (
                    "features.csv",
                    (
                        b"Price_euros,Ram_GB,Weight_kg,SSD_GB,HDD_GB,"
                        b"CPU_Family_Score,CPU_Base_GHz\n"
                        b"1000,16,2,512,0,5,2.4\n"
                    ),
                )
            },
        )
        self.assertEqual(upload.status_code, 200)
        self.assertTrue(upload.json()["valid"])
        recommendation = recommendations.json()["recommendations"][0]
        self.assertEqual(
            recommendation["memberships"],
            recommendation["query_memberships"],
        )
        self.assertEqual(len(recommendation["laptop_memberships"]), 4)
        bundle = get_model_bundle()
        stored_memberships = [
            float(
                bundle.fcm_results.iloc[
                    recommendation["row_index"]
                ][column]
            )
            for column in MEMBERSHIP_COLUMNS
        ]
        self.assertEqual(
            recommendation["laptop_memberships"],
            stored_memberships,
        )

    def test_processing_and_evaluation(self):
        processing = self.client.get("/api/processing")
        self.assertEqual(processing.status_code, 200)
        self.assertEqual(processing.json()["knn_parameters"]["input_dimensions"], 11)

        run = self.client.post("/api/processing/run")
        self.assertEqual(run.status_code, 200)
        self.assertEqual(run.json()["status"], "completed")
        self.assertEqual(run.json()["run"]["recommendation_count"], 5)

        evaluation = self.client.get("/api/evaluation")
        self.assertEqual(evaluation.status_code, 200)
        self.assertAlmostEqual(evaluation.json()["main"]["fpc"], 0.6352, places=3)
        self.assertFalse(evaluation.json()["pca"]["available"])

    def test_invalid_inputs_are_rejected(self):
        invalid = {**self.preferences, "budget_idr": -1}
        self.assertEqual(
            self.client.post("/api/input/validate", json=invalid).status_code,
            422,
        )
        supported_amd = {**self.preferences, "cpu_family": "AMD Ryzen 7"}
        self.assertEqual(
            self.client.post("/api/recommendations", json=supported_amd).status_code,
            200,
        )
        self.assertEqual(
            self.client.get("/api/catalog?sort=unknown").status_code,
            422,
        )

    def test_budget_idr_boolean_positive_zero_and_negative(self):
        for boolean_budget in (True, False):
            response = self.client.post(
                "/api/input/validate",
                json={**self.preferences, "budget_idr": boolean_budget},
            )
            with self.subTest(budget_idr=boolean_budget):
                self.assertEqual(response.status_code, 422)
                self.assertIn("detail", response.json())

        positive = self.client.post(
            "/api/input/validate",
            json={**self.preferences, "budget_idr": 30_000_000},
        )
        self.assertEqual(positive.status_code, 200)
        self.assertEqual(positive.json()["budget_eur"], 1500)

        zero = self.client.post(
            "/api/input/validate",
            json={**self.preferences, "budget_idr": 0},
        )
        self.assertEqual(zero.status_code, 200)
        self.assertEqual(zero.json()["budget_eur"], 0)

        negative = self.client.post(
            "/api/input/validate",
            json={**self.preferences, "budget_idr": -1},
        )
        self.assertEqual(negative.status_code, 422)
        self.assertIn("detail", negative.json())

    def test_upload_rejects_invalid_numeric_values(self):
        header = (
            b"Price_euros,Ram_GB,Weight_kg,SSD_GB,HDD_GB,"
            b"CPU_Family_Score,CPU_Base_GHz\n"
        )
        cases = [
            b"-1,16,2,512,0,5,2.4\n",
            b"1000,nan,2,512,0,5,2.4\n",
            b"1000,16,2,inf,0,5,2.4\n",
        ]
        for row in cases:
            with self.subTest(row=row):
                response = self.client.post(
                    "/api/input/upload",
                    files={"file": ("invalid.csv", header + row)},
                )
                self.assertEqual(response.status_code, 200)
                self.assertFalse(response.json()["valid"])
                self.assertTrue(response.json()["errors"])

        missing_column = self.client.post(
            "/api/input/upload",
            files={
                "file": (
                    "missing.csv",
                    b"Price_euros,Ram_GB\n1000,16\n",
                )
            },
        )
        self.assertEqual(missing_column.status_code, 200)
        self.assertFalse(missing_column.json()["valid"])
        self.assertTrue(
            any("Missing required column" in error for error in missing_column.json()["errors"])
        )

    def test_evaluation_does_not_run_fcm_training(self):
        with patch(
            "skfuzzy.cluster.cmeans",
            side_effect=AssertionError("FCM training must not run"),
        ):
            response = self.client.get("/api/evaluation")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["sensitivity_status"]["available"])


if __name__ == "__main__":
    unittest.main()
