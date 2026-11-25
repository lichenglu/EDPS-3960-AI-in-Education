import { useEffect, useRef, useState } from 'react';
import type P5 from 'p5';
import type { IntroScene } from '@/contracts/intro-film';
import { drawFilm } from './draw-film';
import { ease } from './paint';

type FilmCanvasProps = {
  scene: IntroScene;
  progress: number;
  playing: boolean;
  reducedMotion: boolean;
};

export function FilmCanvas({ scene, progress, playing, reducedMotion }: FilmCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const requestDraw = useRef<(() => void) | undefined>(undefined);
  const position = reducedMotion ? 1 : Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const current = useRef({ scene, position, playing });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    current.current = { scene, position, playing };
    requestDraw.current?.();
  }, [scene, position, playing]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    if (typeof ResizeObserver === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setFailed(true);
      return;
    }
    let sketch: P5 | undefined;
    let lastScene: string | undefined;
    let outgoing: HTMLCanvasElement | undefined;
    let requestedFrame = 0;
    let disposed = false;
    let ready = false;
    let inView = true;
    let drawing = false;
    let changed = false;

    // Playback comes from the player clock. Keep p5 in noLoop mode so neither
    // a paused film nor a hidden iframe runs an independent drawing loop.
    function schedule() {
      changed = true;
      if (disposed || !ready || !inView || document.hidden || requestedFrame || drawing) return;
      requestedFrame = requestAnimationFrame(() => {
        requestedFrame = 0;
        const width = element?.clientWidth ?? 0;
        if (!sketch || disposed || !inView || document.hidden || !width) return;
        const height = Math.round((width * 9) / 16);
        changed = false;
        drawing = true;
        try {
          if (sketch.width !== width || sketch.height !== height) sketch.resizeCanvas(width, height, true);
          void sketch
            .redraw()
            .catch(fail)
            .finally(() => {
              drawing = false;
              if (changed) schedule();
            });
        } catch {
          fail();
        }
      });
    }

    const resize = new ResizeObserver(schedule);
    resize.observe(element);
    const visibility = new IntersectionObserver(([entry]) => {
      inView = Boolean(entry?.isIntersecting);
      if (inView) schedule();
    });
    visibility.observe(element);
    document.addEventListener('visibilitychange', schedule);
    requestDraw.current = schedule;

    function dispose() {
      if (disposed) return;
      disposed = true;
      requestDraw.current = undefined;
      cancelAnimationFrame(requestedFrame);
      resize.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      sketch?.remove();
    }

    function fail() {
      if (disposed) return;
      dispose();
      setFailed(true);
    }

    void import('zod/v4')
      .then(({ config }) => {
        // p5's validation uses Zod, which otherwise probes runtime code generation.
        config({ jitless: true });
        return import('p5');
      })
      .then(({ default: P5Sketch }) => {
        if (disposed) return;
        sketch = new P5Sketch((p) => {
          // React owns loading. A detached indicator lets p5 2.3.4 skip its
          // default spinner, which injects a style blocked by our CSP.
          (p as P5 & { _loadingIndicator?: HTMLElement })._loadingIndicator = document.createElement('span');
          p.setup = () => {
            if (disposed) return;
            try {
              p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
              const width = Math.max(element.clientWidth, 1);
              const canvas = p.createCanvas(width, Math.max(1, Math.round((width * 9) / 16)));
              canvas.elt.setAttribute('aria-hidden', 'true');
              canvas.elt.style.display = 'block';
              p.noLoop();
              ready = true;
              schedule();
              void document.fonts
                ?.load('bold 16px "Course Nunito"')
                .then(schedule)
                .catch(() => undefined);
            } catch {
              fail();
            }
          };
          p.draw = () => {
            if (disposed || !inView || document.hidden || !element.clientWidth) return;
            const { scene: activeScene, position: activePosition } = current.current;
            try {
              const canvas = element.querySelector('canvas');
              if (lastScene && lastScene !== activeScene.id && current.current.playing && canvas) {
                outgoing = document.createElement('canvas');
                outgoing.width = canvas.width;
                outgoing.height = canvas.height;
                outgoing.getContext('2d')?.drawImage(canvas, 0, 0);
              }
              lastScene = activeScene.id;
              drawFilm(p, activeScene, activePosition);
              const fade = ease((activePosition * activeScene.duration) / 0.9);
              if (outgoing && fade < 1 && current.current.playing) {
                const context = p.drawingContext as CanvasRenderingContext2D;
                context.save();
                context.resetTransform();
                context.globalAlpha = 1 - fade;
                context.drawImage(outgoing, 0, 0, canvas?.width ?? p.width, canvas?.height ?? p.height);
                context.restore();
              } else outgoing = undefined;
            } catch {
              fail();
            }
          };
        }, element);
      })
      .catch(fail);

    return dispose;
  }, []);

  if (failed) return <p className="intro-film-visual-fallback">{scene.description}</p>;
  return (
    <div
      ref={host}
      className="intro-film-canvas"
      role="img"
      aria-label={scene.description}
      data-playing={playing}
      style={{ aspectRatio: '16 / 9', width: '100%', overflow: 'hidden' }}
    />
  );
}
