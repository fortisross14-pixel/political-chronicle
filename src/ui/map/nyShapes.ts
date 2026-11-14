// Schematic (not to scale) shapes for New York's 4 POC regions. viewBox 0 0 480 320.
// NYC is drawn larger than life so it stays clickable — it is 43% of the state.

export interface RegionShape {
  /** One or more polygons, as SVG `points` strings. */
  polygons: string[];
  label: { x: number; y: number };
  /** Seat-city marker. */
  city: { x: number; y: number };
}

export const NY_VIEWBOX = '0 0 480 320';

export const NY_SHAPES: Record<string, RegionShape> = {
  'ny-wny': {
    polygons: ['30,240 48,205 60,170 58,140 100,135 132,133 132,236'],
    label: { x: 82, y: 205 },
    city: { x: 62, y: 178 },
  },
  'ny-north': {
    polygons: ['132,133 180,130 240,124 268,92 298,52 330,26 400,20 405,60 410,120 406,190 330,190 330,236 132,236'],
    label: { x: 250, y: 172 },
    city: { x: 262, y: 104 },
  },
  'ny-suburbs': {
    polygons: ['330,190 406,190 410,250 394,262 372,262 358,258 344,248 330,236', '400,268 470,246 476,256 414,286 400,286'],
    label: { x: 372, y: 222 },
    city: { x: 388, y: 248 },
  },
  'ny-nyc': {
    polygons: ['358,258 372,262 394,262 400,268 400,286 392,298 372,304 352,296 350,276'],
    label: { x: 377, y: 292 },
    city: { x: 372, y: 271 },
  },
};
