-- PostGIS Schema for Wildfire Risk Detection System
-- Run after creating the database with PostGIS extension:
--   CREATE EXTENSION IF NOT EXISTS postgis;

-- Grid cells: the spatial foundation
CREATE TABLE IF NOT EXISTS grid_cells (
    grid_id     SERIAL PRIMARY KEY,
    geometry    GEOMETRY(Polygon, 4326) NOT NULL,
    centroid    GEOMETRY(Point, 4326) NOT NULL,
    elevation   REAL,
    slope       REAL,
    land_cover  SMALLINT,
    region      VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grid_cells_geom ON grid_cells USING GIST (geometry);
CREATE INDEX idx_grid_cells_centroid ON grid_cells USING GIST (centroid);

-- Environment features: time-varying satellite/weather data per grid cell
CREATE TABLE IF NOT EXISTS environment_features (
    id                    SERIAL PRIMARY KEY,
    grid_id               INTEGER REFERENCES grid_cells(grid_id),
    observation_date      DATE NOT NULL,
    ndvi                  REAL,
    ndmi                  REAL,
    temperature_current   REAL,
    humidity_current      REAL,
    wind_speed_current    REAL,
    rainfall_1d           REAL,
    rainfall_3d           REAL,
    rainfall_7d           REAL,
    rainfall_30d          REAL,
    data_source           VARCHAR(50),
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (grid_id, observation_date)
);

CREATE INDEX idx_env_features_grid_date ON environment_features (grid_id, observation_date);

-- Fire events: historical and recent FIRMS detections
CREATE TABLE IF NOT EXISTS fire_events (
    id           SERIAL PRIMARY KEY,
    geometry     GEOMETRY(Point, 4326) NOT NULL,
    acq_date     DATE NOT NULL,
    acq_time     VARCHAR(10),
    brightness   REAL,
    confidence   VARCHAR(20),
    frp          REAL,
    satellite    VARCHAR(20),
    source       VARCHAR(30) DEFAULT 'VIIRS_SNPP',
    grid_id      INTEGER REFERENCES grid_cells(grid_id),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fire_events_geom ON fire_events USING GIST (geometry);
CREATE INDEX idx_fire_events_date ON fire_events (acq_date);
CREATE INDEX idx_fire_events_grid ON fire_events (grid_id);

-- Risk predictions: model outputs
CREATE TABLE IF NOT EXISTS risk_predictions (
    id              SERIAL PRIMARY KEY,
    grid_id         INTEGER REFERENCES grid_cells(grid_id),
    prediction_time TIMESTAMPTZ NOT NULL,
    probability     REAL NOT NULL,
    category        VARCHAR(20) NOT NULL,
    model_version   VARCHAR(20) NOT NULL,
    features_json   JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_pred_grid_time ON risk_predictions (grid_id, prediction_time);
CREATE INDEX idx_risk_pred_time ON risk_predictions (prediction_time);

-- AOI requests: track user analysis requests
CREATE TABLE IF NOT EXISTS aoi_requests (
    id          SERIAL PRIMARY KEY,
    center      GEOMETRY(Point, 4326) NOT NULL,
    radius_km   INTEGER NOT NULL,
    cell_count  INTEGER,
    avg_risk    REAL,
    model_version VARCHAR(20),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_aoi_requests_center ON aoi_requests USING GIST (center);
CREATE INDEX idx_aoi_requests_time ON aoi_requests (created_at);
