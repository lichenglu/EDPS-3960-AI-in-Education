import { Mesh, Raycaster, Vector3, type Object3D } from 'three';
import { castPositions, type CastId } from './studio-layout';

const shots = [
  [0, 2.68, 3.2],
  [0.95, 2.76, 3.05],
  [-0.95, 2.76, 3.05],
  [1.36, 3.03, 2.8],
  [-1.36, 3.03, 2.8],
  [0, 3.35, 2.85],
];

export function guideCamera(scene: Object3D, id: CastId) {
  const { x, z, scale } = castPositions[id];
  const target = new Vector3(x, 0.09 + 0.89 * scale, z + 0.09);
  const model = scene.getObjectByName('Model_cast_' + id);
  const points = [
    new Vector3(x, 0.09 + 1.07 * scale, z + 0.38 * scale),
    new Vector3(x, 0.09 + 0.6 * scale, z + 0.2 * scale),
  ];
  const ray = new Raycaster();
  const solidMeshes: Mesh[] = [];
  scene.traverse((part) => {
    if (part instanceof Mesh && part.visible) solidMeshes.push(part);
  });
  scene.updateMatrixWorld(true);
  function clearSightline(from: Vector3, point: Vector3) {
    const direction = point.clone().sub(from);
    ray.far = direction.length();
    ray.set(from, direction.normalize());
    const hit = ray.intersectObjects(solidMeshes, false)[0];
    if (!hit) return true;
    for (let part: Object3D | null = hit.object; part; part = part.parent) {
      if (part === model) return true;
    }
    return false;
  }
  const candidates = shots.map(([dx, y, dz]) => new Vector3(x + dx, y, z + dz));
  const position =
    candidates.find((candidate) => points.every((point) => clearSightline(candidate, point))) ??
    candidates.find((candidate) => clearSightline(candidate, points[0])) ??
    candidates[candidates.length - 1];
  return { position, target };
}
