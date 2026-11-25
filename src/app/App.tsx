import { useI18n } from '@/lib/i18n/I18n';
import { LanguageSelect } from '@/components/LanguageSelect';
import { courseTopic } from '@/curriculum/locales';
import { RibbonHeading } from '@/components/RibbonHeading';
import { QuestMasthead } from '@/components/QuestMasthead';
import { quests } from '@/curriculum';
import { printQuestId, questPrintPath } from '@/curriculum/print-route';
import { archivedWeekOnePath } from '@/curriculum/studio-route';
import { AccessGate } from '@/features/identity/components/AccessGate';
import { Instructor } from '@/features/instructor/components/Instructor';
import { QuestPlayer } from '@/features/quests/components/QuestPlayer';
import { WeekOneSession } from './routes/WeekOneSession';
import { WeekTwoSession } from './routes/WeekTwoSession';
import { Arrival } from './routes/Arrival';
import { Home } from './routes/Home';
import { PrintableWeek } from './routes/PrintableWeek';
import { QuestAccess } from './routes/QuestAccess';

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

  const query = new URLSearchParams(location.search);
  const textView = query.get('view') === 'text';
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
  const isWeekTwo = quest.id === 'w02';
  const preview = isWeekTwo && query.get('preview') === 'instructor';
  function questView(asText: boolean) {
    const params = new URLSearchParams();
    if (asText) params.set('view', 'text');
    if (preview) params.set('preview', 'instructor');
    return href(params.size ? `${path}?${params}` : path);
  }
  const viewLink = quest.steps.length > 0 && (
    <a className="text" href={questView(!textView)}>
      {textView ? t('illustratedView') : t('textView')}
    </a>
  );
  if (isWeekTwo) return <WeekTwoSession preview={preview} textView={textView} />;
  const mastheadTools = (
    <>
      <a
        className="text"
        href={href(questPrintPath(quest.id))}
        target={window.self === window.top ? undefined : '_blank'}
        rel="noopener"
      >
        {t('printHandout')}
      </a>
      <a className="text" href={questView(textView)} target="_blank" rel="noopener">
        {t('newTab')}
      </a>
      {viewLink}
    </>
  );

  return (
    <div className="quest-frame">
      <QuestMasthead week={quest.number} title={<span lang="en">{quest.title}</span>} tools={mastheadTools} />
      {quest.steps.length > 0 ? (
        <AccessGate role="learner" signInLayout={(form) => <QuestAccess>{form}</QuestAccess>}>
          {(access, signOut) => (
            <>
              <p className="quest-context">
                {courseTopic(quest, locale)}
                {quest.minutes && <> · {t('plannedMinutes', { minutes: quest.minutes })}</>} ·{' '}
                <span lang="en">{quest.assignment}</span>
              </p>
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
            {courseTopic(quest, locale)} ·{' '}
            <span lang="en">
              {quest.dates} · {quest.assignment}
            </span>
          </p>
          <a href={href('/')}>{t('returnQuestMap')}</a>
        </section>
      )}
    </div>
  );
}
