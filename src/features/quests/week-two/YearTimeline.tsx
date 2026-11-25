import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { WeekTwoProgress } from '@/contracts/week-two';
import { weekTwoMilestones, type WeekTwoMilestoneId } from '@/curriculum/week-02/lesson';
import './year-timeline.css';

type TimelineStop = WeekTwoMilestoneId | 'future';
type Destination = TimelineStop | 'intro' | 'replay' | 'quick-check';

export function YearTimeline({
  state,
  active,
  next,
  revealed,
  unlocked,
  onOpen,
  demo,
  textOnly = false,
}: {
  state: WeekTwoProgress;
  active: Destination;
  next: Destination;
  revealed: ReadonlySet<WeekTwoMilestoneId>;
  unlocked: WeekTwoMilestoneId | undefined;
  onOpen: (destination: TimelineStop) => void;
  demo: boolean;
  textOnly?: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLButtonElement>(null);
  const [scroll, setScroll] = useState({ earlier: false, later: false });
  const [animationYear, setAnimationYear] = useState<WeekTwoMilestoneId>();
  const branchOpen = revealed.has('1980') || state.completedMilestones.includes('1980');
  const futureOpen = demo || state.replayComplete;
  const stops = [
    ...weekTwoMilestones.map((stop) => {
      const open = revealed.has(stop.id) || state.completedMilestones.includes(stop.id);
      const available = demo || open || stop.id === next;
      return {
        id: stop.id,
        year: stop.year,
        title: stop.title,
        open,
        available,
        label: `${stop.year} · ${open ? stop.title : available ? 'open mystery' : 'locked'}`,
      };
    }),
    {
      id: 'future' as const,
      year: '20??',
      title: 'The exciting unknown',
      open: futureOpen,
      available: futureOpen,
      label: futureOpen ? 'Open the future proposal' : '20?? · Future stop locked',
    },
  ];

  function updateScroll(strip: HTMLDivElement) {
    const earlier = strip.scrollLeft > 1;
    const later = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1;
    setScroll((previous) =>
      previous.earlier === earlier && previous.later === later ? previous : { earlier, later },
    );
  }

  useEffect(() => {
    const strip = viewport.current;
    if (!strip) return;
    const resize = new ResizeObserver(() => updateScroll(strip));
    resize.observe(strip);
    if (strip.firstElementChild) resize.observe(strip.firstElementChild);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    const strip = viewport.current;
    const button = current.current;
    if (!strip || !button || strip.scrollWidth <= strip.clientWidth) return;
    const stripRect = strip.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    if (buttonRect.left < stripRect.left || buttonRect.right > stripRect.right) {
      strip.scrollLeft += buttonRect.left - stripRect.left + (buttonRect.width - stripRect.width) / 2;
    }
  }, [active]);

  useEffect(() => {
    if (!unlocked || textOnly || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const marker = current.current?.querySelector('.w02-observatory__marker');
    if (!marker) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < 0.75) return;
        setAnimationYear(unlocked);
        observer.disconnect();
      },
      { threshold: 0.75 },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [unlocked, textOnly]);

  const animating = unlocked === animationYear ? unlocked : undefined;

  function scrollYears(direction: number) {
    const strip = viewport.current;
    if (!strip) return;
    const reducedMotion = textOnly || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    strip.scrollBy({
      left: direction * strip.clientWidth * 0.75,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }

  return (
    <nav className="w02-observatory" aria-label="Timeline milestones" data-text-only={textOnly}>
      <div className="w02-observatory__head">
        <h2>Timeline</h2>
        <div className="w02-observatory__controls">
          <p>
            <strong>{state.completedMilestones.length}</strong> of {weekTwoMilestones.length} years opened
          </p>
          {(scroll.earlier || scroll.later) && (
            <div className="w02-observatory__arrows">
              <button
                type="button"
                aria-label="Scroll to earlier years"
                disabled={!scroll.earlier}
                onClick={() => scrollYears(-1)}
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                aria-label="Scroll to later years"
                disabled={!scroll.later}
                onClick={() => scrollYears(1)}
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        className="w02-observatory__viewport"
        ref={viewport}
        role="group"
        aria-label="Years in chronological order"
        tabIndex={0}
        onScroll={(event) => updateScroll(event.currentTarget)}
      >
        <ol
          className="w02-observatory__track"
          data-branch-new={animating === '1980'}
          role="list"
          style={{ '--observatory-stops': stops.length } as CSSProperties}
        >
          {stops.map(({ id, year, title, open, available, label }, index) => (
            <li
              key={id}
              className="w02-observatory__stop"
              data-stop={id}
              data-open={open}
              data-unlocked={animating === id}
              data-strand={branchOpen && (id === '1980' || id === '2008')}
            >
              {animating === id && next === stops[index + 1]?.id && (
                <span className="w02-observatory__pulse" aria-hidden="true" />
              )}
              {branchOpen && id === '1980' && <span className="w02-observatory__branch" aria-hidden="true" />}
              <button
                type="button"
                className="w02-observatory__button"
                ref={active === id ? current : undefined}
                aria-current={active === id ? 'step' : undefined}
                aria-label={label}
                disabled={!available}
                onClick={() => onOpen(id)}
              >
                <span className="w02-observatory__year">{year}</span>
                <span className="w02-observatory__marker" aria-hidden="true">
                  {open ? '' : '?'}
                </span>
                <span className="w02-observatory__title">{open ? title : ''}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      {branchOpen && (
        <div className="w02-observatory__key" aria-label="Timeline strands">
          <p>Tutors and adaptive practice</p>
          <p>
            Learners build and teach <span>1980 → 2008</span>
          </p>
        </div>
      )}
    </nav>
  );
}
