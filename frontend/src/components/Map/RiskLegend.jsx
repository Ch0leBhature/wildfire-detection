import React from 'react';
import { useMap } from 'react-leaflet';
import { RISK_CATEGORIES } from '../../utils/riskColors';
import L from 'leaflet';

const RiskLegend = () => {
  const map = useMap();

  React.useEffect(() => {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      let labels = ['<strong>Risk Categories</strong><br>'];

      RISK_CATEGORIES.forEach((category) => {
        labels.push(
          `<div class="legend-item">
            <i class="legend-color" style="background:${category.color}"></i>
            <span>${category.label}</span>
          </div>`
        );
      });
      
      labels.push(
        `<div class="legend-item" style="margin-top:8px;">
          <i class="legend-color" style="background:red; border-radius:50%;"></i>
          <span>Fire Detection</span>
        </div>`
      );

      div.innerHTML = labels.join('');
      return div;
    };

    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [map]);

  return null;
};

export default RiskLegend;
