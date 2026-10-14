import { BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, Matrix4 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];

const tints = new Map<string, Color>();
function tint(hex: string) {
  let color = tints.get(hex);
  if (!color) tints.set(hex, (color = new Color(hex)));
  return color;
}
const placement = ([x, y, z]: V3, rotY: number) => new Matrix4().makeRotationY(rotY).setPosition(x, y, z);

function prism(w: number, h: number, d: number) {
  const x = w / 2, z = d / 2;
  const a = [-x, 0, -z], b = [x, 0, -z], c = [x, 0, z], e = [-x, 0, z], back = [0, h, -z], front = [0, h, z];
  const triangles = [e, c, front, b, a, back, c, b, back, c, back, front, a, e, front, a, front, back, a, b, c, a, c, e];
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(triangles.flat(), 3));
}

/**
 * Builds a low-poly model from flat-shaded, vertex-coloured primitives merged into one geometry,
 * so a whole building (or forest) is a single draw call. Unless noted, `at` is the centre of a
 * primitive's base. push/pop nest local frames: move to `at`, then turn about y.
 */
export class Kit {
  private parts: BufferGeometry[] = [];
  private frames = [new Matrix4()];
  private rand: () => number;

  /** `variants` swaps a colour for a random pick from its list on every part, e.g. to mottle stone walls. */
  constructor(private variants: Record<string, readonly string[]> = {}, seed = 1) {
    this.rand = mulberry32(seed);
  }

  push(at: V3, rotY = 0) {
    this.frames.push(this.frames[this.frames.length - 1].clone().multiply(placement(at, rotY)));
    return this;
  }

  pop() {
    this.frames.pop();
    return this;
  }

  add(source: BufferGeometry, color: string, at: V3 = [0, 0, 0], rotY = 0) {
    const geometry = source.index ? source.toNonIndexed() : source;
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    geometry.applyMatrix4(this.frames[this.frames.length - 1].clone().multiply(placement(at, rotY)));
    const options = this.variants[color];
    if (options) color = options[Math.floor(this.rand() * options.length)];
    const { r, g, b } = tint(color), rgb = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < rgb.length; i += 3) { rgb[i] = r; rgb[i + 1] = g; rgb[i + 2] = b; }
    geometry.setAttribute('color', new Float32BufferAttribute(rgb, 3));
    this.parts.push(geometry);
    return this;
  }

  box([w, h, d]: V3, at: V3, color: string, rotY = 0) {
    return this.add(new BoxGeometry(w, h, d).translate(0, h / 2, 0), color, at, rotY);
  }

  /** Roof prism: spans `w` across x, rises `h`, and its ridge runs `d` along z. */
  gable([w, h, d]: V3, at: V3, color: string, rotY = 0) {
    return this.add(prism(w, h, d), color, at, rotY);
  }

  pyramid([w, h, d]: V3, at: V3, color: string, rotY = 0) {
    return this.add(new ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).scale(w, h, d).translate(0, h / 2, 0), color, at, rotY);
  }

  cylinder(rTop: number, rBottom: number, h: number, sides: number, at: V3, color: string, rotY = 0) {
    return this.add(new CylinderGeometry(rTop, rBottom, h, sides).translate(0, h / 2, 0), color, at, rotY);
  }

  /** Flat oval such as a pond. */
  slab(rx: number, rz: number, h: number, sides: number, at: V3, color: string, rotY = 0) {
    return this.add(new CylinderGeometry(1, 1, h, sides).scale(rx, 1, rz).translate(0, h / 2, 0), color, at, rotY);
  }

  /** Disc facing ±z, centred on `at`: rose windows, wheels. */
  disc(r: number, depth: number, sides: number, at: V3, color: string, rotY = 0) {
    return this.add(new CylinderGeometry(r, r, depth, sides).rotateX(Math.PI / 2), color, at, rotY);
  }

  /** Icosahedron centred on `at`: tree crowns, bushes, lamps. */
  blob(r: number, at: V3, color: string, squash = 1, rotY = 0) {
    return this.add(new IcosahedronGeometry(r, 0).scale(1, squash, 1), color, at, rotY);
  }

  merge() {
    const merged = mergeGeometries(this.parts);
    this.parts.forEach(part => part.dispose());
    this.parts = [];
    if (!merged) throw new Error('Kit.merge: parts have mismatched attributes');
    merged.computeVertexNormals();
    return merged;
  }
}

export const corners = (rx: number, rz = rx): [number, number][] => [[rx, rz], [rx, -rz], [-rx, rz], [-rx, -rz]];

/** Calls `draw` once per wall of a w × d footprint centred on `at`, in a frame where that wall faces +z at z = face. */
export function eachSide(k: Kit, w: number, d: number, at: V3, draw: (face: number, span: number) => void) {
  for (const [rot, depth, span] of [[0, d, w], [Math.PI / 2, w, d], [Math.PI, d, w], [-Math.PI / 2, w, d]]) {
    k.push(at, rot);
    draw(depth / 2, span);
    k.pop();
  }
}

/** Pointed-arch window on a wall facing ±z at z = face. */
export function lancetZ(k: Kit, x: number, y: number, face: number, [w, h]: [number, number], color: string) {
  k.box([w, h, 0.04], [x, y, face], color);
  k.pyramid([w, w * 0.75, 0.04], [x, y + h, face], color);
}

/** Pointed-arch window on a wall facing ±x at x = face. */
export function lancetX(k: Kit, face: number, y: number, z: number, [w, h]: [number, number], color: string) {
  k.box([0.04, h, w], [face, y, z], color);
  k.pyramid([0.04, w * 0.75, w], [face, y + h, z], color);
}

export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
