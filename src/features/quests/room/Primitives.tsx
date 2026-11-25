import { useMemo } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type Vec = [number, number, number];
export const ink = '#382d20';
export const paper = '#f7f3df';
export const teal = '#519d87';
export const gold = '#f5b83d';
export const wood = '#d4a16b';
export const darkWood = '#a37550';

type Primitive = {
  at: Vec;
  size: Vec;
  color: string;
  rot?: Vec;
  glow?: boolean;
};

export function Block({ at, size, color, rot, radius = 0.045, glow }: Primitive & { radius?: number }) {
  const [x, y, z] = size;
  const geometry = useMemo(
    () => new RoundedBoxGeometry(x, y, z, 2, Math.min(x / 2, y / 2, z / 2, radius)),
    [x, y, z, radius],
  );
  return (
    <mesh position={at} rotation={rot} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.82}
        emissive={glow ? color : '#000000'}
        emissiveIntensity={glow ? 0.6 : 0}
      />
    </mesh>
  );
}

export function Oval({ at, size, color, rot, glow }: Primitive) {
  return (
    <mesh position={at} rotation={rot} scale={size} castShadow receiveShadow>
      <sphereGeometry args={[1, 20, 14]} />
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        emissive={glow ? color : '#000000'}
        emissiveIntensity={glow ? 0.72 : 0}
      />
    </mesh>
  );
}

export function Rod({
  at,
  length,
  radius,
  color,
  rot,
  top = radius,
}: {
  at: Vec;
  length: number;
  radius: number;
  color: string;
  rot?: Vec;
  top?: number;
}) {
  return (
    <mesh position={at} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[top, radius, length, 14]} />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  );
}

export function Contact({
  x,
  z,
  width = 0.5,
  depth = 0.32,
  y = 0.03,
}: {
  x: number;
  z: number;
  width?: number;
  depth?: number;
  y?: number;
}) {
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[width, depth, 1]}>
      <circleGeometry args={[1, 32]} />
      <meshBasicMaterial color="#815d41" transparent opacity={0.17} depthWrite={false} />
    </mesh>
  );
}
