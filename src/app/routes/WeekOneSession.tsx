import { useEffect, useState } from 'react';
import type { Access } from '@/contracts/session';
import type { Quest } from '@/curriculum/types';
import { getSession } from '@/features/identity/api/session';
import { startWeekOneDemoRun } from '@/features/quests/api/week-one';
import { WeekOnePlayer } from '@/features/quests/week-one/WeekOnePlayer';
import { errorMessage } from '@/lib/api-client';

export function WeekOneSession({
  access,
  quest,
  textView,
  reconnect,
  signOut,
}: {
  access: Access;
  quest: Quest;
  textView: boolean;
  reconnect: () => void;
  signOut: () => void;
}) {
  const storageKey = 'next-move.w01.demo.' + access.accountKey;
  const [savedDemo] = useState(() => {
    if (!access.canStartDemoRun) return '';
    try {
      return sessionStorage.getItem(storageKey) ?? '';
    } catch {
      return '';
    }
  });
  const [restoring, setRestoring] = useState(Boolean(savedDemo));
  const [demo, setDemo] = useState<Access>();
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState('');

  function rememberDemo(token?: string) {
    try {
      if (token) sessionStorage.setItem(storageKey, token);
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* A demo is still playable with blocked session storage. */
    }
  }

  useEffect(() => {
    if (!savedDemo) return;
    let active = true;
    void getSession(savedDemo)
      .then((session) => {
        if (active && session.role === 'learner') setDemo({ ...session, token: savedDemo });
      })
      .catch(() => {
        if (active) rememberDemo();
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [savedDemo, storageKey]);

  async function startOver() {
    setStarting(true);
    setMessage('');
    try {
      const next = await startWeekOneDemoRun(access.token);
      rememberDemo(next.token);
      setDemo(next);
    } catch (error) {
      setMessage(errorMessage(error, 'Could not start a fresh demo. Try again.'));
    } finally {
      setStarting(false);
    }
  }

  function returnToSavedRun() {
    rememberDemo();
    setDemo(undefined);
    setMessage('');
  }

  if (restoring)
    return (
      <p className="loading" role="status">
        Opening your demo run…
      </p>
    );
  if (!access.canStartDemoRun) return <WeekOnePlayer {...{ access, quest, textView, reconnect, signOut }} />;

  const controls = { starting, message, onStart: () => void startOver() };
  return (
    <>
      <div className="week-one-mode" hidden={Boolean(demo)}>
        <WeekOnePlayer {...{ access, quest, textView, reconnect, signOut }} playtest={controls} />
      </div>
      {demo && (
        <div className="week-one-mode">
          <WeekOnePlayer
            key={demo.accountKey}
            access={demo}
            quest={quest}
            textView={textView}
            reconnect={returnToSavedRun}
            signOut={returnToSavedRun}
            playtest={{ ...controls, onReturn: returnToSavedRun }}
          />
        </div>
      )}
    </>
  );
}
