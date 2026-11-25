import type { ReactNode, Ref } from 'react';
import { weekTwoIntroFilm as film } from '@/curriculum/week-02/intro-films';
import { useI18n } from '@/lib/i18n/I18n';
import { LessonVideo } from './LessonVideo';
import './week-two-intro.css';

export function WeekTwoIntro({
  textOnly = false,
  action,
  includeSources = true,
  stageHeading,
}: {
  textOnly?: boolean;
  action?: ReactNode;
  includeSources?: boolean;
  stageHeading?: { id: string; ref: Ref<HTMLHeadingElement> };
}) {
  const { t } = useI18n();
  return (
    <section className={textOnly ? 'w02-film' : 'w02-film w02-film-player'} aria-label={film.title}>
      <header className="w02-film-introduction" lang="en">
        {stageHeading ? (
          <h2 id={stageHeading.id} ref={stageHeading.ref} tabIndex={-1}>
            {film.stageTitle}
          </h2>
        ) : (
          <h3>{film.title}</h3>
        )}
        <p>{film.context}</p>
        <p>{film.guidingQuestion}</p>
      </header>
      <LessonVideo
        title={film.title}
        src={film.video}
        poster={film.poster}
        captions={{ src: film.captions, srcLang: 'en', label: 'English' }}
        transcript={film.scenes}
        textOnly={textOnly}
      />
      {includeSources && (
        <details className="w02-film-references">
          <summary>{t('introFilmSources')}</summary>
          <ul lang="en">
            {film.sources.map(({ id, citation, links }) => (
              <li key={id}>
                <a href={links[0].url}>{citation}</a>
              </li>
            ))}
          </ul>
        </details>
      )}
      {action && <div className="w02-film-action">{action}</div>}
    </section>
  );
}
