"""FastAPI inference server for the Wildfire Risk Detection model.

Usage:
    uvicorn ml.inference.server:app --host 0.0.0.0 --port 8001 --reload
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import Optional
from ml.inference.predictor import WildfirePredictor

# Resolve model directory relative to project root
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_MODEL_DIR = os.path.join(_PROJECT_ROOT, 'ml', 'models')

app = FastAPI(
    title="Wildfire Risk ML Service",
    version="1.0.0",
    description="XGBoost-based wildfire risk prediction API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor = WildfirePredictor(_MODEL_DIR)


class PredictRequest(BaseModel):
    features: list[list[float]]
    feature_names: Optional[list[str]] = None

    @field_validator('features')
    @classmethod
    def validate_features(cls, v):
        if not v:
            raise ValueError('features must not be empty')
        return v


class PredictionResult(BaseModel):
    probability: float
    category: str


class PredictResponse(BaseModel):
    predictions: list[PredictionResult]
    model_version: str
    feature_importance: dict[str, float] = {}


@app.on_event("startup")
def startup_event():
    """Load model into memory at startup."""
    try:
        predictor.load_model()
        print(f"ML Service ready on model v{predictor.metadata['model_version']}")
    except Exception as e:
        print(f"WARNING: Failed to load model: {e}")
        print("The /predict endpoint will return errors until a model is available.")


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """Run batch prediction on feature vectors.
    
    Accepts a list of feature vectors (each with 12 features in order:
    temperature_current, humidity_current, wind_speed_current, rainfall_1d,
    rainfall_3d, rainfall_7d, rainfall_30d, ndvi, ndmi, elevation, slope, land_cover).
    """
    if predictor.model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if req.feature_names and not predictor.validate_features(req.feature_names):
        raise HTTPException(
            status_code=400,
            detail=f"Feature names mismatch. Expected: {predictor.metadata['feature_names']}"
        )

    expected_count = predictor.metadata['feature_count']
    for i, vec in enumerate(req.features):
        if len(vec) != expected_count:
            raise HTTPException(
                status_code=400,
                detail=f"Feature vector {i} has {len(vec)} features, expected {expected_count}"
            )

    try:
        predictions = predictor.predict_with_category(req.features)
        return PredictResponse(
            predictions=predictions,
            model_version=predictor.metadata['model_version'],
            feature_importance=predictor.get_feature_importance()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "status": "ok" if predictor.model is not None else "no_model",
        "model_version": predictor.metadata.get('model_version', 'unknown') if predictor.metadata else 'not_loaded',
        "feature_names": predictor.metadata.get('feature_names', []) if predictor.metadata else []
    }


@app.get("/model-info")
def model_info():
    """Return full model metadata and feature importance."""
    if predictor.metadata is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return predictor.get_model_info()
