import { useI18n } from '@/lib/i18n/I18n';
import { LanguageSelect } from '@/components/LanguageSelect';
import { courseTopic } from '@/curriculum/locales';
import { RibbonHeading } from '@/components/RibbonHeading';
import { quests } from '@/curriculum';
import { printQuestId, questPrintPath } from '@/curriculum/print-route';
import { archivedWeekOnePath } from '@/curriculum/studio-route';
import { AccessGate } from '@/features/identity/components/AccessGate';
import { Instructor } from '@/features/instructor/components/Instructor';
import { QuestPlayer } from '@/features/quests/components/QuestPlayer';
import { WeekOneSession } from './routes/WeekOneSession';
import { Arrival } from './routes/Arrival';
import { Home } from './routes/Home';
import { PrintableWeek } from './routes/PrintableWeek';

export function App() {
  const { t, href, locale } = useI18n();
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (path === '/') return <Home />;
  if (path === '/instructor')
    return (
      <>
        <header className="page-heading">
          <LanguageSelect />
          <a className="back" href={href('/')}>
            {t('allQuests')}
          </a>
          <RibbonHeading color="app-green">{t('instructorDashboard')}</RibbonHeading>
        </header>
        <AccessGate role="instructor">
          {(access, signOut) => <Instructor access={access} signOut={signOut} />}
        </AccessGate>
      </>
    );

  const printable = printQuestId(path);
  const id = printable ?? (path === archivedWeekOnePath ? 'w01' : /^\/quests\/(w\d{2})$/.exec(path)?.[1]);
  const quest = id ? quests[id] : undefined;
  if (!quest)
    return (
      <section className="page-heading">
        <LanguageSelect />
        <h1>{t('questUnavailable')}</h1>
        <p>{t('chooseQuest')}</p>
        <a className="button" href={href('/')}>
          {t('allQuests')}
        </a>
      </section>
    );

  if (printable) return <PrintableWeek quest={quest} />;

  const textView = new URLSearchParams(location.search).get('view') === 'text';
  if (path === archivedWeekOnePath)
    return (
      <AccessGate
        role="learner"
        signInLayout={(form) => (
          <Arrival chapterTitle={quest.title}>
            <LanguageSelect />
            {form}
            <div className="entrance-links">
              <a
                className="staff-door"
                href={href(path + (textView ? '?view=text' : ''))}
                target="_blank"
                rel="noopener"
              >
                {t('newTab')}
              </a>
              <a className="staff-door" href="/activities/w01.html">
                {t('printableWeekOne')}
              </a>
            </div>
          </Arrival>
        )}
      >
        {(access, signOut, reconnect) => (
          <>
            <LanguageSelect />
            {locale === 'es' && <p>{t('englishMaterials')}</p>}
            <div lang="en" className="localized-content">
              <WeekOneSession
                key={access.accountKey}
                reconnect={reconnect}
                quest={quest}
                access={access}
                signOut={signOut}
                textView={textView}
              />
            </div>
          </>
        )}
      </AccessGate>
    );
  const standalone = `${path}${textView ? '?view=text' : ''}`;
  return (
    <>
      <header className="page-heading quest-heading">
        <div>
          <a className="back" href={href('/')}>
            {t('allQuests')}
          </a>
          <p className="eyebrow">
            {t('weekTopic', { number: quest.number, topic: courseTopic(quest, locale) })}
          </p>
          <h1 lang="en">{quest.title}</h1>
          {quest.minutes && (
            <p>
              {t('plannedMinutes', { minutes: quest.minutes })} · <span lang="en">{quest.assignment}</span>
            </p>
          )}
        </div>
        <div className="quest-utilities">
          <LanguageSelect />
          <a
            href={href(questPrintPath(quest.id))}
            target={window.self === window.top ? undefined : '_blank'}
            rel="noopener"
          >
            {t('printHandout')}
          </a>
          <a href={href(standalone)} target="_blank" rel="noopener">
            {t('newTab')}
          </a>
          <a href={href(textView ? path : `${path}?view=text`)}>
            {textView ? t('illustratedView') : t('textView')}
          </a>
        </div>
      </header>
      {quest.steps.length > 0 ? (
        <AccessGate role="learner">
          {(access, signOut) => (
            <>
              {locale === 'es' && <p>{t('englishMaterials')}</p>}
              <div lang="en" className="localized-content">
                <QuestPlayer quest={quest} access={access} signOut={signOut} textView={textView} />
              </div>
            </>
          )}
        </AccessGate>
      ) : (
        <section className="panel planned">
          <h2>{t('questPlanned')}</h2>
          <p>
            <span lang="en">
              {quest.dates} · {quest.assignment}
            </span>
          </p>
          <a href={href('/')}>{t('returnQuestMap')}</a>
        </section>
      )}
    </>
  );
}
