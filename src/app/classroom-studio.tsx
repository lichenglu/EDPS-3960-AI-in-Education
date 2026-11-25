import { QuestMasthead } from '@/components/QuestMasthead';
import { useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { type StudioCheckpoint, studioPath } from '@/contracts/studio';
import type { Access } from '@/contracts/session';
import { usePreviewConfig } from '@/features/identity/api/preview';
import { AccessGate } from '@/features/identity/components/AccessGate';
import { Studio } from '@/features/quests/week-one/studio/Studio';
import { I18nProvider, useI18n } from '@/lib/i18n/I18n';
import { courseTopic } from '@/curriculum/locales';
import { questPrintPath } from '@/curriculum/print-route';
import { api } from '@/lib/api-client';
import { QuestAccess } from './routes/QuestAccess';

const preview = new URLSearchParams(location.search).get('preview') === 'instructor';

function Entrance({ children }: { children: ReactNode }) {
  const { t, href, locale } = useI18n();
  return (
    <main id="studio-main" tabIndex={-1} className="quest-frame">
      <QuestMasthead
        week={1}
        title={courseTopic({ id: 'w01', topic: 'AI Literacy' }, locale)}
        tools={
          <>
            <a
              className="text"
              href={href(questPrintPath('w01'))}
              target={window.self === window.top ? undefined : '_blank'}
              rel="noopener"
            >
              {t('printHandout')}
            </a>
            {window.self !== window.top && (
              <a
                className="text"
                href={href(location.pathname + location.search)}
                target="_blank"
                rel="noopener"
              >
                {t('weekOneNewTab')}
              </a>
            )}
          </>
        }
      />
      <QuestAccess>{children}</QuestAccess>
    </main>
  );
}

function ConnectedStudio({
  access,
  signOut,
  reconnect,
}: {
  access: Access;
  signOut: () => void;
  reconnect: () => void;
}) {
  const { t } = useI18n();
  const [checkpoint, setCheckpoint] = useState<StudioCheckpoint>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (checkpoint) return;
    let active = true;
    setFailed(false);
    void api<StudioCheckpoint>(studioPath, access.token)
      .then((value) => {
        if (active) setCheckpoint(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [access.token, attempt, checkpoint]);

  if (!checkpoint)
    return (
      <Entrance>
        <p role="status">{failed ? t('loadProgressFailed') : t('loadingProgress')}</p>
        {failed && (
          <div className="options">
            <button className="quiet" onClick={() => setAttempt((value) => value + 1)}>
              {t('retry')}
            </button>
            <button className="quiet" onClick={reconnect}>
              {t('reconnect')}
            </button>
          </div>
        )}
      </Entrance>
    );

  return <Studio account={{ access, checkpoint, signOut, reconnect }} />;
}

function StudioApp() {
  const { t } = useI18n();
  const { config, failed, retry } = usePreviewConfig();

  if (!config)
    return (
      <Entrance>
        <p role="status">{failed ? t('studioUnavailable') : t('openingStudio')}</p>
        {failed && (
          <button className="quiet" onClick={retry}>
            {t('retry')}
          </button>
        )}
      </Entrance>
    );

  if (preview)
    return (
      <AccessGate role="instructor" signInLayout={(form) => <Entrance>{form}</Entrance>}>
        {(_access, signOut) => <Studio preview previewSignOut={signOut} />}
      </AccessGate>
    );

  if (config.requireAccount)
    return (
      <AccessGate role="learner" signInLayout={(form) => <Entrance>{form}</Entrance>}>
        {(access, signOut, reconnect) => (
          <ConnectedStudio key={access.accountKey} {...{ access, signOut, reconnect }} />
        )}
      </AccessGate>
    );

  return <Studio localPreview={config.localPreview} />;
}

createRoot(document.getElementById('root')!).render(
  <I18nProvider pageTitle="weekOnePageTitle">
    <StudioApp />
  </I18nProvider>,
);
