import React, { useState, useEffect, useRef } from 'react';
import { geocodeLocation } from '../../services/api';

const LocationSearch = ({ onLocationSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await geocodeLocation(query);
        setResults(data);
        setShowDropdown(true);
      } catch (error) {
        console.error('Geocoding error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  const handleSelect = (item) => {
    setQuery(item.display_name);
    setShowDropdown(false);
    onLocationSelect(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
  };

  return (
    <div className="control-group" style={{ position: 'relative' }}>
      <label className="control-label">Search Location</label>
      <input
        type="text"
        placeholder="Enter city, region, etc..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
      />
      {loading && <div style={{ position: 'absolute', right: '10px', top: '35px', color: '#a0a0b0' }}>...</div>}
      
      {showDropdown && results.length > 0 && (
        <div className="search-results">
          {results.map((item, idx) => (
            <div key={idx} className="search-item" onClick={() => handleSelect(item)}>
              {item.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
