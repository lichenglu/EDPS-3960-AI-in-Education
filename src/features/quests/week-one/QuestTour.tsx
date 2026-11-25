import Tour, { type TourProps } from '@rc-component/tour';
import { CloseIcon } from 'naive-icons';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import './quest-tour.css';

const placement: TourProps['builtinPlacements'] = {
  top: { points: ['bc', 'tc'], offset: [0, -12], overflow: { adjustY: true, shiftX: 12 }, autoArrow: true },
  bottom: { points: ['tc', 'bc'], offset: [0, 12], overflow: { adjustY: true, shiftX: 12 }, autoArrow: true },
};

export function QuestTour({
  target,
  title,
  description,
  onDismiss,
}: {
  target: HTMLElement;
  title: string;
  description: string;
  onDismiss: () => void;
}) {
  const id = useId();
  const panel = useRef<HTMLElement>(null);
  const [visibleTarget, setVisibleTarget] = useState<HTMLElement | null>(null);
  const visible = visibleTarget === target && target.isConnected;

  const dismiss = useCallback(() => {
    if (panel.current?.contains(document.activeElement)) {
      const selector =
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), summary, a[href]';
      const control = target.matches(selector) ? target : target.querySelector<HTMLElement>(selector);
      control?.focus({ preventScroll: true });
    }
    onDismiss();
  }, [onDismiss, target]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setVisibleTarget(entry.isIntersecting ? target : null);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [target]);

  useLayoutEffect(() => {
    if (!visible) return;
    const descriptions = () => (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    target.setAttribute('aria-describedby', [...descriptions(), id].join(' '));
    target.setAttribute('data-guide-active', '');
    return () => {
      const remaining = descriptions().filter((value) => value !== id);
      if (remaining.length) target.setAttribute('aria-describedby', remaining.join(' '));
      else target.removeAttribute('aria-describedby');
      target.removeAttribute('data-guide-active');
    };
  }, [id, target, visible]);

  useEffect(() => {
    if (!visible) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !event.isComposing &&
        !document.querySelector('dialog[open]')
      ) {
        event.preventDefault();
        dismiss();
      }
    };
    // The engine tracks window scroll. Commit its anchor update before it measures the popup.
    const handleScroll = (event: Event) => {
      if (event.target instanceof Element && event.target.contains(target)) {
        flushSync(() => window.dispatchEvent(new Event('scroll')));
      }
    };
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    const resize = new ResizeObserver(() => window.dispatchEvent(new Event('scroll')));
    resize.observe(target);
    const region = target.closest('.scene-dialogue, .quest-paper');
    if (region) resize.observe(region);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
      resize.disconnect();
    };
  }, [dismiss, target, visible]);

  if (!visible) return null;

  return (
    <div className="quest-tour-layer">
      <Tour
        open
        mask={false}
        keyboard={false}
        getPopupContainer={false}
        prefixCls="quest-tour-popup"
        placement="bottom"
        builtinPlacements={placement}
        arrow={{ pointAtCenter: true }}
        gap={{ offset: 4 }}
        steps={[{ target, title, description }]}
        renderPanel={() => (
          <section className="quest-tour-panel" aria-label="Quest guidance" ref={panel}>
            <div id={id}>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
            <button type="button" className="quest-tour-dismiss" aria-label="Dismiss guide" onClick={dismiss}>
              <CloseIcon size={18} aria-hidden="true" />
            </button>
          </section>
        )}
      />
    </div>
  );
}
