import { ExtrudeGeometry, Path, Shape } from 'three';
import type { BufferGeometry } from 'three';
import type { BuildingId } from '../../data/campus';
import { mulberry32 } from '../../random';
import { Kit, corners, lancetX } from './kit';
import { buildLandmark, buildingIds } from './landmarks';
import { P, STONE_VARIANTS } from './palette';

/** The block is 2 × HALF world units square; north is −z. */
export const HALF = 7.5;
// Soil layers under the lawn, top to bottom: thickness, inset from the edge, colour.
const STRATA = [[0.24, 0, '#A4D596'], [0.3, 0.03, '#F5E9D1'], [0.5, 0.06, '#E8CDA1'], [0.55, 0.1, '#D5AB87'], [0.6, 0.15, '#BE9478']] as const;
export const DEPTH = STRATA.reduce((sum, [h]) => sum + h, 0);

type Rect = [number, number, number, number]; // x0, z0, x1, z1
type Spot = [number, number];

const LOOP: Spot = [0, 5]; // the bus loop at the south end of Abele Quad
const POND: Spot = [6.4, -5.8];
const GAZEBO: Spot = [5.85, -4.1];
const BEDS: Spot[] = [[6.95, -4.15], [5.45, -6.85]];
const BLOSSOMS: Spot[] = [[5.3, -5.2], [7.2, -4.95], [7.15, -6.9], [5.85, -7.1], [7.2, -3.85]];
const TENTS: Spot[] = [[5.75, -0.35], [6.35, -0.25], [6.95, -0.4], [5.8, 0.55], [6.45, 0.65], [7, 1.35], [6.1, 1.6]];

const PLAZAS: Rect[] = [
  [-1.7, -2.4, 1.7, -0.6], // chapel quad
  [-2, -0.3, -1.5, 1.95], // Brodhead terrace
  [5.15, -3.3, 5.4, -1.1], // Gross Hall forecourt
];
const PATHS: Rect[] = [
  [-4.3, -0.6, 4.3, -0.3], // cross walk between the chapel quad and Abele Quad
  [-1.5, -0.3, -1.2, 3.55], [1.2, -0.3, 1.5, 3.55], [-1.5, 3.4, 1.5, 3.55], // walks around Abele Quad
  [-0.18, -0.3, 0.18, 1.7], // spine through the trees
  [-2.35, 4.95, -1.1, 5.25], [1.1, 4.95, 1.5, 5.25], // Few Quad and Allen to the loop
  [2.83, 4.95, 4.3, 5.25], // Allen over to the stadium
  [4.9, -4.4, 5.15, 2.8], // sidewalk past Gross Hall and K-ville
  [5.15, -4.25, 5.5, -3.95], [5.75, -5.15, 6.05, -4.42], // garden walks
];
// Where the tree scatter must not grow: buildings, paths, lawns and roads (with a little margin).
const CLEAR: Rect[] = [
  [-1.6, -7.3, 1.6, -2.1], [-1.9, -2.5, 1.9, -0.2], [-4.4, -0.7, 4.4, -0.2], [-1.6, -0.3, 1.6, 3.6],
  [-3.7, -3.55, -1.6, -1.05], [-5.25, -3.55, -3.3, -2.2], [-6.6, -5.8, -4.2, -3.4], [-3.7, -0.4, -1.45, 2.1],
  [-6.6, -0.5, -4, 2.2], [-5.1, 3.6, -2.1, 6.6], [-2.45, 4.8, -1, 5.4], [-1.35, 3.35, 1.35, 6.65],
  [-0.45, 6.3, 0.45, 7.6], [1.3, 3.35, 3, 6.85], [2.8, 4.8, 4.4, 5.4], [1.45, -0.35, 2.75, 3.15],
  [1.65, -4.6, 2.95, -0.75], [4.1, -7.6, 5.3, 7.6], [4.95, 2.7, 7.45, 6.65], [5.1, -3.5, 7.15, -0.9],
  [5.3, -0.85, 7.4, 2.6], [5.35, -6.6, 7.4, -5], [5.35, -4.6, 6.35, -3.6], [5.5, -5.2, 6.15, -4.3],
  [6.6, -4.4, 7.3, -3.9], [5.1, -7.1, 5.8, -6.6],
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
  for (const lawn of [[-1.35, -1.95, -0.3, -0.85], [0.3, -1.95, 1.35, -0.85]] as Rect[]) flat(k, lawn, 0.026, P.lawn);
  flat(k, [-1.2, -0.3, 1.2, 3.4], 0.014, P.lawn);
  for (const path of PATHS) flat(k, path, 0.024, P.path);
  strip(k, [-1.2, 1.7], [1.2, 3.4], 0.28, 0.024, P.path);
  strip(k, [1.2, 1.7], [-1.2, 3.4], 0.28, 0.024, P.path);
  // The loop at the south end, its lawn, and Chapel Drive running off the block.
  k.add(oval(1.15, 1.5, 0.012, [0.73, 1.08]), P.road, [LOOP[0], 0, LOOP[1]]);
  k.add(oval(0.73, 1.08, 0.014), P.lawn, [LOOP[0], 0, LOOP[1]]);
  flat(k, [-0.12, 4.05, 0.12, 5.95], 0.02, P.path);
  flat(k, [-0.25, 6.45, 0.25, HALF], 0.012, P.road);
  // Science Drive along the east edge, with its markings and two zebra crossings.
  flat(k, [4.3, -HALF, 4.9, HALF], 0.012, P.road);
  const crossings = [-0.6, 4.95];
  for (let z = -7.2; z < 7.2; z += 0.55) if (crossings.every(c => z + 0.25 < c || z > c + 0.35)) flat(k, [4.58, z, 4.62, z + 0.25], 0.022, P.line);
  for (const c of crossings) for (let i = 0; i < 5; i++) flat(k, [4.34 + i * 0.115, c, 4.4 + i * 0.115, c + 0.3], 0.022, P.line);
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

/** Flat-roofed stone block with ribbon windows (the Bryan Center, Bostock Library). */
function block(k: Kit, [x0, z0, x1, z1]: Rect, h: number) {
  const x = (x0 + x1) / 2, z = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  k.box([w, h, d], [x, 0, z], P.stone2);
  for (const y of [0.3, 0.75].filter(y => y + 0.2 < h)) k.box([w + 0.02, 0.18, d + 0.02], [x, y, z], P.glassDark);
  k.box([w + 0.06, 0.06, d + 0.06], [x, h, z], P.trim);
  k.box([w * 0.55, 0.4, d * 0.55], [x, h, z], P.stone);
  k.box([w * 0.55 + 0.02, 0.16, d * 0.55 + 0.02], [x, h + 0.13, z], P.glassDark);
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
  hall(k, 2.075, -0.2, 3, -1); // Old Chemistry, east of Abele Quad
  hall(k, 2.3, -4.4, -0.95, -1); // Divinity School, east of the chapel quad
  block(k, [-6.4, -0.3, -4.2, 2], 1.0); // Bryan Center, behind Brodhead
  block(k, [-6.4, -5.6, -4.4, -3.6], 1.2); // Bostock Library, behind Perkins
  for (const z of [-0.1, 1.2, 2.5]) for (const x of [-1.35, 1.35]) {
    k.cylinder(0.012, 0.016, 0.42, 5, [x, 0, z], P.trim);
    k.blob(0.05, [x, 0.45, z], P.lit);
  }
  // C1 bus on the loop and traffic on Science Drive, keeping right.
  bus(k, -0.94, LOOP[1], -Math.PI / 2);
  car(k, 4.75, -1.6, Math.PI / 2, P.pink);
  car(k, 4.45, 2.1, -Math.PI / 2, P.butter);
  car(k, 4.45, 6.4, -Math.PI / 2, P.mint);
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
  for (const x of [-0.65, 0.65]) for (const z of [0.05, 0.55, 1.05, 1.5]) tree(k, x, z, 'round', 0.8, rand); // north half of Abele Quad
  for (const x of [-0.62, 0.62]) for (const z of [6.75, 7.25]) tree(k, x, z, 'round', 0.7, rand); // Chapel Drive
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
