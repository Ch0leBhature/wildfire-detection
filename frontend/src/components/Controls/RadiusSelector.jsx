import React from 'react';

const RadiusSelector = ({ radius, onChange }) => {
  const options = [25, 50, 75, 100];

  return (
    <div className="control-group">
      <label className="control-label">Analysis Radius (km)</label>
      <div className="radius-selector">
        {options.map((opt) => (
          <div
            key={opt}
            className={`radius-pill ${radius === opt ? 'active' : ''}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadiusSelector;
