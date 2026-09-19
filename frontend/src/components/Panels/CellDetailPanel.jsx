import React from 'react';
import { getRiskColor, getRiskCategory } from '../../utils/riskColors';

const LAND_COVER_LABELS = {
  0: 'Water',
  1: 'Forest',
  2: 'Shrubland',
  3: 'Grassland',
  4: 'Cropland',
  5: 'Urban',
  6: 'Barren'
};

const CellDetailPanel = ({ cellProperties }) => {
  if (!cellProperties) return null;

  const prob = cellProperties.probability;
  const color = getRiskColor(prob);
  const category = cellProperties.category || getRiskCategory(prob);

  const fmt = (val, decimals = 2) =>
    val !== undefined && val !== null ? Number(val).toFixed(decimals) : 'N/A';

  // Simple risk factor analysis
  const getRiskFactors = () => {
    const factors = [];
    if (cellProperties.temperature_current > 35)
      factors.push({ label: 'High temperature', value: `${fmt(cellProperties.temperature_current, 1)}°C`, severity: 'high' });
    if (cellProperties.humidity_current < 30)
      factors.push({ label: 'Low humidity', value: `${fmt(cellProperties.humidity_current, 0)}%`, severity: 'high' });
    if (cellProperties.wind_speed_current > 20)
      factors.push({ label: 'High wind speed', value: `${fmt(cellProperties.wind_speed_current, 1)} km/h`, severity: 'moderate' });
    if (cellProperties.rainfall_7d < 2)
      factors.push({ label: 'Low recent rainfall', value: `${fmt(cellProperties.rainfall_7d, 1)} mm (7d)`, severity: 'high' });
    if (cellProperties.ndmi < 0.2)
      factors.push({ label: 'Low vegetation moisture', value: `NDMI: ${fmt(cellProperties.ndmi, 3)}`, severity: 'moderate' });
    if (cellProperties.ndvi > 0.5 && cellProperties.ndmi < 0.3)
      factors.push({ label: 'Dry vegetation present', value: `NDVI: ${fmt(cellProperties.ndvi, 3)}`, severity: 'moderate' });
    return factors.slice(0, 3);
  };

  const riskFactors = getRiskFactors();

  return (
    <div className="panel">
      <h2>📊 Cell Details</h2>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
        ID: {cellProperties.grid_id || 'Unknown'}
      </div>

      <div className="risk-probability" style={{ borderColor: color, borderWidth: '2px', borderStyle: 'solid', borderRadius: '8px', padding: '1rem', textAlign: 'center', marginBottom: '1rem' }}>
        <div className="risk-number" style={{ color, fontSize: '2.2rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
          {(prob * 100).toFixed(1)}%
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.3rem' }}>{category} Risk</div>
      </div>

      {riskFactors.length > 0 && (
        <>
          <h3>⚠️ Key Risk Factors</h3>
          <div style={{ marginBottom: '1rem' }}>
            {riskFactors.map((f, i) => (
              <div key={i} style={{
                padding: '0.4rem 0.6rem',
                marginBottom: '0.3rem',
                backgroundColor: f.severity === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                borderRadius: '4px',
                fontSize: '0.85rem'
              }}>
                <strong>{f.label}:</strong> {f.value}
              </div>
            ))}
          </div>
        </>
      )}

      <h3>📋 Feature Values</h3>
      <table className="feature-table">
        <tbody>
          <tr><th>🌡️ Temperature</th><td>{fmt(cellProperties.temperature_current, 1)} °C</td></tr>
          <tr><th>💧 Humidity</th><td>{fmt(cellProperties.humidity_current, 0)}%</td></tr>
          <tr><th>💨 Wind Speed</th><td>{fmt(cellProperties.wind_speed_current, 1)} km/h</td></tr>
          <tr><th>🌧️ Rain (1d)</th><td>{fmt(cellProperties.rainfall_1d, 1)} mm</td></tr>
          <tr><th>🌧️ Rain (3d)</th><td>{fmt(cellProperties.rainfall_3d, 1)} mm</td></tr>
          <tr><th>🌧️ Rain (7d)</th><td>{fmt(cellProperties.rainfall_7d, 1)} mm</td></tr>
          <tr><th>🌧️ Rain (30d)</th><td>{fmt(cellProperties.rainfall_30d, 1)} mm</td></tr>
          <tr><th>🌿 NDVI</th><td>{fmt(cellProperties.ndvi, 3)} {cellProperties.ndvi > 0.5 ? '(healthy)' : '(stressed)'}</td></tr>
          <tr><th>💦 NDMI</th><td>{fmt(cellProperties.ndmi, 3)} {cellProperties.ndmi > 0.3 ? '(moist)' : '(dry)'}</td></tr>
          <tr><th>⛰️ Elevation</th><td>{fmt(cellProperties.elevation, 0)} m</td></tr>
          <tr><th>📐 Slope</th><td>{fmt(cellProperties.slope, 1)}°</td></tr>
          <tr><th>🏞️ Land Cover</th><td>{LAND_COVER_LABELS[cellProperties.land_cover] || 'Unknown'}</td></tr>
        </tbody>
      </table>

      {cellProperties.model_version && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.8rem', textAlign: 'right' }}>
          Model: v{cellProperties.model_version}
        </div>
      )}
    </div>
  );
};

export default CellDetailPanel;
