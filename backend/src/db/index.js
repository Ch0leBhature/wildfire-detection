/**
 * PostGIS database connection module.
 *
 * Uses the pg library for PostgreSQL connections.
 * In the MVP, this is optional — the system works without PostGIS
 * using in-memory grid generation and runtime feature assembly.
 *
 * To enable PostGIS:
 *   1. Start PostgreSQL with PostGIS extension (see docker-compose.yml)
 *   2. Run schema.sql to create tables
 *   3. Set DATABASE_URL in .env
 */
import pg from 'pg';

const { Pool } = pg;

let pool = null;

export const getPool = () => {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    pool.on('error', (err) => {
      console.error('PostGIS pool error:', err.message);
    });

    console.log('PostGIS connection pool created');
  }
  return pool;
};

/**
 * Execute a query against PostGIS.
 * Returns null if PostGIS is not configured.
 */
export const query = async (text, params) => {
  const p = getPool();
  if (!p) return null;

  try {
    return await p.query(text, params);
  } catch (error) {
    console.error('PostGIS query error:', error.message);
    throw error;
  }
};

/**
 * Store a risk prediction result in PostGIS.
 */
export const storeRiskPrediction = async (gridId, probability, category, modelVersion, featuresJson) => {
  return query(
    `INSERT INTO risk_predictions (grid_id, prediction_time, probability, category, model_version, features_json)
     VALUES ($1, NOW(), $2, $3, $4, $5)`,
    [gridId, probability, category, modelVersion, JSON.stringify(featuresJson)]
  );
};

/**
 * Store a fire event in PostGIS.
 */
export const storeFireEvent = async (lat, lng, acqDate, acqTime, brightness, confidence, frp, satellite) => {
  return query(
    `INSERT INTO fire_events (geometry, acq_date, acq_time, brightness, confidence, frp, satellite)
     VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING`,
    [lng, lat, acqDate, acqTime, brightness, confidence, frp, satellite]
  );
};

/**
 * Find grid cells that intersect a given AOI polygon.
 */
export const findGridCellsInAOI = async (aoiGeoJSON) => {
  return query(
    `SELECT grid_id, ST_AsGeoJSON(geometry)::json as geometry,
            elevation, slope, land_cover
     FROM grid_cells
     WHERE ST_Intersects(geometry, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))`,
    [JSON.stringify(aoiGeoJSON)]
  );
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
