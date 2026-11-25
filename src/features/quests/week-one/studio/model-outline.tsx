import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector2, type Object3D } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

export function ModelOutline({ target }: { target: Object3D | null }) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const effect = useRef<{ composer: EffectComposer; outline: OutlinePass } | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    const render = new RenderPass(scene, camera);
    const outline = new OutlinePass(new Vector2(size.width, size.height), scene, camera);
    const output = new OutputPass();
    outline.edgeStrength = 3.5;
    outline.edgeGlow = 0.25;
    outline.edgeThickness = 2.2;
    outline.visibleEdgeColor.set('#ffb83d');
    outline.hiddenEdgeColor.setRGB(0, 0, 0);
    composer.setSize(size.width, size.height);
    composer.addPass(render);
    composer.addPass(outline);
    composer.addPass(output);
    effect.current = { composer, outline };
    invalidate();

    return () => {
      effect.current = null;
      outline.dispose();
      output.dispose();
      composer.dispose();
    };
  }, [camera, gl, invalidate, scene, size.height, size.width]);

  useEffect(() => {
    invalidate();
  }, [invalidate, target]);

  useFrame(({ gl, scene, camera }, elapsed) => {
    if (effect.current) {
      effect.current.outline.enabled = target !== null;
      effect.current.outline.selectedObjects = target ? [target] : [];
      effect.current.composer.render(elapsed);
    } else {
      gl.render(scene, camera);
    }
  }, 1);

  return null;
}
