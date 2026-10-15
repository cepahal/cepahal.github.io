import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { AlwaysDepth, CanvasTexture, DepthTexture, Matrix4, Mesh, MeshLambertMaterial, MeshStandardMaterial, NoBlending, OrthographicCamera, PlaneGeometry, SRGBColorSpace, Scene as ThreeScene, ShaderMaterial, Vector2, Vector3, WebGLRenderTarget } from 'three';
import type { BufferGeometry, DirectionalLight, Group, HemisphereLight, MeshLambertMaterialParameters, SpotLight } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { campusBuildings } from '../data/campus';
import type { BuildingId } from '../data/campus';
import { projectIllustration, projects } from '../data/projects';
import type { Project } from '../data/projects';
import { corners } from './campus/kit';
import type { V3 } from './campus/kit';
import { buildingIds, sites, toWorld } from './campus/landmarks';
import { createFleet } from './campus/PaperPlanes';
import { DEPTH, HALF, buildCampus } from './campus/scenery';
import Glyph from './Glyph';
import { aimLamp, lamp, onLampFrame } from './HangingLamp';

// Capable desktops get physically based materials (warm highlights from the lamp) and lamp shadows; phones,
// low-core or low-memory machines and software GPUs get Lambert shading, smaller shadow maps and a lower DPR cap.
type Tier = 'high' | 'low';
function guessTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = matchMedia('(pointer: coarse)').matches || (nav.hardwareConcurrency ?? 8) < 4 || (nav.deviceMemory ?? 8) < 4;
  return weak ? 'low' : 'high';
}
const SOFTWARE_GPU = /swiftshader|llvmpipe|software|basic render/i;
const surface = (tier: Tier, params: MeshLambertMaterialParameters = {}) =>
  tier === 'high' ? new MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0, ...params }) : new MeshLambertMaterial({ vertexColors: true, ...params });

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
    const shift = (top - bottom) / 2 + 0.2 * spare;
    const y = frame.midY + shift / (Math.sin(POLAR) * camera.zoom);
    // Tell the hanging lamp where the block lands on screen, so its pool of light frames it.
    const box = gl.domElement.getBoundingClientRect();
    aimLamp({ x: box.left + size.width / 2, y: box.top + size.height / 2 + shift, rx: frame.halfW * camera.zoom, ry: frame.halfH * camera.zoom });
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
  tier: Tier;
  handlers: BuildingHandlers;
}

function Landmark({ id, geometry, spot, active, intro, reduced, tier, handlers }: LandmarkProps) {
  const site = sites[id];
  const body = useRef<Group>(null);
  const material = useMemo(() => surface(tier, { emissive: '#FFF1D0', emissiveIntensity: 0 }), [tier]);

  useFrame((state, dt) => {
    const group = body.current;
    if (!group) return;
    // Pop up during the intro, then lift and glow while hovered or selected.
    const grow = progress(intro.current, popDelay(id), POP), pop = easeOutBack(grow);
    group.scale.set(0.7 + 0.3 * pop, Math.max(0.001, pop), 0.7 + 0.3 * pop);
    group.visible = grow > 0; // not even a flat footprint before it pops up
    const lift = active ? 0.14 : 0;
    group.position.y = damp(group.position.y, lift, dt, reduced);
    const glow = material.emissiveIntensity;
    material.emissiveIntensity = damp(glow, active ? 0.18 : 0, dt, reduced);
    if ((intro.current !== null && grow < 1) || group.position.y !== lift) {
      state.invalidate();
      state.gl.shadowMap.needsUpdate = true; // this building's shadow is moving
      campusChanged();
    } else if (material.emissiveIntensity !== glow) {
      state.invalidate();
      campusChanged();
    }
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
  const seen = useMemo(() => ({ matrix: new Matrix4(), projection: new Matrix4() }), []);
  useFrame(({ camera, size, gl }) => {
    camera.updateMatrixWorld();
    // The planes keep frames coming, so skip the DOM work unless the view moved, the intro is still popping the
    // buildings up, or a bubble is open.
    const moved = !seen.matrix.equals(camera.matrixWorld) || !seen.projection.equals(camera.projectionMatrix);
    const introRunning = intro.current === null || performance.now() < intro.current + 420 + buildingIds.length * 90 + POP + 100;
    if (!moved && !introRunning && !activeId) return;
    seen.matrix.copy(camera.matrixWorld); seen.projection.copy(camera.projectionMatrix);
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

/**
 * Daylight plus the hanging lamp. As the lamp comes down (lamp.focus → 1) the daylight dims and a warm spotlight
 * takes over; the spotlight always sits up toward the top of the screen, where the lamp hangs, and sways with it.
 */
function Lights({ tier }: { tier: Tier }) {
  const sky = useRef<HemisphereLight>(null), sun = useRef<DirectionalLight>(null), spot = useRef<SpotLight>(null);
  const camera = useThree(state => state.camera);
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => onLampFrame(() => { campusChanged(); invalidate(); }), [invalidate]);
  useFrame(() => {
    const f = lamp.focus, swing = (lamp.swing * Math.PI) / 180;
    if (sky.current) sky.current.intensity = 1.7 - 0.5 * f;
    if (sun.current) sun.current.intensity = 1.9 - 0.75 * f;
    const light = spot.current;
    if (!light) return;
    // Toward the camera and across the screen, measured from above the block. A positive swing turns the lamp
    // clockwise on screen, carrying the light to the left (−screen-right), same as the 2D beam.
    const azimuth = Math.atan2(camera.position.x, camera.position.z), sa = Math.sin(azimuth), ca = Math.cos(azimuth);
    const lean = -Math.sin(swing) * 4, reach = -Math.tan(swing) * 14;
    light.position.set(sa * 4 + ca * lean, 16, ca * 4 - sa * lean);
    light.target.position.set(ca * reach, 0, -sa * reach);
    light.target.updateMatrixWorld();
    light.intensity = 1.6 * f;
    light.angle = 0.72 + (1 - f) * 0.4; // narrows onto the block as the lamp lowers
  });
  return <>
    <hemisphereLight ref={sky} args={['#EEF3FF', '#F3E3C4', 1.7]} />
    <directionalLight ref={sun} castShadow position={[-7, 13, 8]} intensity={1.9} shadow-mapSize={tier === 'high' ? [2048, 2048] : [1024, 1024]}
      shadow-bias={-0.0004} shadow-normalBias={0.035} shadow-radius={3}>
      <orthographicCamera attach="shadow-camera" args={[-11, 11, 11, -11, 1, 40]} />
    </directionalLight>
    {/* Stays in the scene at zero intensity when the lamp is up, so switching never recompiles shaders. It casts no
        shadows of its own: the sun's shadow map stays static while the lamp sways, so a sway costs one plain render. */}
    <spotLight ref={spot} color="#FFC983" intensity={0} angle={1.1} penumbra={0.65} decay={0} />
  </>;
}

// Bumped whenever anything in the campus itself changes (a building lifting, the trees growing, the lamp's light),
// so the plane compositor knows its cached picture of the campus is stale. Camera moves it detects itself.
let campusVersion = 0;
const campusChanged = () => { campusVersion++; };

/**
 * Draws the paper planes into the map with correct occlusion, without re-rendering the campus every frame. While the
 * campus is changing (the camera moving, a building lifting, the lamp swaying) each frame is drawn directly, planes
 * included. Once it settles, the campus (colour and depth) is rendered once into an off-screen target, and every frame
 * after that just copies it back and draws the planes against its depth, so buildings still hide them.
 */
function PlaneCompositor({ flying, light }: { flying: boolean; light: boolean }) {
  const gl = useThree(state => state.gl), scene = useThree(state => state.scene), camera = useThree(state => state.camera);
  const invalidate = useThree(state => state.invalidate);
  const fleet = useMemo(() => createFleet(light ? 2 : 3), [light]);
  const parts = useMemo(() => {
    const cache = new WebGLRenderTarget(1, 1, { samples: 4, depthTexture: new DepthTexture(1, 1) });
    cache.texture.colorSpace = SRGBColorSpace;
    const copy = new ShaderMaterial({
      uniforms: { tColor: { value: cache.texture }, tDepth: { value: cache.depthTexture } },
      vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tColor;', 'uniform sampler2D tDepth;', 'varying vec2 vUv;',
        'void main() {', '  gl_FragColor = texture2D(tColor, vUv);', '  gl_FragDepth = texture2D(tDepth, vUv).x;', '  #include <colorspace_fragment>', '}',
      ].join('\n'),
      depthFunc: AlwaysDepth, blending: NoBlending, toneMapped: false,
    });
    const quad = new Mesh(new PlaneGeometry(2, 2), copy);
    quad.frustumCulled = false;
    return { cache, copy, quad, view: new ThreeScene().add(quad), screen: new OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, []);
  const seen = useRef({ version: -1, matrix: new Matrix4(), projection: new Matrix4(), cached: false });
  const clock = useRef({ seconds: 0, skip: false });
  const buffer = useMemo(() => new Vector2(), []);

  useEffect(() => () => fleet.dispose(), [fleet]);
  useEffect(() => () => {
    parts.cache.dispose(); parts.cache.depthTexture?.dispose(); parts.copy.dispose(); parts.quad.geometry.dispose();
  }, [parts]);
  useEffect(() => { if (flying) invalidate(); }, [flying, invalidate]);

  // Priority 1: runs after everything else has updated, and takes over drawing the frame.
  useFrame((state, dt) => {
    const { cache, view, screen } = parts, last = seen.current;
    gl.getDrawingBufferSize(buffer);
    if (buffer.x !== cache.width || buffer.y !== cache.height) { cache.setSize(buffer.x, buffer.y); last.cached = false; }
    camera.updateMatrixWorld();
    const changed = last.version !== campusVersion || !last.matrix.equals(camera.matrixWorld) || !last.projection.equals(camera.projectionMatrix);
    if (flying) state.invalidate();
    // Phones and weaker machines move the planes at 30 fps; a frame with nothing else to show is skipped outright.
    if (light && flying && !changed && (clock.current.skip = !clock.current.skip)) { clock.current.seconds += dt; return; }
    if (flying) clock.current.seconds += Math.min(dt, 0.1);
    fleet.fly(clock.current.seconds);
    if (changed) {
      last.version = campusVersion; last.matrix.copy(camera.matrixWorld); last.projection.copy(camera.projectionMatrix);
      last.cached = false;
      gl.render(scene, camera);
    } else {
      if (!last.cached) {
        gl.setRenderTarget(cache);
        gl.render(scene, camera);
        gl.setRenderTarget(null);
        last.cached = true;
      }
      gl.render(view, screen);
    }
    gl.autoClear = false;
    gl.render(fleet.scene, camera);
    gl.autoClear = true;
  }, 1);
  return null;
}

interface SceneProps extends Omit<OverlayProps, 'intro'> {
  introOn: boolean;
  reduced: boolean;
  tier: Tier;
  onSpin: (spinning: boolean) => void;
  handlers: BuildingHandlers;
}

function Scene({ activeId, introOn, reduced, tier, bubbleRef, dotRefs, onSpin, handlers }: SceneProps) {
  const campus = useMemo(buildCampus, []);
  const matte = useMemo(() => surface(tier), [tier]);
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
  const trees = useRef<Mesh>(null), props = useRef<Mesh>(null);
  const intro = useRef<number | null>(null);
  const invalidate = useThree(state => state.invalidate);

  // The intro waits until the room is actually on screen (not behind the welcome letter).
  useEffect(() => {
    if (!introOn || intro.current !== null) return;
    intro.current = reduced ? -1e9 : performance.now();
    invalidate();
  }, [introOn, reduced, invalidate]);
  useEffect(() => { invalidate(); }, [activeId, invalidate]);
  // Shadow maps are only rendered on request (see onCreated), so a freshly mounted scene asks for one.
  const gl = useThree(state => state.gl);
  useEffect(() => { gl.shadowMap.needsUpdate = true; invalidate(); }, [gl, invalidate]);
  useFrame(state => {
    const grow = progress(intro.current, 200, 750), rise = progress(intro.current, 420, POP);
    for (const [mesh, t] of [[trees.current, grow], [props.current, rise]] as const) {
      if (!mesh) continue;
      mesh.scale.set(1, Math.max(0.001, easeOutBack(t)), 1);
      mesh.visible = t > 0;
    } // the filler halls pop up alongside the landmarks
    if (intro.current !== null && (grow < 1 || rise < 1)) {
      state.invalidate();
      state.gl.shadowMap.needsUpdate = true;
      campusChanged();
    }
  });

  return <>
    {!reduced && <PlaneCompositor flying={introOn} light={tier === 'low'} />}
    <Lights tier={tier} />
    <CameraRig reduced={reduced} onSpin={onSpin} />
    <mesh geometry={campus.ground} material={matte} receiveShadow />
    <mesh geometry={campus.decals} material={matte} receiveShadow />
    <mesh ref={props} geometry={campus.props} material={matte} castShadow receiveShadow />
    <mesh ref={trees} geometry={campus.trees} material={matte} castShadow receiveShadow />
    {buildingIds.map(id => <Landmark key={id} id={id} geometry={campus.landmarks[id]} spot={spots[id]} active={activeId === id}
      intro={intro} reduced={reduced} tier={tier} handlers={handlers} />)}
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
  const [tier, setTier] = useState<Tier>(guessTier);
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
    <Canvas orthographic frameloop="demand" shadows="percentage" flat dpr={tier === 'high' ? [1, 1.5] : [1, 1.25]} camera={{ position: START, zoom: 20, near: 0.1, far: 100 }}
      onPointerMissed={() => setSelected(null)}
      onCreated={({ gl }) => {
        // The sun is fixed in the world, so orbiting the camera never changes its shadow map; it is re-rendered
        // only on frames where something casting a shadow moves (the intro, a building lifting on hover).
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;
        const context = gl.getContext(), info = context.getExtension('WEBGL_debug_renderer_info');
        if (info && SOFTWARE_GPU.test(String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)))) setTier('low');
      }}>
      {/* Keyed on the tier so a downgrade rebuilds lights and shadow maps at their new sizes. */}
      <Scene key={tier} activeId={activeId} introOn={active} reduced={reduced} tier={tier} bubbleRef={bubbleRef} dotRefs={dotRefs} onSpin={setSpinning} handlers={handlers} />
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
