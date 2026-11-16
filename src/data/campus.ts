// Landmarks on the 3D campus map. A project appears on the map by naming one of these as its `building`.
export const campusBuildings = {
  chapel: 'Duke Chapel',
  perkins: 'Perkins Library',
  brodhead: 'Brodhead Center (WU)',
  allen: 'Allen Building',
  few: 'Few Quad',
  'wallace-wade': 'Wallace Wade Stadium',
  gross: 'Gross Hall',
  cameron: 'Cameron Indoor Stadium',
  wilkinson: 'Wilkinson Building',
  medicine: 'School of Medicine',
} as const;

export type BuildingId = keyof typeof campusBuildings;
