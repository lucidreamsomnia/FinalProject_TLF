import unittest

from backend.app.services.preprocessing import (
    CPU_FAMILY_SCORES,
    identify_cpu_family,
)


class CpuFamilyMappingTests(unittest.TestCase):
    def test_amd_ryzen_mapping(self):
        cases = [
            ("AMD Ryzen 9 5900X", "AMD Ryzen 9"),
            ("AMD Ryzen 7 5800H", "AMD Ryzen 7"),
            ("AMD Ryzen 5 5600U", "AMD Ryzen 5"),
            ("AMD Ryzen 3 5300U", "AMD Ryzen 3"),
            ("AMD Ryzen 1700 3GHz", "AMD Ryzen 1700"),
            ("AMD Ryzen 1600 3.2GHz", "AMD Ryzen 1600"),
        ]

        for cpu, original_family in cases:
            with self.subTest(cpu=cpu):
                family = identify_cpu_family(cpu)
                self.assertEqual(family, "AMD Other")
                self.assertNotEqual(family, original_family)
                self.assertEqual(CPU_FAMILY_SCORES[family], 3)

    def test_intel_mapping_is_preserved(self):
        cases = {
            "Intel Core i3 1005G1": ("Intel Core i3", 3),
            "Intel Core i5 7200U": ("Intel Core i5", 5),
            "Intel Core i7 8550U": ("Intel Core i7", 7),
            "Intel Core i9 14900H": ("Intel Core i9", 9),
            "Intel Core M m3": ("Intel Core M", 2),
            "Intel Celeron N4020": ("Intel Celeron", 1),
            "Intel Pentium Gold": ("Intel Pentium", 2),
            "Intel Atom x5": ("Intel Atom", 1),
        }

        for cpu, (expected_family, expected_score) in cases.items():
            with self.subTest(cpu=cpu):
                family = identify_cpu_family(cpu)
                self.assertEqual(family, expected_family)
                self.assertEqual(CPU_FAMILY_SCORES[family], expected_score)

    def test_every_mapped_family_has_available_score(self):
        cpu_cases = [
            "Intel Core i3 1005G1",
            "Intel Core i5 7200U",
            "Intel Core i7 8550U",
            "Intel Core i9 14900H",
            "Intel Core M m3",
            "Intel Celeron N4020",
            "Intel Pentium Gold",
            "Intel Atom x5",
            "AMD Ryzen 9 5900X",
            "AMD Ryzen 7 5800H",
            "AMD Ryzen 5 5600U",
            "AMD Ryzen 3 5300U",
            "AMD Ryzen 1700 3GHz",
            "AMD Ryzen 1600 3.2GHz",
            "AMD A9-Series 9420 3GHz",
            "Unknown Processor",
        ]

        for cpu in cpu_cases:
            with self.subTest(cpu=cpu):
                family = identify_cpu_family(cpu)
                self.assertIn(family, CPU_FAMILY_SCORES)


if __name__ == "__main__":
    unittest.main()
