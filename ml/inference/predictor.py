import joblib
import json
import os
import numpy as np


class WildfirePredictor:
    """Loads a trained wildfire risk model and provides prediction methods."""

    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.model = None
        self.metadata = None

    def load_model(self) -> None:
        """Load model and metadata from disk."""
        model_path = os.path.join(self.model_dir, 'model.pkl')
        meta_path = os.path.join(self.model_dir, 'model_metadata.json')

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        if not os.path.exists(meta_path):
            raise FileNotFoundError(f"Metadata file not found: {meta_path}")

        self.model = joblib.load(model_path)
        with open(meta_path, 'r') as f:
            self.metadata = json.load(f)

        print(f"Model loaded: v{self.metadata['model_version']} "
              f"({self.metadata['model_type']}, "
              f"{self.metadata['feature_count']} features)")

    def validate_features(self, feature_names: list[str]) -> bool:
        """Check that the provided feature names match the model's expected features."""
        return feature_names == self.metadata['feature_names']

    def predict(self, features: list[list[float]]) -> list[float]:
        """Return fire probabilities for each feature vector."""
        arr = np.array(features, dtype=np.float64)
        probas = self.model.predict_proba(arr)[:, 1]
        return probas.tolist()

    def predict_with_category(self, features: list[list[float]]) -> list[dict]:
        """Return probability and risk category for each feature vector."""
        probas = self.predict(features)
        thresholds = self.metadata['risk_thresholds']
        results = []
        for p in probas:
            if p >= thresholds['high']:
                cat = 'Very High'
            elif p >= thresholds['moderate']:
                cat = 'High'
            elif p >= thresholds['low']:
                cat = 'Moderate'
            else:
                cat = 'Low'
            results.append({'probability': round(p, 6), 'category': cat})
        return results

    def get_feature_importance(self) -> dict[str, float]:
        """Return feature importances from the model."""
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            names = self.metadata['feature_names']
            return dict(zip(names, [round(float(v), 4) for v in importances]))
        return {}

    def get_model_info(self) -> dict:
        """Return full model metadata including feature importance."""
        info = dict(self.metadata)
        info['feature_importance'] = self.get_feature_importance()
        return info
