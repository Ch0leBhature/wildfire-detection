"""
Detailed model evaluation for the Wildfire Risk Detection model.

Generates:
  - ROC curve
  - Precision-Recall curve
  - Confusion matrix heatmap
  - Feature importance bar chart
  - Performance by land cover type

Usage:
    python -m ml.training.evaluate
"""
import pandas as pd
import numpy as np
import joblib
import os
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    roc_curve, precision_recall_curve, confusion_matrix,
    roc_auc_score, classification_report, f1_score
)
from ml.data_pipeline.config import DATA_DIR, MODEL_DIR, FEATURE_NAMES, LAND_COVER_CLASSES


def evaluate():
    model_path = os.path.join(MODEL_DIR, 'model.pkl')
    data_path = os.path.join(DATA_DIR, 'processed', 'training_dataset.parquet')

    if not os.path.exists(model_path) or not os.path.exists(data_path):
        print("ERROR: Model or data not found. Run training first.")
        return

    print("Loading model and data...")
    model = joblib.load(model_path)
    df = pd.read_parquet(data_path)

    # Time-aware split: use last 20% for evaluation
    if 'month' in df.columns:
        max_month = df['month'].max()
        split_month = int(max_month * 0.8)
        val_mask = df['month'] > split_month
        df_eval = df[val_mask]
    else:
        df_eval = df.sample(frac=0.2, random_state=42)

    X = df_eval[FEATURE_NAMES]
    y = df_eval['fire']

    y_pred = model.predict(X)
    y_prob = model.predict_proba(X)[:, 1]

    print(f"\nEvaluation on {len(X):,} samples ({y.sum():,} fires, {y.mean():.1%} rate)")
    print("\nClassification Report:")
    print(classification_report(y, y_pred, target_names=['No Fire', 'Fire'], zero_division=0))

    roc_auc = roc_auc_score(y, y_prob)
    print(f"ROC-AUC: {roc_auc:.4f}")

    # --- 1. ROC Curve ---
    fpr, tpr, _ = roc_curve(y, y_prob)
    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, 'b-', linewidth=2, label=f'XGBoost (AUC = {roc_auc:.3f})')
    plt.plot([0, 1], [0, 1], 'k--', alpha=0.5, label='Random')
    plt.xlabel('False Positive Rate', fontsize=12)
    plt.ylabel('True Positive Rate', fontsize=12)
    plt.title('ROC Curve — Wildfire Risk Model', fontsize=14)
    plt.legend(fontsize=11)
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(MODEL_DIR, 'roc_curve.png'), dpi=150)
    print("Saved: roc_curve.png")

    # --- 2. Precision-Recall Curve ---
    precision, recall, _ = precision_recall_curve(y, y_prob)
    plt.figure(figsize=(8, 6))
    plt.plot(recall, precision, 'r-', linewidth=2)
    plt.xlabel('Recall', fontsize=12)
    plt.ylabel('Precision', fontsize=12)
    plt.title('Precision-Recall Curve', fontsize=14)
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(MODEL_DIR, 'pr_curve.png'), dpi=150)
    print("Saved: pr_curve.png")

    # --- 3. Confusion Matrix ---
    cm = confusion_matrix(y, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['No Fire', 'Fire'],
                yticklabels=['No Fire', 'Fire'])
    plt.xlabel('Predicted', fontsize=12)
    plt.ylabel('Actual', fontsize=12)
    plt.title('Confusion Matrix', fontsize=14)
    plt.tight_layout()
    plt.savefig(os.path.join(MODEL_DIR, 'confusion_matrix.png'), dpi=150)
    print("Saved: confusion_matrix.png")

    # --- 4. Feature Importance ---
    importance = model.feature_importances_
    sorted_idx = np.argsort(importance)
    plt.figure(figsize=(8, 6))
    plt.barh(range(len(FEATURE_NAMES)), importance[sorted_idx], color='steelblue')
    plt.yticks(range(len(FEATURE_NAMES)), [FEATURE_NAMES[i] for i in sorted_idx])
    plt.xlabel('Importance', fontsize=12)
    plt.title('Feature Importance (XGBoost)', fontsize=14)
    plt.tight_layout()
    plt.savefig(os.path.join(MODEL_DIR, 'feature_importance.png'), dpi=150)
    print("Saved: feature_importance.png")

    # --- 5. Performance by Land Cover ---
    if 'land_cover' in df_eval.columns:
        print("\nPerformance by Land Cover:")
        print(f"{'Land Cover':<15} {'Samples':>8} {'Fires':>6} {'Rate':>8} {'AUC':>8}")
        print("-" * 50)
        for lc_code, lc_name in sorted(LAND_COVER_CLASSES.items()):
            mask = df_eval['land_cover'] == lc_code
            if mask.sum() < 10:
                continue
            y_lc = y[mask]
            prob_lc = y_prob[mask]
            fire_count = y_lc.sum()
            fire_rate = y_lc.mean()
            try:
                auc = roc_auc_score(y_lc, prob_lc) if fire_count > 0 and fire_count < len(y_lc) else float('nan')
            except ValueError:
                auc = float('nan')
            print(f"{lc_name:<15} {mask.sum():>8} {fire_count:>6} {fire_rate:>7.1%} {auc:>8.3f}")

    print("\n✅ Evaluation complete! Plots saved to ml/models/")


if __name__ == '__main__':
    evaluate()
