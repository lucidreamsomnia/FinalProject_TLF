from collections.abc import Sequence

import numpy as np
import skfuzzy as fuzz


MEMBERSHIP_COUNT = 4
FEATURE_COUNT = 7


def predict_membership(
    normalized_features: np.ndarray,
    centers: np.ndarray,
) -> np.ndarray:
    features = np.asarray(normalized_features, dtype=float)
    if features.shape == (FEATURE_COUNT,):
        features = features.reshape(1, FEATURE_COUNT)
    if features.shape != (1, FEATURE_COUNT):
        raise ValueError(
            f"Expected normalized features with shape (1, 7), got {features.shape}."
        )
    centers = np.asarray(centers, dtype=float)
    if centers.shape != (MEMBERSHIP_COUNT, FEATURE_COUNT):
        raise ValueError(f"Expected FCM centers with shape (4, 7), got {centers.shape}.")
    if not np.isfinite(features).all() or not np.isfinite(centers).all():
        raise ValueError("FCM inputs must all be finite numbers.")

    membership, _, _, _, _, _ = fuzz.cluster.cmeans_predict(
        features.T,
        centers,
        m=2.0,
        error=0.005,
        maxiter=1000,
        seed=42,
    )
    result = np.asarray(membership[:, 0], dtype=float)
    if (
        result.shape != (MEMBERSHIP_COUNT,)
        or not np.isfinite(result).all()
        or (result < 0).any()
        or not np.isclose(result.sum(), 1.0, atol=1e-6, rtol=0.0)
    ):
        raise ValueError("FCM membership output failed finite, non-negative, or sum validation.")
    return result


def build_knn_input(
    normalized_features: np.ndarray,
    membership: Sequence[float],
) -> np.ndarray:
    features = np.asarray(normalized_features, dtype=float)
    if features.shape == (FEATURE_COUNT,):
        features = features.reshape(1, FEATURE_COUNT)
    memberships = np.asarray(membership, dtype=float)
    if memberships.shape == (1, MEMBERSHIP_COUNT):
        memberships = memberships[0]
    if features.shape != (1, FEATURE_COUNT) or memberships.shape != (MEMBERSHIP_COUNT,):
        raise ValueError("KNN input requires seven features and four memberships.")
    if not np.isfinite(features).all() or not np.isfinite(memberships).all():
        raise ValueError("KNN input values must all be finite numbers.")
    if (memberships < 0).any() or not np.isclose(
        memberships.sum(), 1.0, atol=1e-6, rtol=0.0
    ):
        raise ValueError("KNN membership values must be non-negative and sum to 1.")
    return np.hstack((features, memberships.reshape(1, MEMBERSHIP_COUNT)))
