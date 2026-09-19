import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Circle, CircleMarker, LayersControl, FeatureGroup, useMap } from 'react-leaflet';
import { getRiskColor, getRiskOpacity } from '../../utils/riskColors';
import RiskLegend from './RiskLegend';
import 'leaflet/dist/leaflet.css';

const { BaseLayer, Overlay } = LayersControl;

/**
 * Helper component that fits map bounds when risk data changes.
 */
const FitBounds = ({ riskData }) => {
  const map = useMap();

  useEffect(() => {
    if (riskData && riskData.features && riskData.features.length > 0) {
      const L = window.L || require('leaflet');
      const bounds = L.geoJSON(riskData).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [riskData, map]);

  return null;
};

const RiskMap = ({ riskData, firesData, center, radius, selectedCell, onCellSelect }) => {
  // Use a key to force GeoJSON re-render when data changes
  const geoJsonKey = useMemo(() => {
    if (!riskData) return 'empty';
    return `risk-${riskData.features?.length}-${Date.now()}`;
  }, [riskData]);

  const firesKey = useMemo(() => {
    if (!firesData) return 'no-fires';
    return `fires-${firesData.features?.length}-${Date.now()}`;
  }, [firesData]);

  const mapCenter = center || [20, 0];
  const zoom = center ? 8 : 3;

  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    // Add tooltip
    layer.bindTooltip(
      `<strong>${props.grid_id}</strong><br/>Risk: ${(props.probability * 100).toFixed(1)}%<br/>Category: ${props.category}`,
      { sticky: true, className: 'risk-tooltip' }
    );
    layer.on({
      click: () => {
        onCellSelect(feature.properties);
      },
      mouseover: (e) => {
        e.target.setStyle({ weight: 3, color: '#ffffff' });
      },
      mouseout: (e) => {
        if (!selectedCell || selectedCell.grid_id !== props.grid_id) {
          e.target.setStyle({ weight: 1, color: 'rgba(255,255,255,0.3)' });
        }
      }
    });
  };

  const style = (feature) => {
    const prob = feature.properties.probability;
    const isSelected = selectedCell && selectedCell.grid_id === feature.properties.grid_id;
    return {
      fillColor: getRiskColor(prob),
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)',
      fillOpacity: getRiskOpacity(prob)
    };
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <FitBounds riskData={riskData} />

      <LayersControl position="topright">
        <BaseLayer checked name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </BaseLayer>
        <BaseLayer name="Dark Matter">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        </BaseLayer>
        <BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </BaseLayer>

        {center && radius && (
          <Overlay checked name="Search Area">
            <Circle
              center={center}
              radius={radius * 1000}
              pathOptions={{ color: '#e94560', weight: 2, dashArray: '8, 12', fillOpacity: 0.03, fillColor: '#e94560' }}
            />
          </Overlay>
        )}

        {riskData && riskData.features && riskData.features.length > 0 && (
          <Overlay checked name="Risk Grid">
            <FeatureGroup>
              <GeoJSON
                key={geoJsonKey}
                data={riskData}
                style={style}
                onEachFeature={onEachFeature}
              />
            </FeatureGroup>
          </Overlay>
        )}

        {firesData && firesData.features && firesData.features.length > 0 && (
          <Overlay checked name="🔥 Fire Detections (FIRMS)">
            <FeatureGroup key={firesKey}>
              {firesData.features.map((fire, idx) => (
                <CircleMarker
                  key={`fire-${idx}`}
                  center={[fire.geometry.coordinates[1], fire.geometry.coordinates[0]]}
                  radius={4}
                  pathOptions={{
                    color: '#ff2200',
                    fillColor: '#ff6600',
                    fillOpacity: 0.9,
                    weight: 1
                  }}
                >
                </CircleMarker>
              ))}
            </FeatureGroup>
          </Overlay>
        )}
      </LayersControl>

      <RiskLegend />
    </MapContainer>
  );
};

export default RiskMap;
