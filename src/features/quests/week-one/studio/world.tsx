import { useI18n } from '@/lib/i18n/I18n';
import { missionContent } from '@/curriculum/week-01/locales';
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, MapIcon, XCircleIcon } from 'naive-icons';
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { CanvasTexture, MathUtils, Mesh, PerspectiveCamera, SRGBColorSpace, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { translate, type Locale } from '@/lib/i18n/messages';
import { previousStudioMission } from '@/curriculum/week-01/manifest';
import { studioMissionIds as missionIds, type StudioMission as MissionId } from '@/contracts/studio';
import { guideCamera } from './guide-camera';
import { ModelOutline } from './model-outline';
import type { StoryView } from '@/curriculum/week-01/story';
import { Walkthrough, type WalkthroughStep } from './opening';
import { castPositions, desks, getGuide, guest, welcomeBench, type CastId } from './studio-layout';

const modelUrl = '/studio/models/classroom.glb';
type Mode = 'walk' | 'overview';
type Movement = 'forward' | 'back' | 'left' | 'right';
type Contact = { kind: 'desk'; id: MissionId } | { kind: 'guide'; id: CastId };
type DeskDenial = { id: MissionId; attempt: number };
type Controls = {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  orbit: number;
  keys: Set<Movement>;
  step?: Movement;
  contact?: string;
  render?: () => void;
};
const keys: Record<string, Movement | undefined> = {
  w: 'forward',
  a: 'left',
  s: 'back',
  d: 'right',
  ArrowUp: 'forward',
  ArrowDown: 'back',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};
const obstacles = [
  { x: 5.43, z: -4.4, halfX: 1.04, halfZ: 0.54 },
  { x: -5.63, z: -3.92, halfX: 0.42, halfZ: 0.42 },
  { x: 5.77, z: -0.55, halfX: 0.4, halfZ: 0.4 },
  { ...welcomeBench, halfX: 0.73, halfZ: 0.35 },
];
const characters = (Object.keys(castPositions) as CastId[]).map((id) => {
  const { x, z, scale } = castPositions[id];
  return { id, x, z: z + 0.13 * scale, halfX: 0.49 * scale, halfZ: 0.36 * scale };
});
const playerRadius = 0.28;

function touches(x: number, z: number, body: { x: number; z: number; halfX: number; halfZ: number }) {
  return Math.abs(x - body.x) < body.halfX + playerRadius && Math.abs(z - body.z) < body.halfZ + playerRadius;
}

function CameraRig({
  movement,
  mode,
  view,
  modelLoaded,
  onDesk,
  onCharacter,
  onWalk,
}: {
  movement: RefObject<Controls>;
  mode: Mode;
  view?: StoryView;
  modelLoaded: boolean;
  onDesk: (id: MissionId) => void;
  onCharacter: (id: CastId) => void;
  onWalk: () => void;
}) {
  const { invalidate, scene } = useThree();
  const shot = useMemo(() => {
    if (!view || view === 'whole-room') return undefined;
    return guideCamera(scene, view);
  }, [scene, view, modelLoaded]);
  useEffect(() => {
    movement.current.render = invalidate;
    invalidate();
    return () => {
      movement.current.render = undefined;
    };
  }, [invalidate, movement, mode, view, shot]);

  useFrame(({ camera, size }, elapsed) => {
    const state = movement.current;
    const overview = mode === 'overview' || view === 'whole-room';
    const fov = view && view !== 'whole-room' ? 46 : overview ? 50 : 57;
    const wide = size.width >= 793 && size.height >= 350;
    if (camera instanceof PerspectiveCamera) {
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      if (shot && wide) {
        const offset = -0.22 * size.width;
        if (
          camera.view?.offsetX !== offset ||
          camera.view?.fullHeight !== size.height ||
          !camera.view?.enabled
        ) {
          camera.setViewOffset(size.width, size.height, offset, 0, size.width, size.height);
        }
      } else if (camera.view?.enabled) camera.clearViewOffset();
    }
    if (shot) {
      camera.position.copy(shot.position);
      camera.lookAt(shot.target);
      return;
    }
    if (overview) {
      const radius = Math.max(view && wide ? 18 : 15, (15.4 * size.height) / size.width);
      const angle = view ? 0.42 : state.orbit;
      camera.position.set(Math.sin(angle) * radius, radius * 0.67, Math.cos(angle) * radius);
      camera.lookAt(view && wide ? -2.8 : 0, 0.36, 0.1);
      return;
    }

    const step = state.step;
    state.step = undefined;
    const direction = (key: Movement) => Number(step === key || state.keys.has(key));
    const forward = direction('forward') - direction('back');
    const right = direction('right') - direction('left');
    if (forward || right) {
      const distance = (step ? 0.52 : Math.min(elapsed, 0.05) * 3.5) / Math.hypot(forward, right);
      const dx = (forward * Math.sin(state.yaw) + right * Math.cos(state.yaw)) * distance;
      const dz = (-forward * Math.cos(state.yaw) + right * Math.sin(state.yaw)) * distance;
      const hits: Contact[] = [];
      const beforeX = state.x;
      const beforeZ = state.z;
      const slide = (x: number, z: number) => {
        const desk = desks.find((item) => touches(x, z, { ...item, halfX: 1.16, halfZ: 0.68 }));
        if (desk) {
          hits.push({ kind: 'desk', id: desk.id });
          return;
        }
        const character = characters.find((item) => touches(x, z, item));
        if (character) {
          hits.push({ kind: 'guide', id: character.id });
          return;
        }
        if (x < -6.15 || x > 6.15 || z < -4.51 || z > 4.67 || obstacles.some((item) => touches(x, z, item)))
          return;
        state.x = x;
        state.z = z;
      };
      if (dx) slide(state.x + dx, state.z);
      if (dz) slide(state.x, state.z + dz);
      if (state.x !== beforeX || state.z !== beforeZ) onWalk();
      const hit = hits[0];
      const contact = hit && hit.kind + ':' + hit.id;
      if (hit && state.contact !== contact) {
        state.keys.clear();
        if (hit.kind === 'desk') onDesk(hit.id);
        else onCharacter(hit.id);
      }
      state.contact = contact;
    }

    const eye = 1.84;
    camera.position.set(state.x, eye, state.z);
    camera.lookAt(state.x + Math.sin(state.yaw), eye + state.pitch, state.z - Math.cos(state.yaw));
    if (state.keys.size) invalidate();
  });
  return null;
}

function DeskSign({
  label,
  guide,
  x,
  z,
  active,
  y = 0.89,
  offset = 0.73,
}: {
  label: string;
  guide: string;
  x: number;
  z: number;
  active: boolean;
  y?: number;
  offset?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = active ? '#ffdf8d' : '#fff1d0';
      context.beginPath();
      context.roundRect(4, 4, 504, 152, 35);
      context.fill();
      context.lineWidth = 8;
      context.strokeStyle = '#ad8054';
      context.stroke();
      context.textAlign = 'center';
      context.fillStyle = '#654526';
      context.font = 'bold 48px system-ui, sans-serif';
      context.fillText(label, 256, 70, 470);
      context.font = 'bold 31px system-ui, sans-serif';
      context.fillText(guide, 256, 119, 458);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [label, guide, active]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[x, y, z + offset]}>
      <planeGeometry args={[1.42, 0.43]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

function DeskLockBadge({ x, z, denied }: { x: number; z: number; denied: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const paint = canvas.getContext('2d');
    if (paint) {
      paint.beginPath();
      paint.arc(64, 64, 56, 0, Math.PI * 2);
      paint.fillStyle = denied ? '#aa392e' : '#ffdf9d';
      paint.fill();
      paint.strokeStyle = denied ? '#fff0dc' : '#80502f';
      paint.lineWidth = 7;
      paint.stroke();
      paint.lineCap = 'round';
      if (denied) {
        paint.beginPath();
        paint.moveTo(43, 43);
        paint.lineTo(85, 85);
        paint.moveTo(85, 43);
        paint.lineTo(43, 85);
        paint.lineWidth = 12;
        paint.stroke();
      } else {
        paint.beginPath();
        paint.moveTo(47, 61);
        paint.lineTo(47, 49);
        paint.arc(64, 49, 17, Math.PI, 0);
        paint.lineTo(81, 61);
        paint.stroke();
        paint.beginPath();
        paint.roundRect(38, 56, 52, 38, 8);
        paint.fillStyle = '#80502f';
        paint.fill();
        paint.beginPath();
        paint.arc(64, 74, 4, 0, Math.PI * 2);
        paint.fillStyle = '#ffdf9d';
        paint.fill();
      }
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [denied]);
  useEffect(() => () => texture.dispose(), [texture]);
  const size = denied ? 0.61 : 0.39;
  return (
    <sprite position={[x + (denied ? 0 : 0.45), denied ? 1.65 : 1.28, z + 0.76]} scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

type ModelTarget = { object: Object3D; label: string; station?: MissionId; character?: CastId };

function modelOf(object: Object3D | null): ModelTarget | null {
  for (let node = object; node; node = node.parent) {
    if (typeof node.userData.label !== 'string') continue;
    const { label, station, character } = node.userData as {
      label: string;
      station?: MissionId;
      character?: CastId;
    };
    return { object: node, label: character ? getGuide(character).name : label, station, character };
  }
  return null;
}

function ClassroomModel({
  current,
  view,
  hovered,
  onHover,
  onDesk,
  onCharacter,
  ready,
  unlocked,
  denial,
  locale,
}: {
  locale: Locale;
  current: number;
  view?: StoryView;
  hovered: ModelTarget | null;
  onHover: (target: ModelTarget | null) => void;
  onDesk: (id: MissionId) => void;
  onCharacter: (id: CastId) => void;
  ready: () => void;
  unlocked: (id: MissionId) => boolean;
  denial?: DeskDenial;
}) {
  const { scene } = useLoader(GLTFLoader, modelUrl);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    scene.traverse((item) => {
      if (item instanceof Mesh) {
        item.receiveShadow = true;
        item.castShadow = !/floorboard|weave|fringe|beadboard|trim|mat/i.test(item.name);
      }
    });
    ready();
  }, [scene, ready]);

  useEffect(() => {
    gl.domElement.style.cursor = !view && (hovered?.station || hovered?.character) ? 'pointer' : '';
    return () => {
      gl.domElement.style.cursor = '';
    };
  }, [gl, hovered, view]);

  function click(event: ThreeEvent<MouseEvent>, model: ModelTarget | null) {
    event.stopPropagation();
    if (view || event.delta >= 5) return;
    if (model?.character) onCharacter(model.character);
    else if (model?.station) onDesk(model.station);
  }

  function hover(event: ThreeEvent<PointerEvent>, model: ModelTarget | null) {
    event.stopPropagation();
    if (!view && event.pointerType !== 'touch' && event.buttons === 0) onHover(model);
  }

  const featured = view && view !== 'whole-room' ? scene.getObjectByName('Model_cast_' + view) : undefined;
  return (
    <>
      <ModelOutline target={view ? (featured ?? null) : (hovered?.object ?? null)} />
      <primitive
        object={scene}
        dispose={null}
        onClick={(event: ThreeEvent<MouseEvent>) => click(event, modelOf(event.object))}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => hover(event, modelOf(event.object))}
        onPointerOut={() => onHover(null)}
      />
      {desks.map((desk, index) => {
        const target = modelOf(scene.getObjectByName('Model_desk_' + desk.id) ?? null);
        const locked = !view && !unlocked(desk.id);
        return (
          <group
            key={desk.id}
            onClick={(event) => click(event, target)}
            onPointerMove={(event) => hover(event, target)}
            onPointerOut={() => onHover(null)}
          >
            <DeskSign
              {...desk}
              active={index === current}
              label={missionContent(desk.id, locale).label}
              guide={locked ? translate(locale, 'locked') + ' · ' + desk.name : desk.name}
            />
            {locked && <DeskLockBadge x={desk.x} z={desk.z} denied={denial?.id === desk.id} />}
          </group>
        );
      })}
      <group
        onClick={(event) => click(event, modelOf(scene.getObjectByName('Model_cast_gokhan') ?? null))}
        onPointerMove={(event) => hover(event, modelOf(scene.getObjectByName('Model_cast_gokhan') ?? null))}
        onPointerOut={() => onHover(null)}
      >
        <DeskSign
          {...welcomeBench}
          y={0.51}
          offset={0.36}
          active={false}
          label={guest.name}
          guide={translate(locale, 'welcomeBench')}
        />
      </group>
    </>
  );
}

class WorldBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type WalkthroughControls = { done: () => void; replay: () => void };

export function ClassroomWorld({
  current,
  view,
  overlay,
  tutorial,
  unlocked,
  denial,
  onDesk,
  onCharacter,
}: {
  current: number;
  view?: StoryView;
  overlay?: ReactNode;
  tutorial?: WalkthroughControls;
  unlocked: (id: MissionId) => boolean;
  denial?: DeskDenial;
  onDesk: (id: MissionId) => void;
  onCharacter: (id: CastId) => void;
}) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<Mode>('walk');
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState<ModelTarget | null>(null);
  const [step, setStep] = useState<WalkthroughStep>(0);
  const [moved, setMoved] = useState(false);
  const [looked, setLooked] = useState(false);
  const ready = useMemo(() => () => setLoaded(true), []);
  const [hasWebGL] = useState(() => {
    try {
      const context = document.createElement('canvas').getContext('webgl2');
      context?.getExtension('WEBGL_lose_context')?.loseContext();
      return Boolean(context);
    } catch {
      return false;
    }
  });
  const room = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; moved: boolean } | undefined>(undefined);
  const start = desks[current];
  const movement = useRef<Controls>({
    x: start.x,
    z: Math.min(start.z + 3.04, 4.47),
    yaw: 0,
    pitch: -0.08,
    orbit: 0.52,
    keys: new Set(),
  });
  useEffect(() => {
    if (!view) return;
    movement.current.keys.clear();
    drag.current = undefined;
    setHovered(null);
  }, [view]);
  const showingTutorial = Boolean(tutorial);
  useEffect(() => {
    if (showingTutorial) return;
    setStep(0);
    setMoved(false);
    setLooked(false);
  }, [showingTutorial]);
  useEffect(() => {
    if (loaded && !view && !tutorial && document.activeElement === document.body)
      room.current?.focus({ preventScroll: true });
  }, [loaded, tutorial, view]);

  const fallback = <p className="world-fallback">{t('worldFallback')}</p>;
  function focusRoom() {
    room.current?.focus({ preventScroll: true });
  }
  function closeTutorial() {
    tutorial?.done();
    if (hasWebGL) focusRoom();
    else document.getElementById('room-title')?.focus({ preventScroll: true });
  }
  function changeMode(next: Mode) {
    movement.current.keys.clear();
    setHovered(null);
    setMode(next);
    focusRoom();
  }
  function walk(direction: Movement) {
    movement.current.step = direction;
    movement.current.render?.();
  }
  function turn(amount: number) {
    if (mode === 'walk') movement.current.yaw += amount;
    else movement.current.orbit = MathUtils.clamp(movement.current.orbit + amount, -1.12, 1.12);
    setHovered(null);
    if (tutorial) setLooked(true);
    movement.current.render?.();
  }
  function faceFirstDesk() {
    const first = desks[0];
    const state = movement.current;
    state.keys.clear();
    state.contact = undefined;
    state.x = first.x;
    state.z = Math.min(first.z + 3.04, 4.47);
    state.yaw = 0;
    state.pitch = -0.08;
    setMode('walk');
    setHovered(null);
    state.render?.();
  }
  function tryDesk(id: MissionId) {
    if (view || (tutorial && step !== 2 && unlocked(id))) return;
    onDesk(id);
  }
  function tryCharacter(id: CastId) {
    if (view || (tutorial && step !== 2 && (id === 'gokhan' || unlocked(id)))) return;
    onCharacter(id);
  }
  function highlight(model: ModelTarget | null) {
    setHovered((previous) => (previous?.object === model?.object ? previous : model));
  }
  const hoveredDesk = hovered?.station ?? (hovered?.character === 'gokhan' ? undefined : hovered?.character);
  const hoverLocked = hoveredDesk !== undefined && !unlocked(hoveredDesk);
  const previousMission = denial ? previousStudioMission(denial.id) : undefined;

  return (
    <div
      className="world"
      aria-label={t('worldLabel')}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !tutorial || view) return;
        event.preventDefault();
        closeTutorial();
      }}
    >
      <div className="world-scene">
        <div
          className="room-viewport world-viewport"
          ref={room}
          tabIndex={hasWebGL && !view ? 0 : undefined}
          aria-label={t('worldScene')}
          aria-describedby={view ? undefined : 'world-guidance'}
          data-world-ready={loaded || undefined}
          inert={Boolean(view)}
          onBlur={() => movement.current.keys.clear()}
          onPointerLeave={() => highlight(null)}
          onKeyDown={(event) => {
            if (view) return;
            if (mode === 'overview' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
              event.preventDefault();
              turn(event.key === 'ArrowLeft' ? -0.2 : 0.2);
              return;
            }
            const direction = keys[event.key] ?? keys[event.key.toLowerCase()];
            if (mode !== 'walk' || !direction || event.metaKey || event.altKey || event.ctrlKey) return;
            event.preventDefault();
            movement.current.keys.add(direction);
            movement.current.render?.();
          }}
          onKeyUp={(event) => {
            const direction = keys[event.key] ?? keys[event.key.toLowerCase()];
            if (direction) movement.current.keys.delete(direction);
          }}
          onPointerDown={(event) => {
            if (view || event.button !== 0) return;
            focusRoom();
            drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false };
          }}
          onPointerMove={(event) => {
            const pointer = drag.current;
            if (!pointer || pointer.id !== event.pointerId) return;
            const dx = event.clientX - pointer.x,
              dy = event.clientY - pointer.y;
            if (!pointer.moved && Math.hypot(dx, dy) < 5) return;
            if (!pointer.moved) {
              event.currentTarget.setPointerCapture(event.pointerId);
              highlight(null);
            }
            if (mode === 'walk') {
              movement.current.yaw += dx * 0.009;
              movement.current.pitch = MathUtils.clamp(movement.current.pitch - dy * 0.008, -1.18, 0.78);
            } else movement.current.orbit = MathUtils.clamp(movement.current.orbit - dx * 0.007, -1.12, 1.12);
            if (tutorial) setLooked(true);
            drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: true };
            movement.current.render?.();
          }}
          onPointerUp={() => {
            drag.current = undefined;
          }}
          onPointerCancel={() => {
            drag.current = undefined;
          }}
        >
          {hasWebGL ? (
            <WorldBoundary fallback={fallback}>
              {!loaded && (
                <p className="world-fallback" role="status">
                  {t('openingClassroom')}
                </p>
              )}
              <Canvas
                dpr={[1, 1.5]}
                gl={{ antialias: true }}
                camera={{ fov: 57, near: 0.05, far: 95 }}
                shadows="soft"
                frameloop="demand"
                fallback={fallback}
                aria-hidden="true"
              >
                <color attach="background" args={['#e3ece0']} />
                <hemisphereLight args={['#fff0d8', '#9bbcaa', 2.15]} />
                <directionalLight
                  position={[-4.4, 8.8, 5]}
                  intensity={2.55}
                  color="#ffe8c5"
                  castShadow
                  shadow-mapSize={[1024, 1024]}
                  shadow-camera-left={-10}
                  shadow-camera-right={10}
                  shadow-camera-top={9}
                  shadow-camera-bottom={-9}
                  shadow-bias={-0.0018}
                  shadow-normalBias={0.022}
                />
                <CameraRig
                  movement={movement}
                  mode={mode}
                  view={view}
                  modelLoaded={loaded}
                  onDesk={tryDesk}
                  onCharacter={tryCharacter}
                  onWalk={() => {
                    setHovered(null);
                    if (tutorial) setMoved(true);
                  }}
                />
                <Suspense fallback={null}>
                  <ClassroomModel
                    {...{ current, view, hovered, ready, unlocked, denial, locale }}
                    onHover={highlight}
                    onDesk={tryDesk}
                    onCharacter={tryCharacter}
                  />
                </Suspense>
              </Canvas>
            </WorldBoundary>
          ) : (
            fallback
          )}
          {hovered && !view && (!denial || hoveredDesk !== denial.id) && (
            <p className="model-tooltip" role="tooltip">
              {hovered.station && hovered.object.name.startsWith('Model_desk_') ? (
                missionContent(hovered.station, locale).label
              ) : (
                <span lang="en">{hovered.label}</span>
              )}
              {hoverLocked && ' · ' + t('locked')}
            </p>
          )}
        </div>
        <div className="scene-lock-feedback" role="status" aria-atomic="true">
          {denial && previousMission && !view && (
            <div className="scene-lock-message" key={denial.attempt}>
              <XCircleIcon size={24} aria-hidden="true" />
              <div>
                <strong>{t('deskLocked', { desk: missionContent(denial.id, locale).label })}</strong>
                <p>{t('finishToUnlock', { mission: missionContent(previousMission, locale).name })}</p>
              </div>
            </div>
          )}
        </div>
        {overlay ??
          (tutorial && (
            <Walkthrough
              {...{ step, moved, looked }}
              select={setStep}
              walk={() => {
                changeMode('walk');
                walk('forward');
              }}
              turn={() => {
                turn(0.31);
                focusRoom();
              }}
              face={faceFirstDesk}
              open={() => onDesk(missionIds[0])}
              close={closeTutorial}
              replay={tutorial.replay}
              hasScene={loaded}
            />
          ))}
      </div>
      {!view && (
        <div className="world-controls">
          <p id="world-guidance">{mode === 'walk' ? t('walkGuidance') : t('overviewGuidance')}</p>
          {loaded && (
            <div className="world-buttons">
              <button
                className="quiet"
                type="button"
                aria-pressed={mode === 'overview'}
                onClick={() => changeMode(mode === 'walk' ? 'overview' : 'walk')}
              >
                {mode === 'walk' ? (
                  <>
                    <MapIcon size={18} /> {t('roomOverview')}
                  </>
                ) : (
                  t('walkAround')
                )}
              </button>
              <div
                className="directions"
                aria-label={mode === 'walk' ? t('walkControls') : t('overviewControls')}
              >
                <button
                  type="button"
                  className="quiet icon-control"
                  aria-label={t('turnLeft')}
                  onClick={() => turn(-0.31)}
                >
                  <ArrowLeftIcon size={18} />
                </button>
                {mode === 'walk' && (
                  <>
                    <button
                      type="button"
                      className="quiet icon-control"
                      aria-label={t('stepForward')}
                      onClick={() => walk('forward')}
                    >
                      <ArrowUpIcon size={18} />
                    </button>
                    <button
                      type="button"
                      className="quiet icon-control"
                      aria-label={t('stepBack')}
                      onClick={() => walk('back')}
                    >
                      <ArrowDownIcon size={18} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="quiet icon-control"
                  aria-label={t('turnRight')}
                  onClick={() => turn(0.31)}
                >
                  <ArrowRightIcon size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
