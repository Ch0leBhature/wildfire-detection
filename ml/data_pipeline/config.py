import os

FEATURE_NAMES = [
    'temperature_current', 'humidity_current', 'wind_speed_current',
    'rainfall_1d', 'rainfall_3d', 'rainfall_7d', 'rainfall_30d',
    'ndvi', 'ndmi', 'elevation', 'slope', 'land_cover'
]
FEATURE_COUNT = 12

LAND_COVER_CLASSES = {
    0: 'water', 1: 'forest', 2: 'shrubland', 3: 'grassland',
    4: 'cropland', 5: 'urban', 6: 'barren'
}

RISK_THRESHOLDS = {'low': 0.3, 'moderate': 0.6, 'high': 0.8}
GRID_SIZE_KM = 5
CALIFORNIA_BBOX = {'west': -124.5, 'south': 32.5, 'east': -114.0, 'north': 42.0}
TRAINING_YEARS = range(2019, 2024)
VALIDATION_YEAR = 2024

STUDY_REGIONS = [
    {"name": "NorCal", "lat": 40.0, "lng": -122.0},
    {"name": "Sierras", "lat": 38.0, "lng": -120.0},
    {"name": "SoCal", "lat": 34.0, "lng": -118.0}
]

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MODEL_DIR = os.path.join(BASE_DIR, 'ml', 'models')
DATA_DIR = os.path.join(BASE_DIR, 'data')
