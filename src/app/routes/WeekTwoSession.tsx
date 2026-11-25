import type { ReactNode } from 'react';
import { QuestFooter } from '@/components/QuestFooter';
import { weekTwoReferences } from '@/curriculum/week-02/references';
import { QuestMasthead } from '@/components/QuestMasthead';
import { weekTwoLesson } from '@/curriculum/week-02/lesson';
import { usePreviewConfig } from '@/features/identity/api/preview';
import { AccessGate } from '@/features/identity/components/AccessGate';
import { WeekTwoPlayer } from '@/features/quests/week-two/WeekTwoPlayer';
import { useI18n } from '@/lib/i18n/I18n';
import { QuestAccess } from './QuestAccess';

export function WeekTwoSession({
  preview,
  textView,
  mastheadTools,
}: {
  preview: boolean;
  textView: boolean;
  mastheadTools?: ReactNode;
}) {
  const { config, failed, retry } = usePreviewConfig(!preview);
  const { t, locale } = useI18n();
  const masthead = (
    <QuestMasthead week={2} title={<span lang="en">{weekTwoLesson.title}</span>} tools={mastheadTools} />
  );

  const footer = (
    <QuestFooter>
      {(['doroudi', 'anderson'] as const).map((id) => {
        const reading = weekTwoReferences.find((item) => item.id === id)!;
        return (
          <a key={id} href={reading.links[0].url} target="_blank" rel="noreferrer" lang="en">
            {id === 'doroudi'
              ? 'Doroudi · A history of AI in education'
              : 'Anderson et al. · Cognitive tutors'}
          </a>
        );
      })}
    </QuestFooter>
  );
  function lesson(player: ReactNode) {
    return (
      <>
        {locale === 'es' && <p>{t('englishMaterials')}</p>}
        <div className="localized-content">{player}</div>
      </>
    );
  }

  if (!preview && !config)
    return (
      <div className="quest-frame w02-frame">
        {masthead}
        <section className="panel loading">
          <p role="status">{t(failed ? 'questOpenFailed' : 'openingQuest')}</p>
          {failed && (
            <button className="button secondary" onClick={retry}>
              {t('retry')}
            </button>
          )}
        </section>
        {footer}
      </div>
    );

  return (
    <div className="quest-frame w02-frame">
      {!preview && config?.requireAccount === false && config.localPreview === true ? (
        lesson(<WeekTwoPlayer textView={textView} localPreview mastheadTools={mastheadTools} />)
      ) : (
        <AccessGate
          role={preview ? 'instructor' : 'learner'}
          signInLayout={(form) => (
            <>
              {masthead}
              <QuestAccess>{form}</QuestAccess>
            </>
          )}
        >
          {(access, signOut, reconnect) =>
            lesson(
              <WeekTwoPlayer
                key={access.accountKey}
                access={access}
                signOut={signOut}
                reconnect={reconnect}
                textView={textView}
                preview={preview}
                mastheadTools={mastheadTools}
              />,
            )
          }
        </AccessGate>
      )}
      {footer}
    </div>
  );
}
