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
  // (Half again as wide as the other halls, like the real building, which is mostly glass across its front.)
  k.box([3.3, 1.2, 1.25], [0, 0, 0], P.stone);
  k.gable([1.39, 0.55, 3.42], [0, 1.2, 0], P.roof, Math.PI / 2);
  for (const x of [-1.32, 1.32]) {
    k.box([0.55, 1.3, 0.32], [x, 0, 0.62], P.stone2);
    k.box([0.6, 0.06, 0.36], [x, 1.3, 0.62], P.trim);
    for (const dx of [-0.2, 0, 0.2]) k.box([0.1, 0.12, 0.1], [x + dx, 1.36, 0.75], P.stone2);
    lancetZ(k, x, 0.38, 0.78, [0.16, 0.46], P.lit);
  }
  for (const side of [-1, 1]) for (const z of [-0.3, 0.25]) lancetX(k, side * 1.65, 0.4, z, [0.14, 0.42], P.window);
  // ...with the glass dining hall rising out of it: lit glass, a steel grid, timber fins and a slatted canopy.
  k.box([1.9, 2, 1.15], [0, 0, 0.25], P.glassLit);
  eachSide(k, 1.9, 1.15, [0, 0, 0.25], (face, span) => {
    const bays = Math.max(4, Math.round(span / 0.23)), fins = Math.max(6, Math.round(span / 0.16));
    for (let i = 0; i <= bays; i++) k.box([0.03, 2, 0.03], [-span / 2 + (i * span) / bays, 0, face], P.steel);
    for (const y of [0.5, 1, 1.5]) k.box([span, 0.03, 0.03], [0, y, face], P.steel);
    for (let i = 0; i < fins; i++) k.box([0.035, 0.85, 0.07], [-span / 2 + 0.08 + (i * (span - 0.16)) / (fins - 1), 1.12, face + 0.04], P.wood);
  });
  k.box([2.14, 0.05, 1.4], [0, 2, 0.25], P.trim);
  for (let i = 0; i < 16; i++) k.box([0.03, 0.07, 1.4], [-0.98 + i * 0.13, 2.05, 0.25], '#DCC09C');
  // Terrace with bistro tables.
  for (const [x, z] of [[-1.05, 1.15], [-0.4, 1.25], [0.25, 1.12], [0.9, 1.22]]) {
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

/** A dorm range running along x: stone block, gable roof, two storeys of windows on both long sides, chimneys. */
export function dormWing(k: Kit, x: number, z: number, length: number, litOffset = 0) {
  k.box([length, 1.1, 0.65], [x, 0, z], P.stone);
  k.gable([0.77, 0.48, length + 0.04], [x, 1.1, z], P.roof, Math.PI / 2);
  const count = Math.round(length / 0.42);
  for (const face of [z - 0.325, z + 0.325]) {
    for (let i = 0; i < count; i++) {
      const wx = x - length / 2 + ((i + 0.5) * length) / count;
      k.box([0.12, 0.17, 0.04], [wx, 0.28, face], P.window);
      k.box([0.12, 0.17, 0.04], [wx, 0.68, face], (i + litOffset) % 3 === 0 ? P.lit : P.window);
    }
  }
  for (const cx of [x - length * 0.29, x + length * 0.21]) k.box([0.13, 0.36, 0.13], [cx, 1.25, z - 0.12], P.stoneDark);
}

function few(k: Kit) {
  // Dorm wings around a courtyard that opens east, toward the loop.
  for (const z of [-1, 1]) dormWing(k, 0, z, 2.6, z > 0 ? 1 : 0);
  // The west wing, shared with the neighbouring quad, has a gate tower with an open archway through its middle.
  for (const z of [-0.4375, 0.4375]) k.box([0.65, 1.1, 0.475], [-0.975, 0, z], P.stone2);
  k.box([0.65, 0.4, 0.4], [-0.975, 0.7, 0], P.stone2);
  k.gable([0.77, 0.48, 1.4], [-0.975, 1.1, 0], P.roofDark);
  for (const z of [-0.26, 0.26]) k.box([0.48, 1.6, 0.12], [-1.06, 0, z], P.stone);
  k.box([0.48, 0.9, 0.64], [-1.06, 0.7, 0], P.stone);
  k.pyramid([0.6, 0.5, 0.72], [-1.06, 1.6, 0], P.roofDark);
  for (const face of [-1.31, -0.64]) {
    for (const z of [-0.2, 0.2]) k.box([0.05, 0.7, 0.04], [face, 0, z], P.trim);
    k.pyramid([0.05, 0.2, 0.46], [face, 0.68, 0], P.trim); // pointed hood over the arch
  }
  k.box([1.95, 0.02, 1.35], [0.325, 0, 0], P.lawn);
  k.cylinder(0.05, 0.066, 0.3, 6, [0.32, 0, 0.38], P.trunk);
  k.blob(0.31, [0.32, 0.5, 0.38], P.leaves[1], 0.92);
  k.blob(0.19, [0.45, 0.68, 0.46], P.leaves[0], 0.9);
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
    // Stippling: two rows of seat dots along each tier's top, in a mix of seat colours.
    const dots = [P.seatBlue, P.seatLight, P.line, P.dukeBlue];
    for (const row of [-0.045, 0.045]) {
      const rr = r + row;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 26; i++) {
          if (side < 0 && tier === 2 && Math.abs(-1.1 + i * 0.088 + 0.1) < 0.82) continue; // under the suites
          k.box([0.035, 0.02, 0.035], [side * rr, h, -1.0 + i * 0.088], dots[(i * 3 + tier + (row > 0 ? 1 : 0)) % dots.length]);
        }
      }
      const n = Math.round((rr * Math.PI) / 0.088);
      for (let i = 0; i < n; i++) {
        const a = Math.PI + ((i + 0.5) * Math.PI) / n;
        k.box([0.035, 0.02, 0.035], [Math.cos(a) * rr, h, -1.1 + Math.sin(a) * rr], dots[(i * 3 + tier + (row > 0 ? 1 : 0)) % dots.length]);
      }
    }
  });
  // The suite side (west): two decks of glass boxes stacked over the stand, under a canopy.
  k.box([0.34, 0.8, 1.7], [-1.0, 0, 0.1], P.stone);
  k.box([0.36, 0.18, 1.72], [-1.0, 0.5, 0.1], P.glassDark);
  k.box([0.4, 0.04, 1.78], [-1.0, 0.8, 0.1], P.trim);
  k.box([0.3, 0.42, 1.5], [-1.02, 0.84, 0.1], P.stone2);
  k.box([0.32, 0.2, 1.52], [-1.02, 0.95, 0.1], P.glass);
  for (let i = 0; i <= 6; i++) k.box([0.33, 0.2, 0.015], [-1.02, 0.95, -0.62 + i * 0.24], P.mullion);
  k.box([0.42, 0.05, 1.62], [-1.02, 1.26, 0.1], P.trim);
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

function cameron(k: Kit) {
  // Cameron Indoor: a boxy Duke-stone hall with a battlemented parapet, stepped corner towers, tall paired windows in
  // pale surrounds and four pointed-arch doors; the arena's pale low roof shows above the parapet.
  k.box([2, 1, 1.15], [0, 0, 0], P.stone);
  k.box([1.82, 0.1, 0.97], [0, 1, 0], P.roofPale);
  k.gable([0.97, 0.2, 1.82], [0, 1.1, 0], P.roofPale, Math.PI / 2);
  eachSide(k, 2, 1.15, [0, 0, 0], (face, span) => {
    k.box([span, 0.08, 0.07], [0, 1, face - 0.035], P.stone2);
    const merlons = Math.round(span / 0.17);
    for (let i = 0; i < merlons; i++) k.box([0.075, 0.08, 0.07], [-span / 2 + 0.06 + (i * (span - 0.12)) / (merlons - 1), 1.08, face - 0.035], P.stone2);
  });
  for (const [x, z] of corners(0.95, 0.525)) {
    k.box([0.24, 1.22, 0.24], [x, 0, z], P.stone2);
    k.box([0.28, 0.05, 0.28], [x, 1.22, z], P.trim);
    for (const [mx, mz] of corners(0.09)) k.box([0.07, 0.08, 0.07], [x + mx, 1.27, z + mz], P.stone2);
  }
  // The raised frontispiece over the entrance.
  k.box([1.1, 1.28, 0.14], [0, 0, 0.6], P.stone);
  for (let i = 0; i < 6; i++) k.box([0.09, 0.09, 0.12], [-0.5 + i * 0.2, 1.28, 0.62], P.stone);
  for (const x of [-0.33, 0, 0.33]) {
    k.box([0.21, 0.46, 0.03], [x, 0.5, 0.675], P.trim);
    for (const dx of [-0.05, 0.05]) k.box([0.07, 0.38, 0.03], [x + dx, 0.54, 0.69], P.window);
  }
  for (const x of [-0.36, -0.12, 0.12, 0.36]) {
    lancetZ(k, x, 0, 0.675, [0.18, 0.2], P.trim);
    lancetZ(k, x, 0, 0.69, [0.12, 0.17], P.door);
  }
  k.box([1.2, 0.04, 0.2], [0, 0, 0.77], P.trim);
  // Paired windows on the wings either side, and down the long walls.
  for (const sx of [-1, 1]) {
    k.box([0.21, 0.46, 0.03], [sx * 0.7, 0.42, 0.575], P.trim);
    for (const dx of [-0.05, 0.05]) k.box([0.07, 0.38, 0.03], [sx * 0.7 + dx, 0.46, 0.59], P.window);
    for (const z of [-0.2, 0.2]) {
      k.box([0.03, 0.46, 0.2], [sx * 1.005, 0.42, z], P.trim);
      k.box([0.03, 0.38, 0.13], [sx * 1.02, 0.46, z], P.window);
    }
  }
  // Schwartz-Butters, the lower stone wing along the back.
  k.box([1.9, 0.62, 0.32], [0, 0, -0.74], P.stone2);
  k.box([1.94, 0.05, 0.36], [0, 0.62, -0.74], P.trim);
  for (let i = 0; i < 7; i++) k.box([0.12, 0.16, 0.03], [-0.78 + i * 0.26, 0.28, -0.905], P.window);
}

function wilkinson(k: Kit) {
  // Wilkinson: towers of gray Duke stone with slit windows, a blue glass curtain wall with vertical fins between
  // them, and a glass corner screened by white louvers over terraced entry steps.
  k.box([0.65, 1.5, 1.15], [-0.575, 0, 0], P.stone2);
  k.box([0.55, 0.1, 1.05], [-0.575, 1.5, 0], P.stone2);
  for (const y of [0.22, 0.52, 0.82, 1.12]) {
    for (const x of [-0.75, -0.575, -0.4]) for (const face of [-0.585, 0.585]) k.box([0.05, 0.18, 0.03], [x, y, face], P.window);
    for (const z of [-0.3, 0, 0.3]) k.box([0.03, 0.18, 0.05], [-0.915, y, z], P.window);
  }
  k.box([0.7, 1.42, 1.05], [0.1, 0, 0], P.glassBlue);
  for (const face of [-0.535, 0.535]) {
    for (let i = 0; i < 8; i++) k.box([0.025, 1.42, 0.05], [-0.21 + i * 0.087, 0, face], P.louver);
    for (const y of [0.32, 0.6, 0.88, 1.16]) k.box([0.7, 0.025, 0.04], [0.1, y, face], P.metal);
  }
  k.box([0.72, 0.04, 1.07], [0.1, 1.42, 0], P.trim);
  k.box([0.45, 1.55, 0.6], [0.675, 0, -0.27], P.stone2);
  k.box([0.37, 0.1, 0.52], [0.675, 1.55, -0.27], P.stone2);
  for (const y of [0.22, 0.52, 0.82, 1.12]) for (const z of [-0.45, -0.2]) k.box([0.03, 0.18, 0.05], [0.915, y, z], P.window);
  // The louvered glass corner, its fins running up past the roof.
  k.box([0.45, 1.42, 0.5], [0.675, 0, 0.3], P.glass);
  for (let i = 0; i < 9; i++) {
    const tall = i % 3 === 0 ? 1.62 : 1.48;
    k.box([0.018, tall, 0.05], [0.47 + i * 0.05, 0, 0.56], P.louver);
    if (i < 5) k.box([0.05, tall, 0.018], [0.91, 0, 0.1 + i * 0.1], P.louver);
  }
  k.box([0.03, 0.3, 0.2], [0.905, 0, -0.02], P.glassDark);
  // Stepped seating down to the street, with stone planters.
  ([[0.98, 0.12], [1.1, 0.08], [1.22, 0.04]] as const).forEach(([x, h]) => k.box([0.12, h, 0.95], [x, 0, 0], P.trim));
  for (const z of [-0.5, 0.5]) {
    k.box([0.32, 0.14, 0.14], [1.1, 0, z], P.stone2);
    k.blob(0.07, [1.1, 0.17, z], P.leaves[0]);
  }
  // Roof terrace canopy.
  k.box([0.45, 0.03, 0.5], [0.05, 1.62, -0.2], P.louver);
  for (const [x, z] of corners(0.2, 0.22)) k.box([0.025, 0.2, 0.025], [0.05 + x, 1.42, -0.2 + z], P.metal);
}

function medicine(k: Kit) {
  // The School of Medicine's Davison Building: a battlemented central block with a round tower at each corner, a
  // limestone oriel over a pointed-arch door, and deep Duke-stone wings either side with slate roofs and dormers.
  k.box([2.8, 1.35, 1.3], [0, 0, -0.05], P.stone);
  k.gable([1.42, 0.65, 2.84], [0, 1.35, -0.05], P.roof, Math.PI / 2);
  for (const sx of [-1, 1]) {
    for (const [face, out] of [[0.6, 1], [-0.7, -1]] as const) {
      for (const x of [0.78, 1.18]) {
        k.box([0.22, 0.26, 0.16], [sx * x, 1.33, face - out * 0.2], P.stone2);
        k.gable([0.26, 0.16, 0.2], [sx * x, 1.59, face - out * 0.2], P.roofDark);
        k.box([0.1, 0.13, 0.02], [sx * x, 1.39, face - out * 0.115], P.window);
      }
      for (const x of [0.75, 1.0, 1.25]) for (const y of [0.14, 0.52, 0.9]) {
        k.box([0.14, 0.25, 0.03], [sx * x, y, face + out * 0.01], P.trim);
        k.box([0.09, 0.19, 0.03], [sx * x, y + 0.03, face + out * 0.02], P.window);
      }
    }
    for (const z of [-0.35, 0.25]) for (const y of [0.14, 0.52, 0.9]) {
      k.box([0.03, 0.25, 0.14], [sx * 1.41, y, z], P.trim);
      k.box([0.03, 0.19, 0.09], [sx * 1.42, y + 0.03, z], P.window);
    }
  }
  // The central block and its four corner towers.
  k.box([1.1, 2.1, 1.5], [0, 0, -0.05], P.stone2);
  eachSide(k, 1.1, 1.5, [0, 0, -0.05], (face, span) => {
    const merlons = Math.round(span / 0.2);
    for (let i = 0; i < merlons; i++) k.box([0.08, 0.1, 0.08], [-span / 2 + 0.2 + (i * (span - 0.4)) / Math.max(1, merlons - 1), 2.1, face - 0.04], P.stone2);
  });
  for (const [x, z] of [[-0.55, 0.7], [0.55, 0.7], [-0.55, -0.8], [0.55, -0.8]]) {
    k.cylinder(0.19, 0.19, 2.55, 8, [x, 0, z], P.stone);
    for (const y of [1.25, 1.95]) k.cylinder(0.198, 0.198, 0.05, 8, [x, y, z], P.trim);
    k.cylinder(0.215, 0.215, 0.1, 8, [x, 2.55, z], P.stone2);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      k.box([0.07, 0.11, 0.07], [x + Math.sin(a) * 0.18, 2.65, z + Math.cos(a) * 0.18], P.stone2, a);
    }
    const out = Math.sign(z);
    for (const y of [1.45, 2.15]) k.box([0.06, 0.15, 0.03], [x, y, z + out * 0.19], P.window);
  }
  // Front: the pale limestone oriel over the door, a window above, and the steps.
  k.box([0.42, 0.85, 0.1], [0, 0.72, 0.74], P.trim);
  for (const x of [-0.14, -0.07, 0, 0.07, 0.14]) k.box([0.05, 0.66, 0.02], [x, 0.82, 0.795], P.window);
  k.box([0.3, 0.28, 0.03], [0, 1.72, 0.715], P.trim);
  k.box([0.21, 0.2, 0.03], [0, 1.76, 0.73], P.window);
  lancetZ(k, 0, 0, 0.72, [0.32, 0.42], P.trim);
  lancetZ(k, 0, 0, 0.74, [0.22, 0.36], P.door);
  k.box([0.75, 0.05, 0.26], [0, 0, 0.9], P.trim);
  // Back: a stack of windows between the rear towers.
  for (const y of [0.2, 0.75, 1.3, 1.75]) {
    k.box([0.3, 0.3, 0.03], [0, y, -0.815], P.trim);
    k.box([0.22, 0.22, 0.03], [0, y + 0.04, -0.83], P.window);
  }
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
  /** Uniform size multiplier for the whole landmark (model, hit box and markers); defaults to 1. */
  scale?: number;
}

// Laid out from Grant's sketch: the chapel heads a quad flanked by two long halls (the east one turning into an
// L), Brodhead built onto the back of the west hall with its glass facing west, Perkins east of the L's foot, and
// Few Quad and Allen across the south end either side of the loop. Wallace Wade and Gross Hall are off-quad, so they sit in the band along the west and
// north edges. The rest follow the real campus turned into this frame (the chapel-to-loop axis runs north–south):
// Cameron sits just north of Wallace Wade with K-ville's tents between them; at the east edge the School of
// Medicine's Davison Building closes the lawn south of Perkins, looking west toward Abele Quad, and Wilkinson
// stands north of Perkins.
export const sites: Record<BuildingId, Site> = {
  chapel: { at: [0.375, -2.3], rot: 0, build: chapel, hit: { center: [0, 2.55, -1.65], size: [2.7, 5.1, 5.05] }, anchor: [0, 5.35, 0], dot: [0, 2.6, 0] },
  perkins: { at: [6.15, 1.25], rot: 0, build: perkins, hit: { center: [0, 1.15, -0.5], size: [2.2, 2.3, 3.3] }, anchor: [0, 2.55, 0.62], dot: [0, 1, 0] },
  brodhead: { at: [-3.28, -0.75], rot: -Math.PI / 2, build: brodhead, hit: { center: [0, 1.1, 0.39], size: [3.4, 2.25, 2.1] }, anchor: [0, 2.45, 0.25], dot: [0, 1.3, 0.25] },
  allen: { at: [2.85, 6.25], rot: Math.PI, build: allen, hit: { center: [0, 1.2, 0.2], size: [3.2, 2.4, 1.4] }, anchor: [0, 2.6, 0.3], dot: [0, 0.95, 0.1] },
  few: { at: [-2.65, 6.0], rot: 0, build: few, hit: { center: [0, 1, 0], size: [2.65, 2.1, 2.7] }, anchor: [-0.4, 2.3, 0], dot: [-1.06, 1.85, 0] },
  'wallace-wade': { at: [-6.8, 2.65], rot: 0, scale: 1.45, build: wallaceWade, hit: { center: [0, 0.7, -0.42], size: [2.3, 1.4, 3.6] }, anchor: [-0.98, 1.55, 0.1], dot: [0, 0.3, 0.1] },
  gross: { at: [-4.4, -6.35], rot: 0, build: gross, hit: { center: [0, 1, 0.18], size: [2.25, 2, 1.8] }, anchor: [0, 2.15, 0], dot: [0, 0.9, 0.1] },
  cameron: { at: [-6.75, -3.4], rot: 0, scale: 1.3, build: cameron, hit: { center: [0, 0.7, -0.05], size: [2.25, 1.45, 1.85] }, anchor: [0, 1.55, 0.3], dot: [0, 0.75, 0.2] },
  wilkinson: { at: [7.4, -1.85], rot: Math.PI, build: wilkinson, hit: { center: [0.15, 0.82, 0], size: [2.35, 1.65, 1.3] }, anchor: [-0.1, 1.85, 0], dot: [0.1, 0.75, 0] },
  medicine: { at: [7.5, 3.8], rot: -Math.PI / 2, build: medicine, hit: { center: [0, 1.3, 0], size: [2.9, 2.75, 2.05] }, anchor: [0, 2.85, 0.7], dot: [0, 1.35, 0.78] },
};

export const buildingIds = Object.keys(sites) as BuildingId[];

/** A point in a landmark's own frame, in world coordinates. */
export function toWorld(site: Site, [x, y, z]: V3): V3 {
  const k = site.scale ?? 1, c = Math.cos(site.rot) * k, s = Math.sin(site.rot) * k;
  return [site.at[0] + x * c + z * s, y * k, site.at[1] - x * s + z * c];
}

export function buildLandmark(id: BuildingId, seed: number) {
  const k = new Kit(STONE_VARIANTS, seed);
  sites[id].build(k);
  return k.merge();
}
