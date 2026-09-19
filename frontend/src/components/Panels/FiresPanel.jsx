import React from 'react';

const FiresPanel = ({ firesData }) => {
  if (!firesData || !firesData.features || firesData.features.length === 0) {
    return (
      <div className="panel">
        <h2>Recent Fires</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active fires detected in this area recently.</p>
      </div>
    );
  }

  const fireCount = firesData.features.length;

  return (
    <div className="panel">
      <h2 style={{ color: '#ff4400' }}>🔥 Active Fires</h2>
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fireCount}</span>
        <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>detections in past 24h</span>
      </div>

      <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
        {firesData.features.slice(0, 10).map((fire, idx) => (
          <div key={idx} style={{ 
            padding: '0.5rem', 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Conf: <strong>{fire.properties.confidence || 'N/A'}%</strong></span>
              <span>FRP: <strong>{fire.properties.frp || 'N/A'} MW</strong></span>
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.75rem' }}>
              {new Date(fire.properties.acq_date).toLocaleDateString()} {fire.properties.acq_time}
            </div>
          </div>
        ))}
        {fireCount > 10 && (
          <div style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            + {fireCount - 10} more detections
          </div>
        )}
      </div>
    </div>
  );
};

export default FiresPanel;
