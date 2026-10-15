import { BufferGeometry, CatmullRomCurve3, DirectionalLight, DoubleSide, Float32BufferAttribute, Group, HemisphereLight, Matrix4, Mesh, MeshLambertMaterial, Scene, Vector3 } from 'three';

// A few paper airplanes weaving through the campus at rooftop height. They live in their own little scene that the
// diorama draws over a cached picture of the campus (see PlaneCompositor in CampusDiorama.tsx), so a moving plane
// costs a handful of triangles per frame rather than a full re-render of the map.

const triangles = (...points: number[][]) => {
  const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(points.flat(), 3));
  geometry.computeVertexNormals();
  return geometry;
};
// A dart, nose along +x: two long triangular wings hinged on the spine, and a folded keel underneath.
const NOSE = [0.45, 0, 0], TAIL = [-0.45, 0, 0];
const LEFT_WING = triangles(NOSE, TAIL, [-0.45, 0.04, 0.34]);
const RIGHT_WING = triangles(NOSE, [-0.45, 0.04, -0.34], TAIL);
const KEEL = triangles(NOSE, [-0.4, -0.13, 0], TAIL);
const SIZE = new Vector3(0.68, 0.68, 0.68);
const UP = new Vector3(0, 1, 0);

interface Flight {
  /** Waypoints of a closed route through open ground; a smooth curve is threaded through them. */
  route: [number, number, number][];
  offset: number; // how far round the route each plane starts (0–1), so they start far apart
  paper: [string, string]; // wing, keel
}

const SPEED = 0.8; // world units per second

// Each route keeps to its own part of campus and stays at least half a unit clear of every building footprint
// (checked against the layout when the routes were drawn). They cruise at about eave height, above the trees
// (under 1) and below the rooflines, so the planes pass beside and behind buildings rather than through them.
const FLIGHTS: Flight[] = [
  { // down the quad lawn, a swing west past Few Quad, back east past Allen, and up the far side of the quad
    route: [[0.375, 1.4, -0.9], [-0.95, 1.3, 1.2], [-1, 1.3, 2.6], [-3.3, 1.35, 3.2], [-1, 1.3, 4.15], [1.8, 1.35, 4.2], [4.3, 1.3, 3.3], [2.1, 1.3, 2.55], [1.75, 1.35, 0.8]],
    offset: 0, paper: ['#FBFAF6', '#E3DED5'],
  },
  { // over K-ville, past Gross Hall, round the back of the chapel and home behind Brodhead
    route: [[-6.3, 1.3, -0.5], [-6.6, 1.35, -2.9], [-5.6, 1.4, -4.3], [-3.4, 1.3, -4.15], [-1.6, 1.35, -4.05], [-1.35, 1.3, -3.65], [-1.7, 1.3, -3.3], [-3.6, 1.3, -3.3], [-4.9, 1.3, -2.4], [-5.7, 1.25, -1.2]],
    offset: 0.45, paper: ['#ef554c', '#c63b35'],
  },
  { // between the east hall and Perkins, then a loop round Duke Gardens
    route: [[4.2, 1.3, 0.15], [4.05, 1.35, -2], [3.9, 1.4, -4.8], [5.3, 1.35, -6.5], [6.8, 1.3, -4.7], [6.6, 1.3, -2], [4.6, 1.3, -1.4]],
    offset: 0.7, paper: ['#FBFAF6', '#E3DED5'],
  },
];

function buildPlane([wing, keel]: [string, string]) {
  const wingPaper = new MeshLambertMaterial({ color: wing, side: DoubleSide, flatShading: true });
  const keelPaper = new MeshLambertMaterial({ color: keel, side: DoubleSide, flatShading: true });
  const plane = new Group(), left = new Mesh(LEFT_WING, wingPaper), right = new Mesh(RIGHT_WING, wingPaper);
  plane.add(left, right, new Mesh(KEEL, keelPaper));
  plane.matrixAutoUpdate = false;
  return { plane, left, right, materials: [wingPaper, keelPaper] };
}

/** The planes, their lights, and a function that moves them to where they are `seconds` into their flight. */
export function createFleet(count: number) {
  // Same light as the map, so the paper matches the buildings around it.
  const scene = new Scene(), sun = new DirectionalLight('#ffffff', 1.9);
  sun.position.set(-7, 13, 8);
  scene.add(new HemisphereLight('#EEF3FF', '#F3E3C4', 1.7), sun);
  const planes = FLIGHTS.slice(0, count).map((flight, i) => {
    const built = buildPlane(flight.paper);
    scene.add(built.plane);
    const curve = new CatmullRomCurve3(flight.route.map(([x, y, z]) => new Vector3(x, y, z)), true, 'centripetal');
    curve.arcLengthDivisions = 600;
    return { ...built, flight, curve, length: curve.getLength(), nextFlap: 1.5 + i * 2.3 + Math.random() * 2 };
  });
  const forward = new Vector3(), side = new Vector3(), up = new Vector3(), bend = new Vector3(), basis = new Matrix4();
  const here = new Vector3(), ahead = new Vector3(), behind = new Vector3();
  const wrap = (u: number) => u - Math.floor(u);

  const fly = (seconds: number) => {
    for (const p of planes) {
      // Constant speed along the route; a short look ahead and behind gives the heading and how hard it turns.
      const u = wrap(p.flight.offset + (seconds * SPEED) / p.length), step = 0.08 / p.length;
      p.curve.getPointAt(u, here);
      p.curve.getPointAt(wrap(u + step), ahead);
      p.curve.getPointAt(wrap(u - step), behind);
      forward.subVectors(ahead, behind).normalize();
      // Bank into the turn: roll toward the side the route is curving to, by how hard it curves.
      bend.subVectors(ahead, here).sub(side.subVectors(here, behind));
      const bank = Math.max(-0.7, Math.min(0.7, bend.dot(side.crossVectors(forward, UP).normalize()) * 60));
      up.crossVectors(side, forward).normalize().multiplyScalar(Math.cos(bank)).addScaledVector(side, Math.sin(bank)).normalize();
      side.crossVectors(forward, up);
      // Every few seconds, a quick double flap of the wings with a little hop.
      let flap = 0.12;
      if (seconds > p.nextFlap) {
        const beat = (seconds - p.nextFlap) / 0.75;
        if (beat >= 1) p.nextFlap = seconds + 3 + Math.random() * 4;
        else {
          flap += 0.6 * Math.sin(beat * 4 * Math.PI) * Math.sin(beat * Math.PI);
          here.y += 0.15 * Math.sin(beat * Math.PI);
        }
      }
      p.left.rotation.x = -flap;
      p.right.rotation.x = flap;
      p.plane.matrix.copy(basis.makeBasis(forward, up, side).scale(SIZE).setPosition(here));
      p.plane.matrixWorldNeedsUpdate = true;
    }
  };
  const dispose = () => planes.forEach(p => p.materials.forEach(m => m.dispose()));
  return { scene, fly, dispose };
}
