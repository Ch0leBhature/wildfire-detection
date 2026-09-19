"""
Train Wildfire Risk Detection Models.

Trains XGBoost (primary), Logistic Regression, and Random Forest baselines.
Uses time-aware split: first 80% of months for training, last 20% for validation.
Saves the best model (XGBoost) and metadata.

Usage:
    python -m ml.training.train
"""
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    classification_report, roc_auc_score, f1_score,
    precision_score, recall_score, confusion_matrix
)
import joblib
import json
import os
import datetime
from ml.data_pipeline.config import DATA_DIR, MODEL_DIR, FEATURE_NAMES, RISK_THRESHOLDS


def train():
    # Load data
    data_path = os.path.join(DATA_DIR, 'processed', 'training_dataset.parquet')
    if not os.path.exists(data_path):
        print(f"ERROR: Training data not found at {data_path}")
        print("Run: python -m ml.data_pipeline.build_training_set --mode=synthetic")
        return

    df = pd.read_parquet(data_path)
    print(f"Loaded {len(df):,} samples from {data_path}")
    print(f"Fire rate: {df['fire'].mean():.1%} ({df['fire'].sum():,} fires)")

    X = df[FEATURE_NAMES].copy()
    y = df['fire'].copy()

    # Time-aware split: use 'month' column if available, else random
    if 'month' in df.columns:
        max_month = df['month'].max()
        split_month = int(max_month * 0.8)
        train_mask = df['month'] <= split_month
        val_mask = df['month'] > split_month
        X_train, X_val = X[train_mask], X[val_mask]
        y_train, y_val = y[train_mask], y[val_mask]
        print(f"Time-aware split: train months 0-{split_month}, val months {split_month + 1}-{max_month}")
    else:
        from sklearn.model_selection import train_test_split
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
        print("Random 80/20 split")

    print(f"Train: {len(X_train):,} samples ({y_train.mean():.1%} fire rate)")
    print(f"Val:   {len(X_val):,} samples ({y_val.mean():.1%} fire rate)")

    # --- 1. XGBoost (primary model) ---
    print("\n" + "=" * 60)
    print("Training XGBoost...")
    scale_pos_weight = max((y_train == 0).sum() / max((y_train == 1).sum(), 1), 1.0)
    xgb_model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=scale_pos_weight,
        min_child_weight=3,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        eval_metric='logloss'
    )
    xgb_model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

    xgb_pred = xgb_model.predict(X_val)
    xgb_prob = xgb_model.predict_proba(X_val)[:, 1]
    xgb_metrics = evaluate_model("XGBoost", y_val, xgb_pred, xgb_prob)

    # --- 2. Logistic Regression (baseline) ---
    print("\n" + "=" * 60)
    print("Training Logistic Regression...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    lr_model = LogisticRegression(
        max_iter=1000,
        class_weight='balanced',
        random_state=42,
        solver='lbfgs'
    )
    lr_model.fit(X_train_scaled, y_train)
    lr_pred = lr_model.predict(X_val_scaled)
    lr_prob = lr_model.predict_proba(X_val_scaled)[:, 1]
    lr_metrics = evaluate_model("Logistic Regression", y_val, lr_pred, lr_prob)

    # --- 3. Random Forest (baseline) ---
    print("\n" + "=" * 60)
    print("Training Random Forest...")
    rf_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        class_weight='balanced',
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    rf_pred = rf_model.predict(X_val)
    rf_prob = rf_model.predict_proba(X_val)[:, 1]
    rf_metrics = evaluate_model("Random Forest", y_val, rf_pred, rf_prob)

    # --- Model comparison ---
    print("\n" + "=" * 60)
    print("MODEL COMPARISON")
    print("=" * 60)
    print(f"{'Model':<25} {'ROC-AUC':>10} {'F1':>10} {'Precision':>10} {'Recall':>10}")
    print("-" * 65)
    for name, metrics in [("XGBoost", xgb_metrics), ("Logistic Regression", lr_metrics), ("Random Forest", rf_metrics)]:
        print(f"{name:<25} {metrics['roc_auc']:>10.4f} {metrics['f1']:>10.4f} {metrics['precision']:>10.4f} {metrics['recall']:>10.4f}")
    print("-" * 65)

    # --- Save best model (XGBoost) ---
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, 'model.pkl')
    joblib.dump(xgb_model, model_path)
    print(f"\nXGBoost model saved to {model_path}")

    # Feature importance
    importance = dict(zip(FEATURE_NAMES, [round(float(v), 4) for v in xgb_model.feature_importances_]))
    sorted_imp = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    print("\nFeature Importance:")
    for feat, imp in sorted_imp:
        bar = "█" * int(imp * 100)
        print(f"  {feat:<25} {imp:.4f}  {bar}")

    # Save metadata
    metadata = {
        "model_version": "1.0.0",
        "model_type": "xgboost",
        "feature_names": FEATURE_NAMES,
        "feature_count": len(FEATURE_NAMES),
        "risk_thresholds": RISK_THRESHOLDS,
        "training_period": {"start": "2019-01", "end": "2023-12"},
        "evaluation_metrics": xgb_metrics,
        "baseline_metrics": {
            "logistic_regression": lr_metrics,
            "random_forest": rf_metrics
        },
        "class_distribution": {
            "positive": int(y.sum()),
            "negative": int(len(y) - y.sum())
        },
        "training_samples": int(len(X_train)),
        "validation_samples": int(len(X_val)),
        "feature_importance": importance,
        "created_at": datetime.datetime.now().isoformat()
    }

    meta_path = os.path.join(MODEL_DIR, 'model_metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to {meta_path}")

    print("\n✅ Training complete!")


def evaluate_model(name: str, y_true, y_pred, y_prob) -> dict:
    """Evaluate a model and print results. Returns metrics dict."""
    roc_auc = float(roc_auc_score(y_true, y_prob))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    precision = float(precision_score(y_true, y_pred, zero_division=0))
    recall = float(recall_score(y_true, y_pred, zero_division=0))

    print(f"\n{name} Validation Results:")
    print(f"  ROC-AUC:   {roc_auc:.4f}")
    print(f"  F1-score:  {f1:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=['No Fire', 'Fire'], zero_division=0))
    print(f"Confusion Matrix:")
    cm = confusion_matrix(y_true, y_pred)
    print(f"  TN={cm[0][0]:>6}  FP={cm[0][1]:>6}")
    print(f"  FN={cm[1][0]:>6}  TP={cm[1][1]:>6}")

    return {
        "roc_auc": round(roc_auc, 6),
        "f1": round(f1, 6),
        "precision": round(precision, 6),
        "recall": round(recall, 6)
    }


if __name__ == '__main__':
    train()
