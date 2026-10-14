import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { CanvasTexture, MeshLambertMaterial, SRGBColorSpace, Vector3 } from 'three';
import type { BufferGeometry, Group, Mesh } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { campusBuildings } from '../data/campus';
import type { BuildingId } from '../data/campus';
import { projectIllustration, projects } from '../data/projects';
import type { Project } from '../data/projects';
import { corners } from './campus/kit';
import type { V3 } from './campus/kit';
import { buildingIds, sites, toWorld } from './campus/landmarks';
import { DEPTH, HALF, buildCampus } from './campus/scenery';
import Glyph from './Glyph';

interface Spot { id: BuildingId; name: string; project: Project; anchor: V3; dot: V3 }

// One project per building: the first project to claim a building keeps it.
const spots = projects.reduce<Partial<Record<BuildingId, Spot>>>((found, project) => {
  const id = project.building;
  if (id && !found[id]) {
    const site = sites[id];
    found[id] = { id, name: campusBuildings[id], project, anchor: toWorld(site, site.anchor), dot: toWorld(site, site.dot) };
  }
  return found;
}, {});
const spotList = buildingIds.flatMap(id => spots[id] ?? []);

const POLAR = 0.96; // camera angle from straight down: an isometric-style ~35° above the horizon
const START_AZIMUTH = 0.55;
const START: V3 = [40 * Math.sin(POLAR) * Math.sin(START_AZIMUTH), 40 * Math.cos(POLAR), 40 * Math.sin(POLAR) * Math.cos(START_AZIMUTH)];
const TAIL = 16;
const popDelay = (id: BuildingId) => 420 + buildingIds.indexOf(id) * 90;
const POP = 560;

// The widest and tallest the diorama gets on screen over a full spin, so the zoom never pumps while rotating.
const frame = (() => {
  const points: V3[] = [
    ...corners(HALF).map(([x, z]): V3 => [x, 1, z]),
    ...corners(HALF - 0.15).map(([x, z]): V3 => [x, -DEPTH, z]),
    ...buildingIds.map(id => toWorld(sites[id], sites[id].anchor)),
  ];
  const s = Math.sin(POLAR), c = Math.cos(POLAR);
  let halfW = 0, top = -Infinity, bottom = Infinity;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * 2 * Math.PI, sa = Math.sin(a), ca = Math.cos(a);
    for (const [x, y, z] of points) {
      halfW = Math.max(halfW, Math.abs(x * ca - z * sa));
      const v = s * y - c * (sa * x + ca * z);
      top = Math.max(top, v);
      bottom = Math.min(bottom, v);
    }
  }
  return { halfW, halfH: (top - bottom) / 2, midY: (top + bottom) / (2 * s) };
})();

const easeOutBack = (p: number) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;
const progress = (start: number | null, delay: number, duration: number) =>
  start === null ? 0 : Math.min(1, Math.max(0, (performance.now() - start - delay) / duration));
function damp(from: number, to: number, dt: number, snap: boolean) {
  const next = to + (from - to) * Math.exp(-14 * dt);
  return snap || Math.abs(next - to) < 0.0005 ? to : next;
}
const headerOf = (el: Element) => el.closest('.room')?.querySelector('.room-header');

interface BuildingHandlers {
  over: (id: BuildingId, e: ThreeEvent<PointerEvent>) => void;
  out: (e: ThreeEvent<PointerEvent>) => void;
  tap: (id: BuildingId, e: ThreeEvent<MouseEvent>) => void;
}

/** Fixed-tilt orthographic camera: fills the room below the header, and left-drag (or one finger) spins it. */
function CameraRig({ reduced, onSpin }: { reduced: boolean; onSpin: (spinning: boolean) => void }) {
  const camera = useThree(state => state.camera);
  const gl = useThree(state => state.gl);
  const size = useThree(state => state.size);
  const invalidate = useThree(state => state.invalidate);
  const controls = useRef<OrbitControls | null>(null);
  const targetY = useRef(0);
  const [headerSize, setHeaderSize] = useState(0);

  // Re-fit when the header changes size (fonts loading, wrapping).
  useEffect(() => {
    const header = headerOf(gl.domElement);
    if (!header) return;
    const observer = new ResizeObserver(() => setHeaderSize(header.getBoundingClientRect().height));
    observer.observe(header);
    return () => observer.disconnect();
  }, [gl]);

  useLayoutEffect(() => {
    const canvasTop = gl.domElement.getBoundingClientRect().top, header = headerOf(gl.domElement);
    // The block may tuck slightly behind the header and the frame's bottom edge; the corners are just trees.
    const top = header ? Math.max(0, header.getBoundingClientRect().bottom - canvasTop - 28) : 0, bottom = 4;
    const room = Math.max(1, size.height - top - bottom);
    // Phones are narrow: let the block's corners tuck under the paper frame rather than shrinking it.
    const widthShare = size.width <= 640 ? 1.3 : 0.96;
    camera.zoom = Math.max(1, Math.min((size.width * widthShare) / (2 * frame.halfW), room / (2 * frame.halfH)));
    camera.updateProjectionMatrix();
    // Any height left over (tall, narrow screens) goes mostly above the block, where the speech bubbles open.
    const spare = Math.max(0, room - 2 * frame.halfH * camera.zoom);
    const y = frame.midY + ((top - bottom) / 2 + 0.35 * spare) / (Math.sin(POLAR) * camera.zoom);
    camera.position.y += y - targetY.current;
    targetY.current = y;
    if (controls.current) {
      controls.current.target.y = y;
      controls.current.update();
    }
    invalidate();
  }, [camera, gl, size.width, size.height, headerSize, invalidate]);

  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableZoom = false;
    orbit.enablePan = false;
    orbit.minPolarAngle = orbit.maxPolarAngle = POLAR;
    orbit.enableDamping = !reduced;
    orbit.dampingFactor = 0.09;
    orbit.rotateSpeed = 0.6;
    orbit.target.set(0, targetY.current, 0);
    orbit.update();
    let pressed = false, spinning = false;
    const start = () => { pressed = true; };
    const change = () => {
      invalidate();
      if (pressed && !spinning) { spinning = true; onSpin(true); }
    };
    const end = () => {
      pressed = false;
      if (spinning) { spinning = false; onSpin(false); }
    };
    orbit.addEventListener('start', start);
    orbit.addEventListener('change', change);
    orbit.addEventListener('end', end);
    controls.current = orbit;
    return () => {
      orbit.removeEventListener('start', start);
      orbit.removeEventListener('change', change);
      orbit.removeEventListener('end', end);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate, onSpin, reduced]);

  useFrame(() => { controls.current?.update(); });
  return null;
}

interface LandmarkProps {
  id: BuildingId;
  geometry: BufferGeometry;
  spot?: Spot;
  active: boolean;
  intro: RefObject<number | null>;
  reduced: boolean;
  handlers: BuildingHandlers;
}

function Landmark({ id, geometry, spot, active, intro, reduced, handlers }: LandmarkProps) {
  const site = sites[id];
  const body = useRef<Group>(null);
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true, emissive: '#FFF1D0', emissiveIntensity: 0 }), []);

  useFrame((state, dt) => {
    const group = body.current;
    if (!group) return;
    // Pop up during the intro, then lift and glow while hovered or selected.
    const grow = progress(intro.current, popDelay(id), POP), pop = easeOutBack(grow);
    group.scale.set(0.7 + 0.3 * pop, Math.max(0.001, pop), 0.7 + 0.3 * pop);
    const lift = active ? 0.14 : 0;
    group.position.y = damp(group.position.y, lift, dt, reduced);
    material.emissiveIntensity = damp(material.emissiveIntensity, active ? 0.18 : 0, dt, reduced);
    if ((intro.current !== null && grow < 1) || group.position.y !== lift) state.invalidate();
  });

  return <group position={[site.at[0], 0, site.at[1]]} rotation-y={site.rot}>
    <group ref={body}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {spot && <mesh visible={false} position={site.hit.center}
        onPointerOver={e => { e.stopPropagation(); handlers.over(id, e); }}
        onPointerOut={e => { e.stopPropagation(); handlers.out(e); }}
        onClick={e => { e.stopPropagation(); handlers.tap(id, e); }}>
        <boxGeometry args={site.hit.size} />
      </mesh>}
    </group>
  </group>;
}

interface OverlayProps {
  activeId: BuildingId | null;
  intro: RefObject<number | null>;
  bubbleRef: RefObject<HTMLDivElement | null>;
  dotRefs: RefObject<(HTMLSpanElement | null)[]>;
}

/** Pins the DOM overlays to the scene on every rendered frame: the project dots, and the speech bubble. */
function OverlayTracker({ activeId, intro, bubbleRef, dotRefs }: OverlayProps) {
  const point = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size, gl }) => {
    camera.updateMatrixWorld();
    const box = gl.domElement.getBoundingClientRect();
    const toScreen = ([x, y, z]: V3) => {
      point.set(x, y, z).project(camera);
      return [box.left + ((point.x + 1) / 2) * size.width, box.top + ((1 - point.y) / 2) * size.height];
    };
    spotList.forEach((spot, i) => {
      const dot = dotRefs.current[i];
      if (!dot) return;
      const [x, y] = toScreen(spot.dot);
      dot.style.transform = `translate(${x - box.left}px, ${y - box.top}px)`;
      dot.classList.toggle('is-ready', intro.current !== null && performance.now() >= intro.current + popDelay(spot.id) + POP);
    });

    const bubble = bubbleRef.current, spot = activeId ? spots[activeId] : undefined;
    if (!bubble || !spot) return;
    const [ax, ay] = toScreen(spot.anchor);
    const w = bubble.offsetWidth, h = bubble.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    const edge = vw <= 640 ? 20 : 52, header = headerOf(gl.domElement);
    const top = Math.max(edge, header ? header.getBoundingClientRect().bottom + 6 : box.top);
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    const centered = clamp(ax - w / 2, edge, vw - edge - w), level = clamp(ay - h / 2, top, vh - edge - h);
    // Prefer staying below the header (above the building, then beside it); spill over it only when nothing else fits.
    let side: 'above' | 'below' | 'left' | 'right', x: number, y: number;
    if (ay - TAIL - h >= top) [side, x, y] = ['above', centered, ay - TAIL - h];
    else if (ax + TAIL + w <= vw - edge) [side, x, y] = ['right', ax + TAIL, level];
    else if (ax - TAIL - w >= edge) [side, x, y] = ['left', ax - TAIL - w, level];
    else if (ay - TAIL - h >= edge) [side, x, y] = ['above', centered, ay - TAIL - h];
    else [side, x, y] = ['below', centered, ay + TAIL];
    const vertical = side === 'above' || side === 'below';
    const tail = vertical ? clamp(ax - x, 22, w - 22) : clamp(ay - y, 22, h - 22);
    bubble.dataset.side = side;
    bubble.style.setProperty('--tail', `${tail}px`);
    bubble.style.setProperty('--origin', { above: `${tail}px 100%`, below: `${tail}px 0`, right: `0 ${tail}px`, left: `100% ${tail}px` }[side]);
    bubble.style.transform = `translate(${x - box.left}px, ${y - box.top}px)`;
    bubble.style.visibility = 'visible';
  });
  return null;
}

interface SceneProps extends Omit<OverlayProps, 'intro'> {
  introOn: boolean;
  reduced: boolean;
  onSpin: (spinning: boolean) => void;
  handlers: BuildingHandlers;
}

function Scene({ activeId, introOn, reduced, bubbleRef, dotRefs, onSpin, handlers }: SceneProps) {
  const campus = useMemo(buildCampus, []);
  const matte = useMemo(() => new MeshLambertMaterial({ vertexColors: true }), []);
  const shadow = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const paint = canvas.getContext('2d')!, fade = paint.createRadialGradient(64, 64, 0, 64, 64, 64);
    fade.addColorStop(0, 'rgba(105, 82, 55, 0.34)');
    fade.addColorStop(0.55, 'rgba(105, 82, 55, 0.2)');
    fade.addColorStop(1, 'rgba(105, 82, 55, 0)');
    paint.fillStyle = fade;
    paint.fillRect(0, 0, 128, 128);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);
  const trees = useRef<Mesh>(null);
  const intro = useRef<number | null>(null);
  const invalidate = useThree(state => state.invalidate);

  // The intro waits until the room is actually on screen (not behind the welcome letter).
  useEffect(() => {
    if (!introOn || intro.current !== null) return;
    intro.current = reduced ? -1e9 : performance.now();
    invalidate();
  }, [introOn, reduced, invalidate]);
  useEffect(() => { invalidate(); }, [activeId, invalidate]);
  useFrame(state => {
    const grow = progress(intro.current, 200, 750);
    trees.current?.scale.set(1, Math.max(0.001, easeOutBack(grow)), 1);
    if (intro.current !== null && grow < 1) state.invalidate();
  });

  return <>
    <hemisphereLight args={['#EEF3FF', '#F3E3C4', 1.7]} />
    <directionalLight castShadow position={[-7, 13, 8]} intensity={1.9} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.035} shadow-radius={3}>
      <orthographicCamera attach="shadow-camera" args={[-11, 11, 11, -11, 1, 40]} />
    </directionalLight>
    <CameraRig reduced={reduced} onSpin={onSpin} />
    <mesh geometry={campus.ground} material={matte} receiveShadow />
    <mesh geometry={campus.decals} material={matte} receiveShadow />
    <mesh geometry={campus.props} material={matte} castShadow receiveShadow />
    <mesh ref={trees} geometry={campus.trees} material={matte} castShadow receiveShadow />
    {buildingIds.map(id => <Landmark key={id} id={id} geometry={campus.landmarks[id]} spot={spots[id]} active={activeId === id}
      intro={intro} reduced={reduced} handlers={handlers} />)}
    <mesh position={[0, -DEPTH - 0.3, 0]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[2 * HALF + 7, 2 * HALF + 7]} />
      <meshBasicMaterial map={shadow} transparent depthWrite={false} />
    </mesh>
    <OverlayTracker activeId={activeId} intro={intro} bubbleRef={bubbleRef} dotRefs={dotRefs} />
  </>;
}

function Bubble({ spot, focused, bubbleRef }: { spot: Spot; focused: boolean; bubbleRef: RefObject<HTMLDivElement | null> }) {
  const { project } = spot;
  // Purely visual and click-through: clicks on it are caught by the stage (see onClickCapture below).
  return <div className="campus-bubble" ref={bubbleRef} style={{ '--accent': project.accent } as CSSProperties} aria-hidden="true">
    <div className={`campus-bubble__card${focused ? ' is-focused' : ''}`}>
      <span className="campus-bubble__place">{spot.name}</span>
      <img className="campus-bubble__art" src={project.cover || projectIllustration(project.illustration)} alt="" draggable="false" />
      <span className="campus-bubble__type">{project.type}</span>
      <span className="campus-bubble__title">{project.title}</span>
      <span className="campus-bubble__summary">{project.summary}</span>
      <span className="campus-bubble__footer"><span>Open project</span><Glyph name="arrow" /></span>
    </div>
  </div>;
}

interface CampusDioramaProps {
  active: boolean;
  onOpenProject: (id: string, opener: HTMLElement | null) => void;
}

export default function CampusDiorama({ active, onOpenProject }: CampusDioramaProps) {
  const [hovered, setHovered] = useState<BuildingId | null>(null);
  const [selected, setSelected] = useState<BuildingId | null>(null);
  const [focused, setFocused] = useState<BuildingId | null>(null);
  const [spinning, setSpinning] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hoverTimer = useRef(0), pointer = useRef('mouse'), under = useRef<BuildingId | null>(null);
  const press = useRef({ x: 0, y: 0 }), last = useRef({ x: -1, y: -1 });
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  // Keyboard focus beats mouse hover, which beats a touch selection; nothing shows mid-spin.
  const activeId = spinning ? null : focused ?? hovered ?? selected;
  const activeSpot = activeId ? spots[activeId] : undefined;

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  useEffect(() => {
    if (active) return;
    setHovered(null);
    setSelected(null);
  }, [active]);

  const onBubble = (x: number, y: number) => {
    const card = bubbleRef.current?.firstElementChild?.getBoundingClientRect();
    return !!card && x >= card.left && x <= card.right && y >= card.top && y <= card.bottom;
  };
  const keep = () => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = 0;
  };
  // Hover changes wait a beat so sweeping across the map doesn't flash bubbles. The bubble lets the pointer
  // through to the buildings beneath it, but stays put while the pointer rests on it over open ground.
  const hoverSoon = (id: BuildingId | null, ms: number) => {
    keep();
    hoverTimer.current = window.setTimeout(() => {
      hoverTimer.current = 0;
      if (id === null && onBubble(last.current.x, last.current.y)) return;
      setHovered(id);
    }, ms);
  };
  const open = (id: BuildingId, opener: HTMLElement | null) => {
    const spot = spots[id];
    if (!spot) return;
    keep();
    setHovered(null);
    setSelected(null);
    onOpenProject(spot.project.id, opener);
  };
  // Mouse: hover peeks, click opens. Touch: the first tap peeks, a second tap (or a tap on the bubble) opens.
  const handlers: BuildingHandlers = {
    over: (id, e) => {
      if (e.pointerType !== 'mouse') return;
      under.current = id;
      if (hovered === id) keep();
      else hoverSoon(id, hovered ? 200 : 110);
    },
    out: e => {
      if (e.pointerType !== 'mouse') return;
      under.current = null;
      hoverSoon(null, 200);
    },
    tap: (id, e) => {
      if (e.delta > 6) return;
      if (pointer.current === 'mouse' || selected === id) open(id, null);
      else setSelected(id);
    },
  };

  return <div className={`campus-stage${hovered && !spinning ? ' is-hot' : ''}`}
    onPointerDown={e => { pointer.current = e.pointerType; press.current = { x: e.clientX, y: e.clientY }; }}
    onPointerMove={e => {
      last.current = { x: e.clientX, y: e.clientY };
      if (e.pointerType === 'mouse' && hovered && !under.current && !hoverTimer.current && !onBubble(e.clientX, e.clientY)) hoverSoon(null, 200);
    }}
    onClickCapture={e => {
      // A click on the visible bubble opens its project, whatever building happens to be underneath.
      const moved = Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y);
      if (!activeSpot || moved > 6 || !(e.target instanceof HTMLCanvasElement) || !onBubble(e.clientX, e.clientY)) return;
      e.stopPropagation();
      open(activeSpot.id, null);
    }}>
    <Canvas orthographic frameloop="demand" shadows="percentage" flat dpr={[1, 2]} camera={{ position: START, zoom: 20, near: 0.1, far: 100 }}
      onPointerMissed={() => setSelected(null)}>
      <Scene activeId={activeId} introOn={active} reduced={reduced} bubbleRef={bubbleRef} dotRefs={dotRefs} onSpin={setSpinning} handlers={handlers} />
    </Canvas>
    {spotList.map((spot, i) => <span key={spot.id} className="campus-dot" ref={el => { dotRefs.current[i] = el; }} aria-hidden="true" />)}
    {activeSpot && <Bubble key={activeSpot.id} spot={activeSpot} focused={focused === activeSpot.id} bubbleRef={bubbleRef} />}
    <ul className="visually-hidden" aria-label="Projects on the campus map">
      {spotList.map(spot => <li key={spot.id}>
        <button type="button" onFocus={() => setFocused(spot.id)} onBlur={() => setFocused(current => current === spot.id ? null : current)}
          onClick={e => open(spot.id, e.currentTarget)}>{`${spot.project.title}, at ${spot.name}`}</button>
      </li>)}
    </ul>
  </div>;
}
