// Toy-diorama palette: Duke stone (gray with a reddish cast) and slate roofs on a pastel landscape.
export const P = {
  stone: '#A9A6A3', stone2: '#9B9895', stoneDark: '#83807D', trim: '#CFCBC6', modern: '#C2BFBC',
  roof: '#676E7A', roofDark: '#5A606C',
  window: '#434957', lit: '#F3D69A', glass: '#B9D6E2', glassDark: '#7FA6BC', mullion: '#FFFFFF', door: '#5E4C45',
  glassLit: '#F2CF8C', steel: '#3D424A', wood: '#C48A58',
  pink: '#F5B4C5', sky: '#A9D3F3', butter: '#FBE29B', lilac: '#C9B8EA', mint: '#BFE8CF', peach: '#F6CFB6',
  dukeBlue: '#4F69BE', tire: '#5E5D6E', vent: '#9C9DA6',
  lawn: '#BDE5AA', path: '#F7EDD9', plaza: '#E9E1D3', road: '#C9C5D2', line: '#FFFFFF', bed: '#C9A183',
  trunk: '#B48E70', water: '#AFDAEE', lily: '#8FCB8B',
  track: '#D9A08C', field: '#97D490', seatLight: '#E3E5EC', seatBlue: '#7088C6',
  leaves: ['#8FCB8B', '#9DD69A', '#84C48C', '#A9DBA0'],
  pines: ['#74B790', '#83C29C'],
  blossoms: ['#F7BED0', '#FAD3DF', '#F4AFC4'],
} as const;

// Duke's Hillsborough bluestone shifts between grays, rusts and browns, so each stone part picks a shade.
export const STONE_VARIANTS: Record<string, readonly string[]> = {
  [P.stone]: ['#AAA7A4', '#A5A3A1', '#AEAAA6', '#A8A4A1'],
  [P.stone2]: ['#9C9996', '#989593', '#A09B98', '#9A9693'],
};
