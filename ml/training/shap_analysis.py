"""
SHAP (SHapley Additive exPlanations) analysis for the Wildfire Risk model.

Generates:
  - Beeswarm summary plot (global feature importance with directionality)
  - Feature importance bar plot
  - Dependence plots for top 4 features

Usage:
    python -m ml.training.shap_analysis
"""
import shap
import joblib
import pandas as pd
import numpy as np
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from ml.data_pipeline.config import DATA_DIR, MODEL_DIR, FEATURE_NAMES


def shap_analysis():
    model_path = os.path.join(MODEL_DIR, 'model.pkl')
    data_path = os.path.join(DATA_DIR, 'processed', 'training_dataset.parquet')

    if not os.path.exists(model_path) or not os.path.exists(data_path):
        print("ERROR: Model or data not found. Run training first.")
        return

    print("Loading model and data...")
    model = joblib.load(model_path)
    df = pd.read_parquet(data_path)

    # Use a sample for SHAP (computationally intensive)
    sample = df.sample(min(500, len(df)), random_state=42)
    X_sample = sample[FEATURE_NAMES]

    print(f"Computing SHAP values for {len(X_sample)} samples...")
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)

    out_dir = os.path.join(MODEL_DIR, 'shap')
    os.makedirs(out_dir, exist_ok=True)

    # --- 1. Beeswarm Summary Plot ---
    print("Generating summary plot...")
    plt.figure(figsize=(10, 7))
    shap.summary_plot(shap_values, X_sample, show=False, max_display=12)
    plt.title('SHAP Feature Importance (Beeswarm)', fontsize=14)
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'summary_beeswarm.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("  Saved: summary_beeswarm.png")

    # --- 2. Bar Plot (mean |SHAP|) ---
    plt.figure(figsize=(10, 6))
    shap.summary_plot(shap_values, X_sample, plot_type='bar', show=False, max_display=12)
    plt.title('Mean |SHAP| Feature Importance', fontsize=14)
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'importance_bar.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("  Saved: importance_bar.png")

    # --- 3. Dependence Plots for Top 4 Features ---
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    top_features_idx = np.argsort(mean_abs_shap)[::-1][:4]

    for idx in top_features_idx:
        feat_name = FEATURE_NAMES[idx]
        print(f"  Generating dependence plot for '{feat_name}'...")
        plt.figure(figsize=(8, 5))
        shap.dependence_plot(idx, shap_values, X_sample, show=False, feature_names=FEATURE_NAMES)
        plt.title(f'SHAP Dependence: {feat_name}', fontsize=13)
        plt.tight_layout()
        plt.savefig(os.path.join(out_dir, f'dependence_{feat_name}.png'), dpi=150, bbox_inches='tight')
        plt.close()
        print(f"  Saved: dependence_{feat_name}.png")

    # --- 4. Export mean SHAP values ---
    mean_shap = pd.DataFrame({
        'feature': FEATURE_NAMES,
        'mean_abs_shap': np.abs(shap_values).mean(axis=0),
        'mean_shap': shap_values.mean(axis=0)
    }).sort_values('mean_abs_shap', ascending=False)

    mean_shap.to_csv(os.path.join(out_dir, 'shap_importance.csv'), index=False)
    print("\n  Saved: shap_importance.csv")

    print("\nSHAP Importance Ranking:")
    for _, row in mean_shap.iterrows():
        direction = '↑ risk' if row['mean_shap'] > 0 else '↓ risk'
        print(f"  {row['feature']:<25} |SHAP|={row['mean_abs_shap']:.4f}  ({direction})")

    print(f"\n✅ SHAP analysis complete! Plots saved to {out_dir}")


if __name__ == '__main__':
    shap_analysis()
