import React, { useState } from 'react';
import ControlPanel from './components/Controls/ControlPanel';
import RiskMap from './components/Map/RiskMap';
import WeatherPanel from './components/Panels/WeatherPanel';
import RiskSummary from './components/Panels/RiskSummary';
import CellDetailPanel from './components/Panels/CellDetailPanel';
import FiresPanel from './components/Panels/FiresPanel';
import { useRiskAnalysis } from './hooks/useRiskAnalysis';
import './App.css';

function App() {
  const {
    riskData,
    firesData,
    weatherData,
    summary,
    loading,
    error,
    selectedCell,
    analysisComplete,
    analyze,
    selectCell
  } = useRiskAnalysis();

  const [searchParams, setSearchParams] = useState(null);

  const handleAnalyze = (lat, lng, radius) => {
    setSearchParams({ lat, lng, radius });
    analyze(lat, lng, radius);
  };

  return (
    <div className="app-container">
      <header>
        <div style={{ fontSize: '1.5rem' }}>🔥</div>
        <h1>Wildfire Risk Detection</h1>
        <div className="header-subtitle">AI-Powered Geospatial Risk Assessment</div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <ControlPanel
            onAnalyze={handleAnalyze}
            loading={loading}
            hasData={analysisComplete}
          />

          {error && (
            <div className="panel" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--risk-very-high)' }}>
              <h3 style={{ color: 'var(--risk-very-high)', margin: '0 0 0.5rem 0' }}>⚠️ Error</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
            </div>
          )}

          {weatherData && <WeatherPanel weatherData={weatherData} />}

          {analysisComplete && summary && <RiskSummary summary={summary} />}

          {selectedCell && <CellDetailPanel cellProperties={selectedCell} />}

          {firesData && firesData.features && firesData.features.length > 0 && (
            <FiresPanel firesData={firesData} />
          )}

          {!analysisComplete && !loading && (
            <div className="panel" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '2rem', margin: '1rem 0 0.5rem' }}>🗺️</p>
              <p>Search for a location and select a radius to analyze wildfire risk.</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>The system will generate a 5 km × 5 km grid and assess risk for each cell using current weather and environmental data.</p>
            </div>
          )}
        </aside>

        <main className="map-container">
          {loading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <div>Analyzing Wildfire Risk...</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
                Fetching weather data and running ML predictions
              </div>
            </div>
          )}
          <RiskMap
            riskData={riskData}
            firesData={firesData}
            center={searchParams ? [searchParams.lat, searchParams.lng] : null}
            radius={searchParams ? searchParams.radius : null}
            selectedCell={selectedCell}
            onCellSelect={selectCell}
          />
        </main>
      </div>

      <footer>
        ⚠️ <strong>Disclaimer:</strong> Risk predictions are based on machine learning models and environmental data.
        They represent statistical estimates, not guarantees. For actual emergency information, consult local fire authorities.
      </footer>
    </div>
  );
}

export default App;
