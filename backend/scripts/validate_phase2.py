import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.services.fcm_service import build_knn_input, predict_membership
from backend.app.services.model_loader import load_model_bundle, MEMBERSHIP_COLUMNS
from backend.app.services.preprocessing import preprocess_raw_laptop


def main() -> None:
    bundle = load_model_bundle()
    max_difference = 0.0
    membership_difference = 0.0
    for row_index in [0, 651, 1302]:
        raw = bundle.original_dataset.iloc[row_index]
        scaled = preprocess_raw_laptop(
            {
                "Price_euros": raw["Price_euros"],
                "Ram": raw["Ram"],
                "Weight": raw["Weight"],
                "Memory": raw["Memory"],
                "Cpu": raw["Cpu"],
            },
            bundle.scaler,
        )
        expected = bundle.scaled_features.iloc[row_index].to_numpy(dtype=float)
        max_difference = max(max_difference, float(np.max(np.abs(scaled[0] - expected))))
        membership = predict_membership(scaled, bundle.fcm_centers)
        expected_membership = bundle.fcm_results.iloc[row_index][MEMBERSHIP_COLUMNS].to_numpy(dtype=float)
        membership_difference = max(
            membership_difference,
            float(np.max(np.abs(membership - expected_membership))),
        )
        knn_input = build_knn_input(scaled, membership)
        if knn_input.shape != (1, 11) or not np.isfinite(knn_input).all():
            raise RuntimeError("KNN input validation failed.")
    if max_difference > 1e-10:
        raise RuntimeError(f"Preprocessing difference exceeded 1e-10: {max_difference}")
    print(f"Loaded artifacts: 1303 rows, scaler=7 features, KNN=11 features")
    print(f"Maximum preprocessing difference: {max_difference:.17g}")
    print(f"Maximum FCM membership difference: {membership_difference:.17g}")
    print("11-dimensional KNN input validation: passed")


if __name__ == "__main__":
    main()
