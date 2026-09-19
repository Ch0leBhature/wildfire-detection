export const RISK_CATEGORIES = [
  { label: 'Low', color: '#22c55e', min: 0, max: 0.3 },
  { label: 'Moderate', color: '#f59e0b', min: 0.3, max: 0.6 },
  { label: 'High', color: '#f97316', min: 0.6, max: 0.8 },
  { label: 'Very High', color: '#ef4444', min: 0.8, max: 1.0 }
];

export const getRiskColor = (probability) => {
  if (probability >= 0.8) return '#ef4444';
  if (probability >= 0.6) return '#f97316';
  if (probability >= 0.3) return '#f59e0b';
  return '#22c55e';
};

export const getRiskCategory = (probability) => {
  if (probability >= 0.8) return 'Very High';
  if (probability >= 0.6) return 'High';
  if (probability >= 0.3) return 'Moderate';
  return 'Low';
};

export const getRiskOpacity = (probability) => {
  // Map probability 0-1 to opacity 0.3-0.7
  return 0.3 + (probability * 0.4);
};
