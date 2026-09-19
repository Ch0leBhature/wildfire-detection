import React from 'react';
import { getRiskColor, getRiskCategory, RISK_CATEGORIES } from '../../utils/riskColors';

const RiskSummary = ({ summary }) => {
  if (!summary) return null;

  const avgRisk = summary.avgRisk || summary.averageRisk || 0;
  const totalCells = summary.totalCells || 0;
  const avgRiskCat = getRiskCategory(avgRisk);
  const avgRiskColor = getRiskColor(avgRisk);

  // Handle both API formats: cellsByCategory or distribution
  const cats = summary.cellsByCategory || {};
  const low = cats['Low'] || 0;
  const moderate = cats['Moderate'] || 0;
  const high = cats['High'] || 0;
  const veryHigh = cats['Very High'] || 0;

  const pctLow = totalCells ? Math.round((low / totalCells) * 100) : 0;
  const pctModerate = totalCells ? Math.round((moderate / totalCells) * 100) : 0;
  const pctHigh = totalCells ? Math.round((high / totalCells) * 100) : 0;
  const pctVeryHigh = totalCells ? Math.round((veryHigh / totalCells) * 100) : 0;

  return (
    <div className="panel">
      <h2>📈 Analysis Summary</h2>

      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace', color: avgRiskColor }}>
          {(avgRisk * 100).toFixed(1)}%
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>Average Risk ({avgRiskCat})</div>
      </div>

      {/* Risk distribution bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
          {pctLow > 0 && <div style={{ width: `${pctLow}%`, backgroundColor: 'var(--risk-low)', transition: 'width 0.3s' }}></div>}
          {pctModerate > 0 && <div style={{ width: `${pctModerate}%`, backgroundColor: 'var(--risk-moderate)', transition: 'width 0.3s' }}></div>}
          {pctHigh > 0 && <div style={{ width: `${pctHigh}%`, backgroundColor: 'var(--risk-high)', transition: 'width 0.3s' }}></div>}
          {pctVeryHigh > 0 && <div style={{ width: `${pctVeryHigh}%`, backgroundColor: 'var(--risk-very-high)', transition: 'width 0.3s' }}></div>}
        </div>
      </div>

      {/* Category breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '1rem' }}>
        <div className="stat-item">
          <span style={{ color: 'var(--risk-low)' }}>● Low</span>
          <span>{low} ({pctLow}%)</span>
        </div>
        <div className="stat-item">
          <span style={{ color: 'var(--risk-moderate)' }}>● Moderate</span>
          <span>{moderate} ({pctModerate}%)</span>
        </div>
        <div className="stat-item">
          <span style={{ color: 'var(--risk-high)' }}>● High</span>
          <span>{high} ({pctHigh}%)</span>
        </div>
        <div className="stat-item">
          <span style={{ color: 'var(--risk-very-high)' }}>● Very High</span>
          <span>{veryHigh} ({pctVeryHigh}%)</span>
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
        Total cells analyzed: <strong style={{ color: 'var(--text-primary)' }}>{totalCells}</strong>
        {summary.modelVersion && (
          <span style={{ float: 'right', fontSize: '0.75rem' }}>Model: {summary.modelVersion}</span>
        )}
      </div>
    </div>
  );
};

export default RiskSummary;
