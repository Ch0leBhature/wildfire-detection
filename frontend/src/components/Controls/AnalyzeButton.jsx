import React from 'react';

const AnalyzeButton = ({ onAnalyze, disabled, loading, hasData }) => {
  let buttonText = 'Analyze Risk';
  if (loading) buttonText = 'Analyzing...';
  else if (hasData) buttonText = 'Re-analyze';

  return (
    <button 
      className="analyze-btn"
      onClick={onAnalyze}
      disabled={disabled || loading}
    >
      {buttonText}
    </button>
  );
};

export default AnalyzeButton;
