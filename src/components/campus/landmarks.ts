import type { BuildingId } from '../../data/campus';
import { Kit, corners, eachSide, lancetX, lancetZ } from './kit';
import type { V3 } from './kit';
import { P, STONE_VARIANTS } from './palette';

// Each landmark is modelled facing +z around its own origin, then placed on the 15 × 15 block (north is −z).
const stainedGlass = ['#6F638F', '#56719B', '#85707A'];

function chapel(k: Kit) {
  // Nave, transept and apse run north (−z) from the tower, which faces the chapel quad.
  k.box([1.25, 1.45, 2.9], [0, 0, -2], P.stone);
  k.gable([1.42, 0.78, 3], [0, 1.45, -2], P.roof);
  k.box([2.6, 1.45, 0.95], [0, 0, -2.75], P.stone);
  k.gable([1.1, 0.78, 2.78], [0, 1.45, -2.75], P.roof, Math.PI / 2);
  k.box([0.95, 1.25, 0.75], [0, 0, -3.8], P.stone2);
  k.pyramid([1.05, 0.6, 0.85], [0, 1.25, -3.8], P.roofDark);
  for (const side of [-1, 1]) {
    stainedGlass.forEach((glass, i) => lancetX(k, side * 0.625, 0.45, -0.88 - i * 0.54, [0.16, 0.6], glass));
    for (const z of [-0.62, -1.15, -1.69, -2.22]) {
      k.box([0.15, 1.1, 0.16], [side * 0.69, 0, z], P.stone2);
      k.pyramid([0.17, 0.26, 0.18], [side * 0.69, 1.1, z], P.trim);
    }
    k.disc(0.25, 0.05, 8, [side * 1.3, 0.95, -2.75], stainedGlass[0], Math.PI / 2);
    k.disc(0.12, 0.08, 8, [side * 1.3, 0.95, -2.75], stainedGlass[1], Math.PI / 2);
  }
  // The tower: buttressed shaft, belfry, parapet and a crown of pinnacles.
  k.box([1.1, 3.05, 1.1], [0, 0, 0], P.stone);
  for (const [x, z] of corners(0.56)) k.box([0.2, 3.15, 0.2], [x, 0, z], P.stone2);
  k.box([1.18, 0.09, 1.18], [0, 2.4, 0], P.trim);
  k.box([1.02, 0.95, 1.02], [0, 3.05, 0], P.stone2);
  eachSide(k, 1.02, 1.02, [0, 0, 0], face => { for (const x of [-0.22, 0.22]) lancetZ(k, x, 3.2, face, [0.16, 0.55], P.window); });
  k.box([1.22, 0.12, 1.22], [0, 4, 0], P.trim);
  for (const [x, z] of corners(0.5)) {
    k.box([0.2, 0.5, 0.2], [x, 4.12, z], P.stone);
    k.pyramid([0.24, 0.48, 0.24], [x, 4.62, z], P.trim);
  }
  eachSide(k, 1.22, 1.22, [0, 0, 0], face => {
    k.box([0.12, 0.3, 0.12], [0, 4.12, face - 0.1], P.stone);
    k.pyramid([0.15, 0.3, 0.15], [0, 4.42, face - 0.1], P.trim);
  });
  lancetZ(k, 0, 0, 0.56, [0.44, 0.7], P.door);
  lancetZ(k, 0, 1.1, 0.56, [0.34, 0.85], stainedGlass[1]);
  k.box([0.95, 0.06, 0.32], [0, 0, 0.72], P.trim);
}

function perkins(k: Kit) {
  k.box([2.1, 1.25, 1.1], [0, 0, 0], P.stone);
  k.gable([1.24, 0.55, 2.22], [0, 1.25, 0], P.roof, Math.PI / 2);
  k.box([0.95, 1.12, 1.6], [0.575, 0, -1.35], P.stone2);
  k.gable([1.07, 0.5, 1.64], [0.575, 1.12, -1.35], P.roofDark);
  // Lit reading rooms either side of the tower, stacks behind.
  for (const x of [-0.85, -0.57, 0.57, 0.85]) {
    lancetZ(k, x, 0.36, 0.55, [0.14, 0.42], P.lit);
    k.box([0.14, 0.18, 0.04], [x, 0.95, 0.55], P.window);
  }
  for (const x of [-0.85, -0.45]) lancetZ(k, x, 0.36, -0.55, [0.14, 0.4], P.window);
  for (const z of [-0.85, -1.3, -1.75]) lancetX(k, 1.05, 0.36, z, [0.14, 0.4], P.lit);
  // Entrance tower with battlements.
  k.box([0.62, 2.05, 0.62], [0, 0, 0.62], P.stone);
  k.box([0.7, 0.1, 0.7], [0, 2.05, 0.62], P.trim);
  eachSide(k, 0.7, 0.7, [0, 0, 0.62], face => { for (const x of [-0.24, 0, 0.24]) k.box([0.11, 0.15, 0.11], [x, 2.15, face - 0.055], P.stone); });
  lancetZ(k, 0, 0, 0.93, [0.28, 0.48], P.door);
  lancetZ(k, 0, 0.9, 0.93, [0.18, 0.5], P.window);
  k.box([0.14, 0.18, 0.04], [0, 1.65, 0.93], P.window);
  k.box([0.74, 0.05, 0.25], [0, 0, 1.03], P.trim);
}

function brodhead(k: Kit) {
  // West Union's battlemented Gothic hall...
  k.box([2.2, 1.2, 1.25], [0, 0, 0], P.stone);
  k.gable([1.39, 0.55, 2.32], [0, 1.2, 0], P.roof, Math.PI / 2);
  for (const x of [-0.75, 0.75]) {
    k.box([0.55, 1.3, 0.32], [x, 0, 0.62], P.stone2);
    k.box([0.6, 0.06, 0.36], [x, 1.3, 0.62], P.trim);
    for (const dx of [-0.2, 0, 0.2]) k.box([0.1, 0.12, 0.1], [x + dx, 1.36, 0.75], P.stone2);
    lancetZ(k, x, 0.38, 0.78, [0.16, 0.46], P.lit);
  }
  for (const side of [-1, 1]) for (const z of [-0.3, 0.25]) lancetX(k, side * 1.1, 0.4, z, [0.14, 0.42], P.window);
  // ...with the glass dining hall rising out of it: lit glass, a steel grid, timber fins and a slatted canopy.
  k.box([0.92, 2, 1.15], [0, 0, 0.25], P.glassLit);
  eachSide(k, 0.92, 1.15, [0, 0, 0.25], (face, span) => {
    for (let i = 0; i <= 4; i++) k.box([0.03, 2, 0.03], [-span / 2 + (i * span) / 4, 0, face], P.steel);
    for (const y of [0.5, 1, 1.5]) k.box([span, 0.03, 0.03], [0, y, face], P.steel);
    for (let i = 0; i < 6; i++) k.box([0.035, 0.85, 0.07], [-span / 2 + 0.08 + (i * (span - 0.16)) / 5, 1.12, face + 0.04], P.wood);
  });
  k.box([1.16, 0.05, 1.4], [0, 2, 0.25], P.trim);
  for (let i = 0; i < 9; i++) k.box([0.03, 0.07, 1.4], [-0.52 + i * 0.13, 2.05, 0.25], '#DCC09C');
  // Terrace with bistro tables.
  for (const [x, z] of [[-0.55, 1.15], [0.05, 1.25], [0.6, 1.12]]) {
    k.cylinder(0.012, 0.012, 0.22, 5, [x, 0, z], P.steel);
    k.cylinder(0.08, 0.08, 0.02, 8, [x, 0.22, z], P.steel);
  }
}

function allen(k: Kit) {
  k.box([2.6, 1.2, 0.8], [0, 0, 0], P.stone);
  k.gable([0.92, 0.5, 2.64], [0, 1.2, 0], P.roof, Math.PI / 2);
  for (const x of [-0.9, -0.45, 0, 0.45, 0.9]) k.box([0.13, 0.3, 0.04], [x, 0.32, -0.4], P.window);
  for (const sx of [-1, 1]) {
    k.box([0.55, 1.35, 0.95], [sx * 1.3, 0, 0.05], P.stone2);
    k.gable([0.6, 0.42, 0.97], [sx * 1.3, 1.35, 0.05], P.roofDark);
    lancetZ(k, sx * 1.3, 0.32, 0.525, [0.15, 0.4], P.window);
    k.box([0.15, 0.22, 0.04], [sx * 1.3, 0.98, 0.525], P.window);
    for (const x of [0.62, 0.9]) {
      k.box([0.13, 0.3, 0.04], [sx * x, 0.32, 0.4], P.window);
      k.box([0.13, 0.22, 0.04], [sx * x, 0.82, 0.4], sx > 0 && x < 0.7 ? P.lit : P.window);
    }
  }
  // Central pavilion with battlements, and the flag.
  k.box([0.85, 1.7, 0.5], [0, 0, 0.4], P.stone);
  k.box([0.93, 0.1, 0.58], [0, 1.7, 0.4], P.trim);
  eachSide(k, 0.93, 0.58, [0, 0, 0.4], (face, span) => {
    for (const x of [-span / 2 + 0.07, 0, span / 2 - 0.07]) k.box([0.1, 0.14, 0.1], [x, 1.8, face - 0.05], P.stone);
  });
  lancetZ(k, 0, 0, 0.65, [0.3, 0.5], P.door);
  lancetZ(k, 0, 0.82, 0.65, [0.22, 0.52], P.window);
  k.box([0.7, 0.05, 0.22], [0, 0, 0.76], P.trim);
  k.cylinder(0.014, 0.018, 0.78, 5, [0, 1.8, 0.4], P.trim);
  k.box([0.32, 0.19, 0.02], [0.17, 2.36, 0.4], P.dukeBlue);
}

function few(k: Kit) {
  // Dorm wings around a courtyard that opens east, toward the loop.
  for (const z of [-1, 1]) {
    k.box([2.6, 1.1, 0.65], [0, 0, z], P.stone);
    k.gable([0.77, 0.48, 2.64], [0, 1.1, z], P.roof, Math.PI / 2);
    for (const face of [z - 0.325, z + 0.325]) {
      for (let i = 0; i < 6; i++) {
        const x = -1.05 + i * 0.42;
        k.box([0.12, 0.17, 0.04], [x, 0.28, face], P.window);
        k.box([0.12, 0.17, 0.04], [x, 0.68, face], (i + (z > 0 ? 1 : 0)) % 3 === 0 ? P.lit : P.window);
      }
    }
    for (const x of [-0.75, 0.55]) k.box([0.13, 0.36, 0.13], [x, 1.25, z - 0.12], P.stoneDark);
  }
  k.box([0.65, 1.1, 1.35], [-0.975, 0, 0], P.stone2);
  k.gable([0.77, 0.48, 1.4], [-0.975, 1.1, 0], P.roofDark);
  k.box([0.42, 1.6, 0.42], [-1.08, 0, 0], P.stone);
  k.pyramid([0.5, 0.48, 0.5], [-1.08, 1.6, 0], P.roofDark);
  lancetX(k, -1.29, 0, 0, [0.18, 0.4], P.door);
  k.box([1.95, 0.02, 1.35], [0.325, 0, 0], P.lawn);
  k.cylinder(0.05, 0.066, 0.3, 6, [0.32, 0, 0], P.trunk);
  k.blob(0.31, [0.32, 0.5, 0], P.leaves[1], 0.92);
  k.blob(0.19, [0.45, 0.68, 0.08], P.leaves[0], 0.9);
  for (const z of [-0.42, 0.42]) k.box([0.3, 0.08, 0.09], [0.85, 0, z], P.trunk);
}

function wallaceWade(k: Kit) {
  k.box([1.24, 0.03, 2.5], [0, 0, 0.1], P.track);
  k.box([0.9, 0.04, 2], [0, 0, 0.1], P.field);
  for (const z of [-0.8, 1]) k.box([0.9, 0.045, 0.2], [0, 0, z], P.dukeBlue);
  for (let i = 0; i < 9; i++) k.box([0.9, 0.05, 0.022], [0, 0, -0.7 + i * 0.2], P.line);
  k.slab(0.13, 0.13, 0.055, 10, [0, 0, 0.1], P.dukeBlue);
  // Three tiers of stands down both sides and round the closed (−z) end of the horseshoe.
  ([[0.2, P.seatLight], [0.38, P.seatBlue], [0.56, P.stone]] as const).forEach(([h, seats], tier) => {
    const r = 0.68 + tier * 0.18;
    for (const side of [-1, 1]) k.box([0.18, h, 2.4], [side * r, 0, 0.1], seats);
    for (let j = 0; j < 7; j++) {
      const a = Math.PI + ((j + 0.5) * Math.PI) / 7;
      k.box([(r * Math.PI) / 7 + 0.03, h, 0.18], [Math.cos(a) * r, 0, -1.1 + Math.sin(a) * r], seats, Math.PI / 2 - a);
    }
  });
  // Press box on the west stand, light towers at the corners.
  k.box([0.3, 1.25, 1.5], [-0.98, 0, 0.1], P.stone);
  k.box([0.32, 0.22, 1.52], [-0.98, 0.85, 0.1], P.glassDark);
  k.box([0.36, 0.06, 1.56], [-0.98, 1.25, 0.1], P.trim);
  for (const [x, z] of [[-1.05, -1.6], [1.05, -1.6], [1.05, 1.35], [-1.05, 1.35]]) {
    k.cylinder(0.02, 0.03, 1.45, 5, [x, 0, z], P.trim);
    k.box([0.26, 0.15, 0.06], [x, 1.45, z], P.butter);
  }
}

function gross(k: Kit) {
  k.box([2.2, 1.45, 1.4], [0, 0, 0], P.stone2);
  // Glass curtain wall across the front.
  k.box([1.5, 1.2, 0.05], [0.25, 0.12, 0.7], P.glass);
  for (let i = 0; i <= 5; i++) k.box([0.03, 1.2, 0.07], [-0.5 + i * 0.3, 0.12, 0.7], P.mullion);
  for (const y of [0.52, 0.92]) k.box([1.5, 0.03, 0.07], [0.25, y, 0.7], P.mullion);
  for (const x of [-0.75, -0.25, 0.25, 0.75]) k.box([0.28, 0.16, 0.04], [x, 0.85, -0.7], P.glassDark);
  // Top floor with a ribbon window, plus a green roof.
  k.box([1.3, 0.5, 1.15], [-0.35, 1.45, -0.05], P.stone);
  k.box([1.32, 0.15, 1.17], [-0.35, 1.62, -0.05], P.glassDark);
  k.box([0.8, 0.03, 1.2], [0.65, 1.45, 0], P.lawn);
  for (const [x, z] of [[0.45, -0.3], [0.8, 0.25], [0.6, 0.35]]) k.blob(0.1, [x, 1.53, z], P.leaves[0]);
  k.box([0.3, 0.16, 0.25], [0.8, 1.45, -0.4], P.vent);
  k.box([0.3, 0.55, 0.04], [-0.65, 0, 0.71], P.glassDark);
  k.box([0.62, 0.05, 0.4], [-0.65, 0.6, 0.85], P.trim);
}

export interface Site {
  at: [number, number];
  rot: number;
  build: (k: Kit) => void;
  /** Invisible box that receives hover and clicks, in the landmark's own frame. */
  hit: { center: V3; size: V3 };
  /** Where the speech bubble points (just above the roofline), in the landmark's own frame. */
  anchor: V3;
  /** The building's middle, where the pulsing project dot sits. */
  dot: V3;
}

// Positions follow the real West Campus: chapel at the head of the quad, Perkins and Brodhead on its west
// side, the loop at the south end with Few Quad west of it and Allen east of it. Wallace Wade and Gross
// Hall live off-quad, so they sit on the east edge.
export const sites: Record<BuildingId, Site> = {
  chapel: { at: [0, -2.95], rot: 0, build: chapel, hit: { center: [0, 2.55, -1.65], size: [2.7, 5.1, 5.05] }, anchor: [0, 5.35, 0], dot: [0, 2.6, 0] },
  perkins: { at: [-2.9, -2.3], rot: Math.PI / 2, build: perkins, hit: { center: [0, 1.15, -0.5], size: [2.2, 2.3, 3.3] }, anchor: [0, 2.55, 0.62], dot: [0, 1, 0] },
  brodhead: { at: [-2.9, 0.85], rot: Math.PI / 2, build: brodhead, hit: { center: [0, 1.1, 0.39], size: [2.3, 2.25, 2.1] }, anchor: [0, 2.45, 0.25], dot: [0, 1.3, 0.25] },
  allen: { at: [2.35, 5.1], rot: -Math.PI / 2, build: allen, hit: { center: [0, 1.2, 0.2], size: [3.2, 2.4, 1.4] }, anchor: [0, 2.6, 0.3], dot: [0, 0.95, 0.1] },
  few: { at: [-3.6, 5.1], rot: 0, build: few, hit: { center: [0, 1, 0], size: [2.65, 2.1, 2.7] }, anchor: [-0.4, 2.3, 0], dot: [-0.3, 0.8, 0] },
  'wallace-wade': { at: [6.2, 5.12], rot: 0, build: wallaceWade, hit: { center: [0, 0.7, -0.42], size: [2.3, 1.4, 3.6] }, anchor: [-0.98, 1.55, 0.1], dot: [0, 0.3, 0.1] },
  gross: { at: [6.2, -2.2], rot: -Math.PI / 2, build: gross, hit: { center: [0, 1, 0.18], size: [2.25, 2, 1.8] }, anchor: [0, 2.15, 0], dot: [0, 0.9, 0.1] },
};

export const buildingIds = Object.keys(sites) as BuildingId[];

/** A point in a landmark's own frame, in world coordinates. */
export function toWorld(site: Site, [x, y, z]: V3): V3 {
  const c = Math.cos(site.rot), s = Math.sin(site.rot);
  return [site.at[0] + x * c + z * s, y, site.at[1] - x * s + z * c];
}

export function buildLandmark(id: BuildingId, seed: number) {
  const k = new Kit(STONE_VARIANTS, seed);
  sites[id].build(k);
  return k.merge();
}
