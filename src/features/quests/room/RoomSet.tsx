import { useMemo } from 'react';
import { Color, Shape, DoubleSide } from 'three';
import { Block, Contact, darkWood, gold, ink, Oval, paper, Rod, teal, type Vec, wood } from './Primitives';
import { Figure } from './RoomFigures';

export type Station = 'entrance' | 'supply' | 'bench' | 'shelf' | 'desk' | 'map';
export const targets: Record<Station, Vec> = {
  entrance: [-0.8, 0.8, 0.48],
  supply: [0.05, 0.85, 1.03],
  bench: [1.76, 1.34, -0.75],
  shelf: [2.65, 1.21, 0.04],
  desk: [-2.1, 0.99, -0.65],
  map: [0, 2.21, -1.55],
};
const floorColors = [
  '#d6aa76',
  '#e6ba82',
  '#eabd88',
  '#dfb781',
  '#e8bf87',
  '#dfb482',
  '#e9c28e',
  '#e2b580',
  '#ebc38f',
];
const stars = [
  [-0.97, 0.27],
  [-0.89, 0.49],
  [-0.66, 0.18],
  [-0.48, 0.4],
  [-0.21, 0.5],
  [0.07, 0.36],
  [0.28, 0.49],
  [0.53, 0.19],
  [0.77, 0.36],
  [1.04, 0.44],
];

function Hill({ points, color, z }: { points: number[][]; color: string; z: number }) {
  const shape = useMemo(() => {
    const path = new Shape();
    path.moveTo(-1.58, -0.56);
    path.lineTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length - 1; index++) {
      const [x, y] = points[index];
      const [nextX, nextY] = points[index + 1];
      path.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2);
    }
    path.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
    path.lineTo(1.58, -0.56);
    path.closePath();
    return path;
  }, [points]);
  return (
    <mesh position={[0, 0, z]}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={color} side={DoubleSide} />
    </mesh>
  );
}
const distant = [
  [-1.58, -0.07],
  [-1.17, 0.22],
  [-0.94, 0.04],
  [-0.51, 0.35],
  [-0.26, 0.11],
  [0.16, 0.29],
  [0.55, -0.02],
  [0.96, 0.29],
  [1.15, 0.12],
  [1.58, 0.37],
];
const close = [
  [-1.58, -0.27],
  [-1.2, -0.09],
  [-0.98, -0.15],
  [-0.63, 0.02],
  [-0.28, -0.18],
  [0.12, -0.06],
  [0.42, 0.04],
  [0.9, -0.12],
  [1.22, 0.08],
  [1.58, -0.13],
];

function Flower({ color }: { color: string }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((petal) => {
        const angle = (petal * Math.PI * 2) / 5;
        return (
          <Oval
            key={petal}
            at={[Math.sin(angle) * 0.074, Math.cos(angle) * 0.074, 0]}
            size={[0.06, 0.082, 0.012]}
            rot={[0, 0, -angle]}
            color={color}
          />
        );
      })}
      <Oval at={[0, 0, 0.014]} size={[0.044, 0.044, 0.014]} color={gold} />
    </>
  );
}

const skyColors = new Float32Array(
  ['#edaa98', '#edaa98', '#ffe3c4', '#ffe3c4'].flatMap((color) => new Color(color).toArray()),
);
const foothills = [
  [-1.58, -0.45],
  [-1.1, -0.22],
  [-0.74, -0.4],
  [-0.28, -0.24],
  [0.04, -0.36],
  [0.54, -0.18],
  [0.84, -0.28],
  [1.29, -0.2],
  [1.58, -0.37],
];

function Window({ filed }: { filed: boolean }) {
  return (
    <group position={[0, 2.1, -1.922]}>
      <Block at={[0, 0, 0.015]} size={[3.39, 1.43, 0.17]} color={darkWood} />
      <mesh position={[0, 0, 0.122]}>
        <planeGeometry args={[3.17, 1.21]}>
          <bufferAttribute attach="attributes-color" args={[skyColors, 3]} />
        </planeGeometry>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <Oval at={[0.7, 0.35, 0.135]} size={[0.155, 0.155, 0.009]} color="#ffedbc" glow />
      {stars.map(([x, y], i) => (
        <Oval key={i} at={[x * 1.35, y, 0.135]} size={[0.013, 0.013, 0.009]} color={paper} glow />
      ))}
      <Oval at={[-0.76, 0.32, 0.135]} size={[0.28, 0.045, 0.008]} color="#ffe2ba" />
      <Oval at={[-0.83, 0.35, 0.137]} size={[0.11, 0.066, 0.008]} color="#ffe2ba" />
      <Hill points={distant} color="#c9e6a0" z={0.147} />
      <Hill points={close} color="#8fcf6b" z={0.151} />
      <Hill points={foothills} color="#4f8f5a" z={0.158} />
      {[-1.3, -1.05, -0.73, -0.55, -0.22, 0.04, 0.31, 0.54, 0.84, 1.12, 1.35].map((x, i) => (
        <group key={x} position={[x, -0.43 + (i % 3) * 0.038, 0.162]}>
          <Block at={[0, 0, 0]} size={[0.097, 0.111, 0.012]} color="#f0cd94" />
          <Block at={[0, 0.045, 0.021]} size={[0.079, 0.079, 0.014]} rot={[0, 0, 0.785]} color="#b47056" />
          <Block
            at={[0, -0.01, 0.034]}
            size={[0.032, 0.033, 0.006]}
            color={filed ? gold : '#856852'}
            glow={filed}
          />
        </group>
      ))}
      {[-0.97, 0.98].map((x) => (
        <Block key={x} at={[x, 0, 0.209]} size={[0.057, 1.25, 0.07]} color="#cc9f72" />
      ))}
      <group position={[0, 0.64, 0.23]}>
        <Block at={[0, 0.05, 0]} size={[3.56, 0.15, 0.28]} color="#c08d61" />
        {Array.from({ length: 13 }, (_, i) => (
          <group key={i} position={[(i - 6) * 0.264, 0, 0.05]}>
            <Block at={[0, 0, 0]} size={[0.265, 0.13, 0.25]} color={i % 2 ? '#fff0c8' : '#d89179'} />
            <Oval at={[0, -0.056, 0.101]} size={[0.132, 0.07, 0.038]} color={i % 2 ? '#fff0c8' : '#d89179'} />
          </group>
        ))}
      </group>
      <Block at={[0, -0.634, 0.17]} size={[3.57, 0.124, 0.35]} color={wood} />
    </group>
  );
}

function Table({
  at,
  width,
  depth,
  height = 0.83,
}: {
  at: Vec;
  width: number;
  depth: number;
  height?: number;
}) {
  return (
    <group position={at}>
      <Contact x={0} z={0} width={width * 0.53} depth={depth * 0.6} y={0.031} />
      <Block at={[0, height, 0]} size={[width, 0.146, depth]} radius={0.08} color="#e6be86" />
      <Block at={[0, height - 0.11, 0]} size={[width - 0.14, 0.1, depth - 0.13]} color="#bf915c" />
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Block
            key={`${x}${z}`}
            at={[x * (width / 2 - 0.159), height / 2 - 0.07, z * (depth / 2 - 0.12)]}
            size={[0.113, height - 0.09, 0.119]}
            rot={[z * 0.045, 0, -x * 0.047]}
            color={darkWood}
          />
        )),
      )}
    </group>
  );
}
function Books({ at }: { at: Vec }) {
  return (
    <group position={at}>
      {['#66a18f', '#e7bc75', '#d88a72', '#7faaa9', '#e5ce9f'].map((color, i) => (
        <group key={color} position={[i * 0.107, 0, 0]} rotation={[0, 0, i === 4 ? -0.11 : 0]}>
          <Block
            at={[0, 0.166 + (i % 2) * 0.024, 0]}
            size={[0.089, 0.329 + (i % 2) * 0.049, 0.205]}
            color={color}
          />
          <Block at={[0, 0.119, 0.106]} size={[0.065, 0.012, 0.009]} color={paper} />
        </group>
      ))}
    </group>
  );
}
function Plant({ at, scale = 1 }: { at: Vec; scale?: number }) {
  return (
    <group position={at} scale={scale}>
      <Rod at={[0, 0.12, 0]} radius={0.138} top={0.183} length={0.24} color="#cf8e79" />
      <Rod at={[0, 0.242, 0]} radius={0.184} length={0.043} color="#e6bd94" />
      {[-1.2, -0.49, 0.18, 0.68, 1.13].map((a, i) => (
        <Oval
          key={a}
          at={[Math.sin(a) * 0.125, 0.35 + (i % 2) * 0.048, Math.cos(a) * 0.04]}
          size={[0.079, 0.148, 0.043]}
          color={i % 2 ? '#89ba85' : '#4d947c'}
          rot={[0.18, 0, -a * 0.68]}
        />
      ))}
    </group>
  );
}
function Bottle({ at, color, scale = 1 }: { at: Vec; color: string; scale?: number }) {
  return (
    <group position={at} scale={scale}>
      <Oval at={[0, 0.13, 0]} size={[0.097, 0.119, 0.086]} color={color} />
      <Rod at={[0, 0.24, 0]} length={0.11} radius={0.04} color={color} />
      <Rod at={[0, 0.299, 0]} length={0.044} radius={0.043} color="#ad7f58" />
      <Block at={[0, 0.138, 0.079]} size={[0.082, 0.066, 0.01]} color={paper} rot={[0, 0, -0.1]} />
    </group>
  );
}
function Tray({ opened }: { opened: boolean }) {
  return (
    <group position={[0.04, 0.802, 1.027]}>
      <Block at={[0, 0.023, 0]} size={[0.651, 0.068, 0.365]} color="#986947" />
      {[-1, 1].map((n) => (
        <Block key={n} at={[n * 0.306, 0.073, 0]} size={[0.05, 0.104, 0.365]} color="#d5ab77" />
      ))}
      <Block at={[0, 0.068, 0.157]} size={[0.62, 0.081, 0.046]} color="#d5ab77" />
      <group position={[0, 0.079, -0.149]} rotation={[opened ? -1.12 : 0, 0, 0]}>
        <Block at={[0, 0, 0.142]} size={[0.648, 0.042, 0.329]} color={opened ? '#c28e59' : '#deba84'} />
        <Block at={[0, 0.028, 0.184]} size={[0.198, 0.014, 0.123]} color={teal} />
      </group>
      {opened && (
        <>
          <Block at={[0.057, 0.084, 0.03]} size={[0.34, 0.017, 0.208]} color={paper} rot={[0, -0.09, 0]} />
          <Block at={[0.009, 0.097, 0.06]} size={[0.18, 0.008, 0.022]} color={teal} />
        </>
      )}
    </group>
  );
}

function Monitor({ replayed }: { replayed: boolean }) {
  return (
    <group position={[1.67, 1.18, -0.99]} rotation={[0, -0.06, 0]} scale={1.16}>
      <Block at={[0, -0.19, 0]} size={[0.097, 0.22, 0.102]} color={darkWood} />
      <Block at={[0, 0, 0]} size={[0.673, 0.456, 0.125]} color={ink} />
      <Block at={[0, 0.012, 0.07]} size={[0.591, 0.367, 0.02]} color={replayed ? '#244b51' : '#2d494b'} />
      <group position={[replayed ? -0.107 : -0.009, 0.017, 0.091]} scale={replayed ? 0.76 : 1}>
        <Oval at={[0, -0.032, 0]} size={[0.139, 0.107, 0.024]} color="#19c8b9" glow />
        <Oval at={[0.093, 0.053, 0.01]} size={[0.103, 0.082, 0.023]} color="#a5dfca" glow />
        <Oval at={[0.163, 0.037, 0.017]} size={[0.07, 0.036, 0.029]} color="#bde9d9" glow />
        <Oval at={[0.113, 0.069, 0.037]} size={[0.014, 0.017, 0.01]} color={ink} />
        <Oval at={[-0.133, -0.059, 0]} size={[0.093, 0.036, 0.017]} color="#6bbbac" glow rot={[0, 0, 0.24]} />
        {[-0.083, -0.029, 0.025].map((x, i) => (
          <Oval key={x} at={[x, 0.011 + i * 0.011, 0.029]} size={[0.026, 0.025, 0.007]} color="#327f7b" />
        ))}
      </group>
      {replayed && (
        <group position={[0.157, 0.006, 0.101]}>
          {[0.066, -0.043].map((y, index) => (
            <group key={y} position={[0, y, 0]}>
              <Block at={[0, 0, 0]} size={[0.184, 0.083, 0.01]} color={index ? '#91cec4' : '#f1d7a3'} glow />
              <Block at={[-0.017, 0, 0.01]} size={[0.097, 0.017, 0.008]} color="#365f62" />
            </group>
          ))}
        </group>
      )}
      <Oval
        at={[0.274, -0.167, 0.094]}
        size={[0.016, 0.016, 0.011]}
        color={replayed ? gold : '#aec9a7'}
        glow
      />
    </group>
  );
}

export function RoomSet({ opened, replayed, filed }: { opened: boolean; replayed: boolean; filed: boolean }) {
  return (
    <>
      <Block at={[0, -0.35, 0.1]} size={[7.25, 0.57, 4.89]} radius={0.23} color="#8fcf6b" />
      <Block at={[0, -0.105, 0.1]} size={[7.13, 0.153, 4.81]} radius={0.11} color={darkWood} />
      <Block at={[0, -0.59, 0.1]} size={[7.17, 0.13, 4.81]} radius={0.064} color="#a57e59" />
      {[
        [-3.48, 1.97],
        [3.41, 1.94],
        [3.43, -1.12],
      ].map(([x, z], index) => (
        <group key={x} position={[x, -0.075, z]} rotation={[0, index * 0.73, 0]}>
          <Oval at={[0, 0, 0]} size={[0.23, 0.125, 0.16]} color="#4f8f5a" />
          <Oval at={[0.025, 0.068, -0.04]} size={[0.14, 0.13, 0.13]} color="#8fcf6b" />
          <Oval at={[-0.11, 0.055, 0.05]} size={[0.119, 0.085, 0.116]} color="#7cb771" />
        </group>
      ))}
      <group position={[0, -0.36, 2.551]}>
        <Block at={[0, 0, 0]} size={[0.79, 0.24, 0.034]} radius={0.1} color="#75997a" />
        <Block at={[0, 0.014, 0.017]} size={[0.72, 0.185, 0.044]} radius={0.09} color="#e0c592" />
        <Oval at={[-0.051, 0.02, 0.045]} size={[0.092, 0.043, 0.013]} rot={[0, 0, -0.46]} color={teal} />
        <Oval at={[0.065, 0.04, 0.045]} size={[0.091, 0.045, 0.014]} rot={[0, 0, 0.53]} color={teal} />
        {[-0.276, 0.276].map((x) => (
          <Oval key={x} at={[x, 0.014, 0.047]} size={[0.021, 0.021, 0.01]} color={darkWood} />
        ))}
      </group>
      {floorColors.map((color, i) => (
        <Block
          key={i}
          at={[0, -0.035, -1.977 + i * 0.523]}
          size={[7.06, 0.082, 0.514]}
          radius={0.024}
          color={color}
        />
      ))}
      <Block at={[0, 1.31, -2.12]} size={[7.06, 2.69, 0.22]} color="#f7f3df" />
      <Block at={[0, 2.68, -2.12]} size={[7.16, 0.135, 0.29]} color="#90bc98" />
      <Block at={[0, 0.29, -1.956]} size={[7.03, 0.57, 0.11]} color="#9ec7a4" />
      <Block at={[0, 0.581, -1.93]} size={[7.05, 0.069, 0.136]} color="#d3d7ab" />
      <Block at={[-3.46, 0.52, 0.04]} size={[0.157, 1.06, 4.35]} color="#adcfae" />
      <Block at={[-3.46, 1.066, 0.04]} size={[0.207, 0.104, 4.4]} color="#d3d7ab" />
      {[-3.39, -1.76, 1.76, 3.39].map((x) => (
        <Block key={x} at={[x, 1.32, -1.983]} size={[0.115, 2.57, 0.15]} color={darkWood} />
      ))}
      {[-1, 1].map((side) => (
        <Block
          key={side}
          at={[side * 3.13, 2.36, -1.984]}
          size={[0.103, 0.76, 0.141]}
          rot={[0, 0, -side * 0.7]}
          color={wood}
        />
      ))}
      {[
        -3.18, -2.92, -2.66, -2.4, -2.14, -1.88, -1.62, -1.36, -1.1, -0.84, -0.58, -0.32, -0.06, 0.2, 0.46,
        0.72, 0.98, 1.24, 1.5, 1.76, 2.02, 2.28, 2.54, 2.8, 3.06, 3.32,
      ].map((x) => (
        <Block key={x} at={[x, 0.281, -1.891]} size={[0.022, 0.53, 0.015]} radius={0.003} color="#88ad8e" />
      ))}
      <Window filed={filed} />
      <Block at={[0, 0.023, 0.67]} size={[3.94, 0.032, 2.459]} radius={0.065} color="#549b87" />
      <Block at={[0, 0.044, 0.67]} size={[3.76, 0.015, 2.28]} radius={0.055} color="#e7d9aa" />
      <Block at={[0, 0.054, 0.67]} size={[3.65, 0.011, 2.16]} radius={0.05} color="#97c6a7" />
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-0.69, -0.48, -0.27, -0.06, 0.15, 0.36, 0.57, 0.78, 0.99, 1.2, 1.41, 1.62, 1.83].map((z) => (
            <Block key={z} at={[side * 1.995, 0.025, z]} size={[0.101, 0.022, 0.057]} color="#efdcb0" />
          ))}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.46, 0.064, 1.5]} rotation={[-Math.PI / 2, 0, side * 0.24]}>
          <Flower color="#f6dda5" />
          <Oval
            at={[side * 0.18, 0.06, 0]}
            size={[0.107, 0.04, 0.007]}
            rot={[0, 0, side * 0.49]}
            color="#659e81"
          />
        </group>
      ))}
      <Table at={[-2.19, 0, -0.6]} width={1.65} depth={0.8} height={0.77} />
      <Figure
        species="panda"
        at={[-2.2, 0.43, -1.224]}
        angle={filed ? 0.19 : 0.11}
        scale={1.17}
        pose={filed ? 'waving' : 'resting'}
      />
      <Block
        at={[-2.12, 0.868, -0.49]}
        size={[0.44, 0.038, 0.327]}
        color={filed ? teal : '#bb9865'}
        rot={[0, -0.18, 0]}
      />
      <Block at={[-2.12, 0.89, -0.49]} size={[0.31, 0.01, 0.245]} color={paper} rot={[0, -0.18, 0]} />
      {filed && <Oval at={[-2.07, 0.902, -0.46]} size={[0.061, 0.012, 0.061]} color="#c98155" />}
      <Books at={[-2.93, 0.855, -0.75]} />
      <Block at={[-2.37, 2.03, -1.938]} size={[1.09, 0.074, 0.34]} color={wood} />
      <Books at={[-2.82, 2.075, -1.89]} />
      <Plant at={[-2.03, 2.076, -1.92]} scale={0.64} />
      <Table at={[0.015, 0, 0.966]} width={1.54} depth={0.78} height={0.722} />
      <Block at={[0, 0.799, 0.966]} size={[0.81, 0.012, 0.775]} radius={0.004} color="#bddab4" />
      <Figure
        species="monkey"
        at={[-0.94, 0.069, 0.37]}
        angle={opened ? 0.37 : 0.13}
        scale={1.2}
        pose={opened ? 'pointing' : 'resting'}
      />
      <Figure
        species="red-panda"
        at={[0.789, 0.069, 0.164]}
        angle={replayed ? -0.26 : -0.1}
        scale={1.22}
        pose={replayed ? 'pointing' : 'resting'}
      />
      <Block at={[0.015, 0.219, 0.966]} size={[1.34, 0.06, 0.6]} color={wood} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.31, 0.27, 0.985]}>
          <Block at={[0, 0.1, 0]} size={[0.499, 0.22, 0.432]} color={side < 0 ? '#81b79b' : '#dfa185'} />
          <Block at={[0, 0.132, 0.218]} size={[0.122, 0.024, 0.013]} color={darkWood} />
        </group>
      ))}
      <Tray opened={opened} />
      <Block at={[-0.481, 0.811, 1.01]} size={[0.241, 0.025, 0.288]} color={paper} rot={[0, -0.1, 0]} />
      <Rod at={[0.52, 0.838, 1.05]} radius={0.02} length={0.28} color={gold} rot={[0, 0.22, 1.47]} />
      <Table at={[1.85, 0, -0.86]} width={1.63} depth={0.76} />
      <Monitor replayed={replayed} />
      {[0, 1, 2].map((i) => (
        <Block
          key={i}
          at={[1.5 + 0.19 * i, 0.923, -0.612]}
          size={[0.145, 0.04, 0.13]}
          color={replayed && i === 2 ? gold : ['#93a99a', '#d0aa76', '#c29679'][i]}
        />
      ))}
      <Plant at={[2.38, 0.918, -1.03]} scale={0.72} />
      <group position={[2.32, 2.11, -1.84]}>
        <Rod at={[0, 0, 0]} radius={0.037} length={0.23} color={darkWood} />
        <Rod at={[0, -0.142, 0.043]} radius={0.153} top={0.078} length={0.15} color={teal} />
        <Oval at={[0, -0.215, 0.043]} size={[0.12, 0.042, 0.12]} color="#ffda8b" glow />
      </group>
      <group position={[2.8, 0, 0.13]}>
        <Block at={[0, 0.618, 0]} size={[0.91, 1.153, 0.472]} color={teal} />
        <Block at={[0, 0.698, 0.238]} size={[0.779, 0.707, 0.03]} color="#538574" />
        <Block at={[0, 0.453, 0.253]} size={[0.826, 0.068, 0.232]} color={wood} />
        <Block at={[0, 1.216, 0]} size={[0.99, 0.1, 0.55]} color="#e6be86" />
        <Bottle at={[-0.183, 1.267, 0]} color="#76cbb7" scale={1.13} />
        <Bottle at={[0.132, 1.267, 0.051]} color="#91bbca" />
        <Books at={[-0.266, 0.491, 0.246]} />
      </group>
      <group position={[2.68, 2.18, -1.91]} rotation={[0, 0, -0.04]}>
        <Block at={[0, 0, 0]} size={[0.76, 0.72, 0.1]} color={darkWood} />
        <Block at={[0, 0, 0.06]} size={[0.658, 0.604, 0.031]} color="#ecd3a8" />
        <group position={[0, 0.07, 0.1]} scale={1.24}>
          <Flower color="#e4a980" />
        </group>
        <Block at={[0, -0.125, 0.091]} size={[0.025, 0.17, 0.015]} color={teal} />
        <Oval at={[0.065, -0.14, 0.11]} size={[0.083, 0.028, 0.014]} rot={[0, 0, 0.42]} color={teal} />
      </group>
      <Plant at={[-2.95, 0.014, 1.54]} scale={1.33} />
      <group position={[-1.46, 0, -0.84]}>
        <Rod at={[0, 0.111, 0]} radius={0.173} top={0.129} length={0.083} color={darkWood} />
        <Rod at={[0, 0.722, 0]} radius={0.034} length={1.25} color="#ac895c" />
        <Rod at={[0, 1.484, 0]} radius={0.255} top={0.128} length={0.25} color="#efb564" />
        <Oval at={[0, 1.358, 0]} size={[0.205, 0.062, 0.205]} color="#ffd791" glow />
      </group>
    </>
  );
}
