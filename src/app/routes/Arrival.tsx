import { RibbonHeading } from '@/components/RibbonHeading';
import type { ReactNode } from 'react';
import workshop from '../../assets/workshop-evening.webp';
import './arrival.css';

export function Arrival({ children, chapterTitle }: { children: ReactNode; chapterTitle: string }) {
  return (
    <div className="arrival quest-entrance">
      <header className="arrival-mast">
        <a className="game-brand" href="/">
          AI in Education
        </a>
        <a href="/">All weeks</a>
      </header>
      <section className="arrival-spread" aria-label="Week 1 entrance">
        <div className="arrival-copy">
          <RibbonHeading label="Week 1">{chapterTitle}</RibbonHeading>
          {children}
        </div>
        <figure className="workshop-postcard">
          <img
            src={workshop}
            alt="The workshop at dusk, with Chenglu the panda, Yinqi the red panda, and Eunseo at the supply table."
            fetchPriority="high"
          />
          <figcaption>
            <span className="postcard-marker" aria-hidden="true">
              ✦
            </span>
            The learning center <span aria-hidden="true">·</span> First evening
          </figcaption>
        </figure>
      </section>
    </div>
  );
}
