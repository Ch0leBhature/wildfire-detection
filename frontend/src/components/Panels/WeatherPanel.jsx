import React from 'react';

const WeatherPanel = ({ weatherData }) => {
  if (!weatherData) return null;

  const fmt = (val, decimals = 1) =>
    val !== undefined && val !== null ? Number(val).toFixed(decimals) : 'N/A';

  return (
    <div className="panel">
      <h2>🌤️ Current Weather</h2>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-icon">🌡️</span>
          <div>
            <div className="stat-value">{fmt(weatherData.temperature_current)}°C</div>
            <div className="stat-label">Temperature</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">💧</span>
          <div>
            <div className="stat-value">{fmt(weatherData.humidity_current, 0)}%</div>
            <div className="stat-label">Humidity</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">💨</span>
          <div>
            <div className="stat-value">{fmt(weatherData.wind_speed_current)} km/h</div>
            <div className="stat-label">Wind Speed</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🌧️</span>
          <div>
            <div className="stat-value">{fmt(weatherData.rainfall_1d)} mm</div>
            <div className="stat-label">Rainfall (24h)</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
          <span>Rain (3d):</span><span>{fmt(weatherData.rainfall_3d)} mm</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
          <span>Rain (7d):</span><span>{fmt(weatherData.rainfall_7d)} mm</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Rain (30d):</span><span>{fmt(weatherData.rainfall_30d)} mm</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherPanel;
