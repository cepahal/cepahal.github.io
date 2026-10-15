import { ExtrudeGeometry, Path, Shape } from 'three';
import type { BufferGeometry } from 'three';
import type { BuildingId } from '../../data/campus';
import { mulberry32 } from '../../random';
import { Kit, corners, lancetX } from './kit';
import { buildLandmark, buildingIds, dormWing } from './landmarks';
import { P, STONE_VARIANTS } from './palette';

/** The block is 2 × HALF world units square; north is −z. */
export const HALF = 7.5;
// Soil layers under the lawn, top to bottom: thickness, inset from the edge, colour.
const STRATA = [[0.24, 0, '#A4D596'], [0.3, 0.03, '#F5E9D1'], [0.5, 0.06, '#E8CDA1'], [0.55, 0.1, '#D5AB87'], [0.6, 0.15, '#BE9478']] as const;
export const DEPTH = STRATA.reduce((sum, [h]) => sum + h, 0);

type Rect = [number, number, number, number]; // x0, z0, x1, z1
type Spot = [number, number];

// The quad runs north–south down the middle, between a west hall (x ≈ −2.2) and an east hall (x ≈ 2.95).
const QX = 0.375; // its centre line, where the chapel tower and the loop sit
const LOOP: Spot = [QX, 5.75]; // the bus loop at the south end, between Few Quad and Allen
const POND: Spot = [5.7, -5.6];
const GAZEBO: Spot = [5.0, -3.35];
const BEDS: Spot[] = [[6.7, -3.2], [4.5, -6.7]];
const BLOSSOMS: Spot[] = [[4.3, -4.8], [6.95, -4.6], [7.0, -6.8], [5.5, -7.05], [6.9, -2.3], [4.2, -2.4]];
const TENTS: Spot[] = [[-6.9, -2.3], [-6.3, -2.2], [-5.7, -2.35], [-6.85, -1.5], [-6.2, -1.4], [-5.6, -1.55], [-6.6, -0.65], [-5.9, -0.6]];
// A second dorm quad sharing Few Quad's west wing (Few's gate arch leads between their courtyards).
const DORM: Rect = [-6.55, 4.675, -3.93, 7.325];

const PLAZAS: Rect[] = [
  [-1.7, -1.75, 2.45, -0.45], // chapel quad, in front of the tower
  [-5.3, -5.35, -3.5, -5.05], // Gross Hall forecourt
  [-4.95, -1.65, -4.55, 0.15], // Brodhead's terrace side, facing west
];
const PATHS: Rect[] = [
  [QX - 0.175, -1.6, QX + 0.175, -0.45], // tower steps to the cross walk
  [-1.725, -0.45, 2.475, -0.15], // cross walk between the chapel quad and Abele Quad
  [-1.725, -0.15, -1.45, 4.55], [2.2, -0.15, 2.475, 4.55], [-1.725, 4.3, 2.475, 4.55], // walks around Abele Quad
  [QX - 0.175, -0.15, QX + 0.175, 2.0], // spine through the trees
  [2.75, 4.55, 2.95, 5.45], // down to Allen's door
  [-5.6, 5.88, -0.475, 6.12], // the dorm quad, through Few's archway and courtyard, to the loop
  [2.475, 2.4, 6.3, 2.65], // over to Perkins, past the L
  [-4.85, -3.1, -1.0, -2.85], [-1.3, -2.85, -1.0, -1.75], [-4.85, -2.85, -4.6, -1.65], // Brodhead round to the chapel
  [-4.55, -5.05, -4.25, -3.1], // Gross Hall down to that walk
  [3.5, -3.5, 4.65, -3.2], // into Duke Gardens
];
// Where the tree scatter must not grow: buildings, paths, lawns and roads (with a little margin).
const CLEAR: Rect[] = [
  [-1.1, -6.75, 1.85, -1.45], [-1.85, -1.9, 2.6, HALF], // chapel; the quads, walks, loop and drive
  [-2.8, -2.85, -1.6, 1.95], [2.35, -2.85, 3.55, 1.95], [2.9, 0.6, 4.85, 1.85], [4.4, 5.65, HALF, 7.0], // the halls
  [-5.05, -2.0, -2.6, 0.5], [-5.0, -3.25, -0.9, -2.7], [-4.7, -5.1, -4.1, -3.0], [-5.65, -7.2, -3.15, -4.95], // Brodhead, Gross
  [-7.6, 0.2, -5.0, 4.15], [-7.4, -2.65, -5.15, -0.3], // Wallace Wade, K-ville
  [-6.7, 4.5, -1.2, 7.45], [-1.6, 5.75, -0.4, 6.25], [1.15, 5.3, 4.6, 6.9], [2.6, 4.4, 3.1, 5.5], // the dorm quads, Allen
  [4.95, -1.05, 7.35, 2.55], [2.3, 2.25, 6.45, 2.8], // Perkins and its walk
  [4.75, -6.45, 6.65, -4.75], [4.5, -3.9, 5.5, -2.85], [4.9, -5.0, 5.8, -3.7], [3.4, -3.65, 4.75, -3.05], // the gardens
  [6.35, -3.45, 7.05, -2.95], [4.15, -6.95, 4.85, -6.45],
  ...BLOSSOMS.map(([x, z]): Rect => [x - 0.3, z - 0.3, x + 0.3, z + 0.3]),
];

const flat = (k: Kit, [x0, z0, x1, z1]: Rect, h: number, color: string) => k.box([x1 - x0, h, z1 - z0], [(x0 + x1) / 2, 0, (z0 + z1) / 2], color);
const inside = ([x0, z0, x1, z1]: Rect, x: number, z: number) => x > x0 && x < x1 && z > z0 && z < z1;
const pick = <T>(list: readonly T[], rand: () => number) => list[Math.floor(rand() * list.length)];

/** A straight path between two points, for the diagonals. */
function strip(k: Kit, [x0, z0]: Spot, [x1, z1]: Spot, width: number, h: number, color: string) {
  k.box([Math.hypot(x1 - x0, z1 - z0), h, width], [(x0 + x1) / 2, 0, (z0 + z1) / 2], color, Math.atan2(-(z1 - z0), x1 - x0));
}

/** Pill-shaped outline (long axis along z), used for the loop road and its lawn. */
function pill<T extends Path>(target: T, halfW: number, halfL: number) {
  target.absarc(0, halfL - halfW, halfW, 0, Math.PI, false);
  target.absarc(0, halfW - halfL, halfW, Math.PI, 2 * Math.PI, false);
  return target;
}
function oval(halfW: number, halfL: number, h: number, hole?: [number, number]) {
  const shape = pill(new Shape(), halfW, halfL);
  if (hole) shape.holes.push(pill(new Path(), ...hole));
  return new ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 10 }).rotateX(-Math.PI / 2);
}

function ground() {
  const k = new Kit();
  let top = 0;
  for (const [h, inset, color] of STRATA) {
    k.box([2 * (HALF - inset), h, 2 * (HALF - inset)], [0, top - h, 0], color);
    top -= h;
  }
  return k.merge();
}

function decals() {
  const k = new Kit();
  for (const plaza of PLAZAS) flat(k, plaza, 0.02, P.plaza);
  for (const lawn of [[-1.35, -1.45, -0.05, -0.75], [0.8, -1.45, 2.1, -0.75]] as Rect[]) flat(k, lawn, 0.026, P.lawn);
  flat(k, [-1.45, -0.15, 2.2, 4.3], 0.014, P.lawn); // Abele Quad: trees in the north half, crossing paths in the south
  flat(k, [DORM[0] + 0.65, DORM[1] + 0.65, DORM[2], DORM[3] - 0.65], 0.016, P.lawn); // the dorm quad's courtyard
  for (const path of PATHS) flat(k, path, 0.024, P.path);
  strip(k, [-1.45, 2.0], [2.2, 4.3], 0.28, 0.024, P.path);
  strip(k, [2.2, 2.0], [-1.45, 4.3], 0.28, 0.024, P.path);
  strip(k, [5.1, -3.75], [5.6, -4.95], 0.26, 0.024, P.path); // gazebo to the pond
  // The loop between Few Quad and Allen, its lawn, and Chapel Drive running off the south edge.
  k.add(oval(0.85, 1.15, 0.012, [0.48, 0.78]), P.road, [LOOP[0], 0, LOOP[1]]);
  k.add(oval(0.48, 0.78, 0.014), P.lawn, [LOOP[0], 0, LOOP[1]]);
  flat(k, [QX - 0.25, LOOP[1] + 1.1, QX + 0.25, HALF], 0.012, P.road);
  k.slab(0.9, 0.7, 0.02, 9, [POND[0], 0, POND[1]], P.plaza);
  k.slab(0.8, 0.6, 0.03, 9, [POND[0], 0, POND[1]], P.water);
  return k.merge();
}

/** Gothic hall; `facing` is the side its arcade looks onto (+1 east, −1 west). */
function hall(k: Kit, x: number, z0: number, z1: number, facing: 1 | -1) {
  const length = z1 - z0, z = (z0 + z1) / 2, front = x + facing * 0.475, back = x - facing * 0.475, bays = Math.round(length / 0.3);
  k.box([0.95, 1.05, length], [x, 0, z], P.stone2);
  k.gable([1.07, 0.45, length + 0.04], [x, 1.05, z], P.roof);
  for (let i = 0; i < bays; i++) {
    const at = z0 + ((i + 0.5) * length) / bays;
    lancetX(k, front, 0, at, [0.16, 0.3], P.window);
    k.box([0.04, 0.2, 0.12], [front, 0.62, at], i % 4 === 1 ? P.lit : P.window);
    if (i % 2 === 0) k.box([0.04, 0.2, 0.12], [back, 0.55, at], P.window);
  }
  k.box([0.12, 0.36, 0.12], [x - facing * 0.2, 1.2, z0 + length * 0.3], P.stoneDark);
}

/** The same hall running east–west, centred on (x, z); `facing` +1 puts the arcade on the north side, −1 the south. */
function hallAcross(k: Kit, x: number, z: number, length: number, facing: 1 | -1) {
  k.push([x, 0, z], Math.PI / 2);
  hall(k, 0, -length / 2, length / 2, facing);
  k.pop();
}

function bus(k: Kit, x: number, z: number, rot: number) {
  k.push([x, 0, z], rot);
  k.box([0.95, 0.3, 0.34], [0, 0.07, 0], P.dukeBlue);
  k.box([0.97, 0.1, 0.36], [0, 0.22, 0], P.glass);
  k.box([0.95, 0.04, 0.34], [0, 0.37, 0], P.seatLight);
  for (const [wx, wz] of corners(0.3, 0.17)) k.disc(0.065, 0.05, 8, [wx, 0.065, wz], P.tire);
  k.pop();
}

function car(k: Kit, x: number, z: number, rot: number, paint: string) {
  k.push([x, 0, z], rot);
  k.box([0.42, 0.12, 0.22], [0, 0.05, 0], paint);
  k.box([0.24, 0.1, 0.2], [-0.03, 0.17, 0], P.glass);
  k.box([0.25, 0.025, 0.21], [-0.03, 0.27, 0], paint);
  for (const [wx, wz] of corners(0.13, 0.11)) k.disc(0.045, 0.04, 8, [wx, 0.045, wz], P.tire);
  k.pop();
}

function props() {
  const k = new Kit(STONE_VARIANTS, 7);
  // The halls lining the quad (the east one turns into an L at its south end), and one beside Allen.
  hall(k, -2.2, -2.7, 1.8, 1);
  hall(k, 2.95, -2.7, 1.8, -1);
  hallAcross(k, 3.85, 1.23, 1.7, -1);
  hallAcross(k, 5.95, 6.325, 2.8, 1);
  // The dorm quad west of Few: north and south ranges running on from Few's, closed by a west wing.
  const [dx0, dz0, dx1, dz1] = DORM, dormX = (dx0 + dx1) / 2;
  dormWing(k, dormX, dz0 + 0.325, dx1 - dx0, 2);
  dormWing(k, dormX, dz1 - 0.325, dx1 - dx0, 0);
  k.box([0.65, 1.1, dz1 - dz0 - 1.3], [dx0 + 0.325, 0, (dz0 + dz1) / 2], P.stone2);
  k.gable([0.77, 0.48, dz1 - dz0 - 1.26], [dx0 + 0.325, 1.1, (dz0 + dz1) / 2], P.roofDark);
  for (const z of [5.7, 6.3]) lancetX(k, dx0 + 0.66, 0.3, z, [0.14, 0.32], P.window);
  for (const z of [0.3, 1.5, 2.7, 3.9]) for (const x of [-1.3, 2.05]) {
    k.cylinder(0.012, 0.016, 0.42, 5, [x, 0, z], P.trim);
    k.blob(0.05, [x, 0.45, z], P.lit);
  }
  // C1 bus on the loop, and a car heading out down Chapel Drive.
  bus(k, LOOP[0] - 0.665, LOOP[1], -Math.PI / 2);
  car(k, QX, 7.2, Math.PI / 2, P.pink);
  // Duke Gardens: gazebo, lily pads and flower beds.
  const [gx, gz] = GAZEBO;
  k.slab(0.36, 0.36, 0.05, 6, [gx, 0, gz], P.trim);
  for (let i = 0; i < 6; i++) k.cylinder(0.02, 0.02, 0.42, 5, [gx + Math.cos((i * Math.PI) / 3) * 0.29, 0.05, gz + Math.sin((i * Math.PI) / 3) * 0.29], P.trim);
  k.cylinder(0, 0.46, 0.3, 6, [gx, 0.47, gz], P.lilac);
  k.blob(0.04, [gx, 0.8, gz], P.butter);
  for (const [dx, dz] of [[0.3, 0.15], [-0.35, -0.2], [0.05, -0.3]]) k.slab(0.09, 0.09, 0.035, 6, [POND[0] + dx, 0, POND[1] + dz], P.lily);
  k.blob(0.035, [POND[0] + 0.3, 0.06, POND[1] + 0.15], P.pink);
  BEDS.forEach(([x, z], bed) => {
    k.box([0.55, 0.05, 0.24], [x, 0, z], P.bed);
    for (let i = 0; i < 5; i++) k.blob(0.045, [x - 0.2 + i * 0.1, 0.09, z + (i % 2 ? 0.05 : -0.05)], [P.pink, P.butter, P.lilac][(i + bed) % 3]);
  });
  // K-ville: the tents students camp in for basketball tickets.
  TENTS.forEach(([x, z], i) => k.pyramid([0.36, 0.28, 0.42], [x, 0, z], [P.pink, P.butter, P.mint, P.sky, P.lilac, P.peach][i % 6], (i % 3) * 0.35 - 0.3));
  return k.merge();
}

type TreeKind = 'round' | 'pine' | 'bush' | 'blossom';

function tree(k: Kit, x: number, z: number, kind: TreeKind, s: number, rand: () => number) {
  const turn = rand() * Math.PI;
  if (kind === 'bush') {
    k.blob(0.16 * s, [x, 0.1 * s, z], pick(P.leaves, rand), 0.8, turn);
  } else if (kind === 'pine') {
    k.cylinder(0.04 * s, 0.05 * s, 0.18 * s, 5, [x, 0, z], P.trunk);
    k.cylinder(0, 0.27 * s, 0.42 * s, 7, [x, 0.14 * s, z], pick(P.pines, rand), turn);
    k.cylinder(0, 0.2 * s, 0.36 * s, 7, [x, 0.38 * s, z], pick(P.pines, rand), turn + 0.4);
  } else {
    const crowns = kind === 'blossom' ? P.blossoms : P.leaves;
    k.cylinder(0.045 * s, 0.06 * s, 0.3 * s, 6, [x, 0, z], P.trunk);
    k.blob(0.27 * s, [x, 0.46 * s, z], pick(crowns, rand), 0.92, turn);
    if (rand() < 0.35) k.blob(0.17 * s, [x + 0.12 * s, 0.63 * s, z + 0.05 * s], pick(crowns, rand), 0.9, turn);
  }
}

function trees() {
  const k = new Kit(), rand = mulberry32(2024);
  for (const x of [QX - 1.2, QX + 1.2]) for (const z of [0.15, 0.65, 1.15, 1.6]) tree(k, x, z, 'round', 0.8, rand); // north half of Abele Quad
  for (const [x, z] of [[-5.3, 5.55], [-4.55, 6.45]]) tree(k, x, z, 'round', 0.75, rand); // the dorm quad's courtyard
  for (const [x, z] of BLOSSOMS) tree(k, x, z, 'blossom', 0.85, rand);
  // Duke Forest everywhere else.
  for (let gx = -7.2; gx <= 7.2; gx += 0.46) {
    for (let gz = -7.2; gz <= 7.2; gz += 0.46) {
      const x = gx + (rand() - 0.5) * 0.3, z = gz + (rand() - 0.5) * 0.3;
      if (rand() < 0.22 || Math.abs(x) > 7.25 || Math.abs(z) > 7.25 || CLEAR.some(rect => inside(rect, x, z))) continue;
      const roll = rand();
      tree(k, x, z, roll < 0.3 ? 'pine' : roll < 0.42 ? 'bush' : 'round', 0.78 + rand() * 0.38, rand);
    }
  }
  return k.merge();
}

export function buildCampus() {
  return {
    ground: ground(),
    decals: decals(),
    props: props(),
    trees: trees(),
    landmarks: Object.fromEntries(buildingIds.map((id, i) => [id, buildLandmark(id, 11 + i)])) as Record<BuildingId, BufferGeometry>,
  };
}
