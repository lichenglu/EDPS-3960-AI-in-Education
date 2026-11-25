import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Vector3 } from 'three';
import { gold, Oval, type Vec } from './Primitives';
import { RoomSet, targets, type Station } from './RoomSet';
import { stations, stationStills } from '../week-one/room-content';
export interface WorkshopRoomProps {
  station: Station;
  opened: boolean;
  replayed: boolean;
  filed: boolean;
  onInspect?: () => void;
  disabled?: boolean;
}

const stationDescriptions: Record<Station, string> = {
  entrance: 'Eunseo and Yinqi stand at the supply table. Chenglu sits behind them at the director’s desk.',
  supply: 'Eunseo and Yinqi stand on either side of the evidence tray.',
  bench: 'Pip, the AI tutor, appears as a teal pangolin on a monitor behind three rule tiles.',
  shelf: 'Drift Bottles stand on the shelf, ready for notes from the class.',
  desk: 'Chenglu keeps the director’s folder and ledger on a lamp-lit desk.',
  map: 'The moon rises over the peach sky and green hills outside the workshop window.',
};
const focus: Record<Station, Vec> = {
  entrance: [0, 1.09, 0.04],
  supply: [-0.07, 0.74, 0.65],
  bench: [1.55, 0.95, -0.67],
  shelf: [2.29, 0.87, 0.13],
  desk: [-1.98, 0.99, -0.79],
  map: [0, 1.64, -1.32],
};
const widths: Record<Station, number> = {
  entrance: 8.9,
  supply: 5.2,
  bench: 4.65,
  shelf: 4.35,
  desk: 4.6,
  map: 5.75,
};

function CameraRig({ station, reduced }: { station: Station; reduced: boolean }) {
  const { camera, size, invalidate } = useThree();
  const center = useRef(new Vector3());
  const initial = useRef(true);
  const wideSupply = station === 'supply' && size.width >= 640;
  const destination = useMemo(
    () => (wideSupply ? new Vector3(-0.14, 1.1, 0.42) : new Vector3(...focus[station])),
    [station, wideSupply],
  );
  const offset = useMemo(() => new Vector3(2.65, 3.6, 9.8), []);
  const narrow = size.width < 520;
  const viewHeight = station === 'entrance' ? 5.7 : wideSupply ? 3.79 : 3.31;
  const viewWidth = wideSupply ? 5.82 : widths[station];
  const zoom = Math.min(size.width / (viewWidth * (narrow ? 0.91 : 1)), size.height / viewHeight);
  useLayoutEffect(() => {
    invalidate();
  }, [destination, zoom, reduced, invalidate]);
  useFrame((_, delta) => {
    if (!(camera instanceof OrthographicCamera)) return;
    const snap = initial.current || reduced;
    const mix = snap ? 1 : 1 - Math.exp(-Math.min(delta, 0.12) * 8);
    center.current.lerp(destination, mix);
    camera.position.copy(center.current).add(offset);
    camera.lookAt(center.current);
    camera.zoom += (zoom - camera.zoom) * mix;
    camera.updateProjectionMatrix();
    initial.current = false;
    if (center.current.distanceToSquared(destination) > 0.000003 || Math.abs(zoom - camera.zoom) > 0.025)
      invalidate();
  });
  return null;
}

function ObjectAction({
  station,
  onInspect,
  disabled,
}: {
  station: Station;
  onInspect: () => void;
  disabled: boolean;
}) {
  if (disabled) return null;
  const [x, y, z] = targets[station];
  return (
    <group
      position={[x, y, z]}
      onClick={(event) => {
        event.stopPropagation();
        onInspect();
      }}
    >
      <mesh position={[0, 0.17, 0]}>
        <sphereGeometry args={[0.37, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group position={[0, 0.49, 0.04]} rotation={[0.045, 0.34, Math.PI / 4]}>
        <mesh renderOrder={3}>
          <torusGeometry args={[0.104, 0.023, 9, 4]} />
          <meshBasicMaterial color={gold} depthTest={false} />
        </mesh>
        <Oval at={[0, 0, 0]} size={[0.032, 0.032, 0.032]} color="#ffe7a0" glow />
      </group>
    </group>
  );
}

class RoomBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  return reduced;
}

export default function WorkshopRoom({
  station,
  opened,
  replayed,
  filed,
  onInspect,
  disabled = false,
}: WorkshopRoomProps) {
  const reduced = useReducedMotion();
  const descriptionId = useId();
  const description = [
    stationDescriptions[station],
    opened ? 'The tray is open and a record is visible.' : 'The evidence tray is closed.',
    replayed ? 'Pip’s monitor shows two reply cards from the replay.' : 'Pip’s monitor is ready for a test.',
    filed
      ? 'Chenglu has sealed the folder. The lit village windows mark the filed decision.'
      : 'The director’s folder awaits a decision.',
  ].join(' ');
  const [failed, setFailed] = useState(false);
  const [rendered, setRendered] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  const canvasElement = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => () => canvasElement.current?.removeEventListener('webglcontextlost', fail), [fail]);
  const showFallback = failed || !rendered;
  return (
    <div
      className="workshop-room"
      role="group"
      aria-label={stations[station]}
      aria-describedby={descriptionId}
    >
      <p className="visually-hidden" id={descriptionId} role="status" aria-atomic="true">
        {description}
      </p>
      {showFallback && (
        <figure className="workshop-room__concept">
          <img src={stationStills[station]} alt={stationDescriptions[station]} />
          <figcaption>
            {stations[station]} · {station === 'entrance' ? 'Opening view' : 'Station illustration'}
          </figcaption>
        </figure>
      )}
      {!failed && (
        <div className="workshop-room__canvas" aria-hidden="true">
          <RoomBoundary onFailure={fail}>
            <Canvas
              shadows="percentage"
              orthographic
              camera={{
                near: 0.1,
                far: 80,
                position: [3.6, 5.3, 9.2],
                zoom: 65,
              }}
              frameloop="demand"
              dpr={[1, 1.5]}
              gl={{
                alpha: true,
                antialias: true,
                powerPreference: 'low-power',
              }}
              fallback={null}
              onCreated={({ gl }) => {
                canvasElement.current = gl.domElement;
                gl.domElement.addEventListener('webglcontextlost', fail, {
                  once: true,
                });
                setRendered(true);
              }}
            >
              <hemisphereLight args={['#fff3dc', '#c5bd9d', 1.05]} />
              <directionalLight
                castShadow
                color="#ffedcb"
                intensity={2.15}
                position={[-3.2, 6.3, 5.3]}
                shadow-mapSize={[1024, 1024]}
                shadow-intensity={0.48}
                shadow-radius={3}
                shadow-normalBias={0.014}
                shadow-bias={-0.0004}
                shadow-camera-left={-5}
                shadow-camera-right={5}
                shadow-camera-top={4.5}
                shadow-camera-bottom={-4.5}
              />
              <directionalLight color="#cef3df" intensity={1.17} position={[2.9, 3.7, -2.8]} />
              <CameraRig station={station} reduced={reduced} />
              <RoomSet opened={opened} replayed={replayed} filed={filed} />
              {onInspect && <ObjectAction station={station} onInspect={onInspect} disabled={disabled} />}
            </Canvas>
          </RoomBoundary>
        </div>
      )}
    </div>
  );
}
