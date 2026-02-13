// 80 distinct colors matching Polychrome P80 output from the R app
// Generated to be maximally distinguishable
export const P80: string[] = [
  '#E31A1C', '#1F78B4', '#33A02C', '#FF7F00', '#6A3D9A',
  '#B15928', '#A6CEE3', '#B2DF8A', '#FB9A99', '#FDBF6F',
  '#CAB2D6', '#FFFF99', '#8DD3C7', '#FFFFB3', '#BEBADA',
  '#FB8072', '#80B1D3', '#FDB462', '#B3DE69', '#FCCDE5',
  '#D9D9D9', '#BC80BD', '#CCEBC5', '#FFED6F', '#E41A1C',
  '#377EB8', '#4DAF4A', '#984EA3', '#FF7F00', '#FFFF33',
  '#A65628', '#F781BF', '#999999', '#66C2A5', '#FC8D62',
  '#8DA0CB', '#E78AC3', '#A6D854', '#FFD92F', '#E5C494',
  '#B3B3B3', '#1B9E77', '#D95F02', '#7570B3', '#E7298A',
  '#66A61E', '#E6AB02', '#A6761D', '#666666', '#7FC97F',
  '#BEAED4', '#FDC086', '#FFFF99', '#386CB0', '#F0027F',
  '#BF5B17', '#1A1A1A', '#FDAE61', '#ABD9E9', '#2B83BA',
  '#D7191C', '#018571', '#DFC27D', '#80CDC1', '#A6611A',
  '#543005', '#8C510A', '#BF812D', '#35978F', '#01665E',
  '#003C30', '#F6E8C3', '#C7EAE5', '#5AB4AC', '#D8B365',
  '#74ADD1', '#4575B4', '#313695', '#FEE090', '#FDAE61',
];

export function getColorForIndex(index: number): string {
  return P80[index % P80.length];
}

export function getColorsForGroups(groups: string[]): Record<string, string> {
  const colors: Record<string, string> = {};
  groups.forEach((group, i) => {
    colors[group] = P80[i % P80.length];
  });
  return colors;
}

// Map-specific palettes
export const YLOR_RD = ['#FFFFCC', '#FFEDA0', '#FED976', '#FEB24C', '#FD8D3C', '#FC4E2A', '#E31A1C', '#BD0026', '#800026'];
export const RD_YL_BU = ['#D73027', '#F46D43', '#FDAE61', '#FEE090', '#FFFFBF', '#E0F3F8', '#ABD9E9', '#74ADD1', '#4575B4'];

export function interpolateColor(value: number, min: number, max: number, palette: string[]): string {
  if (max === min) return palette[Math.floor(palette.length / 2)];
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const index = Math.min(Math.floor(ratio * (palette.length - 1)), palette.length - 2);
  return palette[index];
}
