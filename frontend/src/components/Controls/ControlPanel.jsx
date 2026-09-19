import React, { useState } from 'react';
import LocationSearch from './LocationSearch';
import RadiusSelector from './RadiusSelector';
import AnalyzeButton from './AnalyzeButton';

const ControlPanel = ({ onAnalyze, loading, hasData }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [radius, setRadius] = useState(50);

  const handleLocationSelect = (lat, lng, name) => {
    setSelectedLocation({ lat, lng, name });
  };

  const handleAnalyze = () => {
    if (selectedLocation) {
      onAnalyze(selectedLocation.lat, selectedLocation.lng, radius);
    }
  };

  return (
    <div className="panel">
      <h2>Location Setup</h2>
      <LocationSearch onLocationSelect={handleLocationSelect} />
      <RadiusSelector radius={radius} onChange={setRadius} />
      <AnalyzeButton 
        onAnalyze={handleAnalyze} 
        disabled={!selectedLocation} 
        loading={loading} 
        hasData={hasData} 
      />
    </div>
  );
};

export default ControlPanel;
