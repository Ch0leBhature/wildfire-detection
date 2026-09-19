"""
Build Training Dataset for Wildfire Risk Detection.

Modes:
  --mode=synthetic  (DEFAULT) Generate realistic synthetic data for California.
                    Works without any external APIs.
  --mode=full       Run the full pipeline (requires GEE + FIRMS + Open-Meteo).

Usage:
    python -m ml.data_pipeline.build_training_set --mode=synthetic
"""
import argparse
import pandas as pd
import numpy as np
import os
from ml.data_pipeline.config import DATA_DIR, FEATURE_NAMES


def generate_synthetic(n_cells: int = 800, n_months: int = 60) -> pd.DataFrame:
    """Generate a realistic synthetic training dataset for California.

    Creates ~n_cells grid cells × n_months monthly observations with:
    - Geographically and seasonally varying weather
    - Realistic NDVI/NDMI based on land cover, season, and location
    - Elevation/slope from rough California topography
    - Fire labels from a logistic generative model with ~4% fire rate

    Args:
        n_cells: Number of grid cells to simulate.
        n_months: Number of monthly time steps (default 60 = 5 years).
    """
    np.random.seed(42)
    n_samples = n_cells * n_months

    # --- Grid cell properties (static per cell) ---
    cell_lats = np.random.uniform(33.0, 42.0, n_cells)  # California latitude range
    cell_lngs = np.random.uniform(-124.0, -115.0, n_cells)

    # Elevation: higher in Sierras (east of -120), lower on coast
    cell_elevation = np.zeros(n_cells)
    for i in range(n_cells):
        if cell_lngs[i] > -121.0 and cell_lngs[i] < -118.0 and cell_lats[i] > 35.0:
            # Sierra Nevada region
            cell_elevation[i] = np.random.normal(2000, 600)
        elif cell_lngs[i] < -122.0:
            # Coastal
            cell_elevation[i] = np.random.normal(200, 150)
        else:
            # Central valley / general
            cell_elevation[i] = np.random.normal(500, 300)
    cell_elevation = np.clip(cell_elevation, 0, 4000)

    cell_slope = np.clip(np.random.gamma(3, 3, n_cells) + cell_elevation / 500, 0, 50)

    # Land cover: weighted by region
    cell_land_cover = np.zeros(n_cells, dtype=int)
    for i in range(n_cells):
        if cell_elevation[i] > 1500:
            # High elevation: forest/barren
            cell_land_cover[i] = np.random.choice([1, 2, 6], p=[0.5, 0.3, 0.2])
        elif cell_lats[i] < 35.0:
            # Southern CA: shrubland/grassland
            cell_land_cover[i] = np.random.choice([2, 3, 4, 5, 6], p=[0.35, 0.25, 0.15, 0.15, 0.10])
        elif cell_lngs[i] > -119.0:
            # Central valley: cropland
            cell_land_cover[i] = np.random.choice([3, 4, 5, 2], p=[0.2, 0.5, 0.2, 0.1])
        else:
            # Northern CA: forest/shrubland
            cell_land_cover[i] = np.random.choice([1, 2, 3, 4], p=[0.45, 0.25, 0.2, 0.1])

    # --- Repeat cell properties across months ---
    cell_idx = np.repeat(np.arange(n_cells), n_months)
    month_idx = np.tile(np.arange(n_months), n_cells)
    month_of_year = month_idx % 12  # 0=Jan, 11=Dec

    lats = cell_lats[cell_idx]
    elevation = cell_elevation[cell_idx]
    slope = cell_slope[cell_idx]
    land_cover = cell_land_cover[cell_idx]

    # --- Weather: seasonal + geographic + noise ---
    # Base temperature: warmer in summer (month 5-8), warmer in south, cooler at altitude
    seasonal_temp = 10 * np.sin((month_of_year - 3) * np.pi / 6)  # peak in July
    lat_temp = -(lats - 37) * 1.5  # warmer in south
    elev_temp = -elevation * 0.0065  # lapse rate
    temperature = 20 + seasonal_temp + lat_temp + elev_temp + np.random.normal(0, 3, n_samples)

    # Humidity: higher in winter, coastal, at altitude
    seasonal_hum = -15 * np.sin((month_of_year - 3) * np.pi / 6)  # dryer in summer
    humidity = 50 + seasonal_hum + np.random.normal(0, 10, n_samples)
    humidity = np.clip(humidity, 5, 100)

    # Wind: slightly seasonal
    wind = np.clip(np.random.gamma(3, 3, n_samples) + 3 * np.sin((month_of_year - 8) * np.pi / 6), 0, 50)

    # Rainfall: seasonal (wet winters, dry summers in CA)
    rain_season = np.exp(2.0 - 1.5 * np.sin((month_of_year - 3) * np.pi / 6))
    rainfall_30d = np.clip(np.random.exponential(rain_season * 10), 0, 300)
    rainfall_7d = np.clip(rainfall_30d * np.random.uniform(0.15, 0.4, n_samples), 0, 100)
    rainfall_3d = np.clip(rainfall_7d * np.random.uniform(0.2, 0.6, n_samples), 0, 50)
    rainfall_1d = np.clip(rainfall_3d * np.random.uniform(0.1, 0.5, n_samples), 0, 20)

    # --- Vegetation indices: seasonal + land cover dependent ---
    base_ndvi = np.where(land_cover == 0, 0.0,
                np.where(land_cover == 1, 0.65,
                np.where(land_cover == 2, 0.40,
                np.where(land_cover == 3, 0.45,
                np.where(land_cover == 4, 0.55,
                np.where(land_cover == 5, 0.15, 0.08))))))

    seasonal_ndvi = 0.15 * np.sin((month_of_year - 1) * np.pi / 6)  # peak in spring
    ndvi = np.clip(base_ndvi + seasonal_ndvi + np.random.normal(0, 0.08, n_samples), -0.1, 0.95)

    # NDMI correlates with NDVI but also responds to rainfall
    ndmi = np.clip(ndvi * 0.6 - 0.1 + rainfall_7d * 0.005 + np.random.normal(0, 0.06, n_samples), -0.3, 0.7)

    # --- Fire label: logistic generative model ---
    # Land cover risk factors
    lc_risk = np.array([0.0, 1.2, 1.8, 0.8, 0.1, -0.5, 0.3])[land_cover]

    # Seasonal fire risk (peak in summer/fall: months 6-10)
    seasonal_fire = 1.5 * np.sin((month_of_year - 4) * np.pi / 6)
    seasonal_fire = np.clip(seasonal_fire, -0.5, 1.5)

    # Logistic model
    logit = (
        -4.0  # base rate
        + 0.06 * (temperature - 25)    # high temp → more fire
        - 0.03 * humidity              # high humidity → less fire
        + 0.04 * wind                  # high wind → more fire
        - 0.08 * rainfall_7d           # recent rain → less fire
        - 1.5 * ndmi                   # dry vegetation → more fire
        + 0.15 * slope / 10            # steep slopes → slightly more fire
        + lc_risk                      # land cover risk
        + seasonal_fire                # seasonal pattern
        + np.random.normal(0, 0.8, n_samples)  # noise
    )

    prob = 1.0 / (1.0 + np.exp(-logit))
    fire = (np.random.rand(n_samples) < prob).astype(int)

    # Build DataFrame
    df = pd.DataFrame({
        'grid_id': cell_idx,
        'month': month_idx,
        'temperature_current': np.round(temperature, 2),
        'humidity_current': np.round(humidity, 2),
        'wind_speed_current': np.round(wind, 2),
        'rainfall_1d': np.round(rainfall_1d, 2),
        'rainfall_3d': np.round(rainfall_3d, 2),
        'rainfall_7d': np.round(rainfall_7d, 2),
        'rainfall_30d': np.round(rainfall_30d, 2),
        'ndvi': np.round(ndvi, 4),
        'ndmi': np.round(ndmi, 4),
        'elevation': np.round(elevation, 1),
        'slope': np.round(slope, 2),
        'land_cover': land_cover,
        'fire': fire
    })

    return df


def main():
    parser = argparse.ArgumentParser(description='Build training dataset')
    parser.add_argument('--mode', choices=['synthetic', 'full'], default='synthetic',
                        help='synthetic = generate data without APIs; full = use real data sources')
    parser.add_argument('--cells', type=int, default=800, help='Number of grid cells')
    parser.add_argument('--months', type=int, default=60, help='Number of monthly time steps')
    args = parser.parse_args()

    if args.mode == 'synthetic':
        print(f"Generating synthetic training data ({args.cells} cells × {args.months} months)...")
        df = generate_synthetic(n_cells=args.cells, n_months=args.months)

        out_dir = os.path.join(DATA_DIR, 'processed')
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, 'training_dataset.parquet')
        df.to_parquet(out_path, index=False)

        fire_count = df['fire'].sum()
        fire_rate = fire_count / len(df) * 100
        print(f"\nDataset saved to {out_path}")
        print(f"  Total samples: {len(df):,}")
        print(f"  Fire events:   {fire_count:,} ({fire_rate:.1f}%)")
        print(f"  Grid cells:    {df['grid_id'].nunique()}")
        print(f"  Features:      {FEATURE_NAMES}")
    else:
        print("Full pipeline requires GEE + FIRMS + Open-Meteo APIs.")
        print("Use gee/scripts/ for satellite data, ml/data_pipeline/firms_ingestion.py for fire labels,")
        print("and ml/data_pipeline/weather_historical.py for weather data.")
        print("Then run ml/data_pipeline/feature_engineering.py to join all sources.")


if __name__ == '__main__':
    main()
