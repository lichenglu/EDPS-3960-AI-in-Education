import { useEffect, useRef, useState } from 'react';
import type { Access } from '@/contracts/session';
import {
  initialWeekTwoProgress,
  weekTwoQuestId,
  weekTwoVersion,
  type WeekTwoAction,
  type WeekTwoCheckpoint,
  type WeekTwoIntent,
  type WeekTwoProgress,
} from '@/contracts/week-two';
import { weekTwoYearIds } from '@/curriculum/week-02/lesson';
import { errorMessage, RequestError } from '@/lib/api-client';
import { commitWeekTwoAction, getWeekTwoCheckpoint } from '../api/week-two';

const localKey = 'next-move.w02.' + weekTwoVersion + '.local-progress';

function emptyCheckpoint(): WeekTwoCheckpoint {
  return {
    questId: weekTwoQuestId,
    contentVersion: weekTwoVersion,
    revision: 0,
    lastSaved: null,
    state: initialWeekTwoProgress(),
  };
}

function readLocalCheckpoint(): WeekTwoCheckpoint | undefined {
  try {
    const item = localStorage.getItem(localKey);
    if (!item) return;
    const checkpoint = JSON.parse(item) as WeekTwoCheckpoint | null;
    const state = checkpoint?.state;
    if (
      checkpoint?.questId !== weekTwoQuestId ||
      checkpoint.contentVersion !== weekTwoVersion ||
      !Number.isSafeInteger(checkpoint.revision) ||
      checkpoint.revision < 0 ||
      typeof checkpoint.lastSaved !== 'string' ||
      !state ||
      typeof state.introComplete !== 'boolean' ||
      typeof state.replayComplete !== 'boolean' ||
      typeof state.futureComplete !== 'boolean' ||
      !Array.isArray(state.completedMilestones) ||
      !state.completedMilestones.every((id, index) => id === weekTwoYearIds[index]) ||
      (state.futureComplete && typeof state.futureProposal?.rationale !== 'string')
    )
      return;
    return checkpoint;
  } catch {
    /* The local preview works even when browser storage is unavailable. */
  }
}

function advancePreview(state: WeekTwoProgress, intent: WeekTwoIntent, demo: boolean): WeekTwoProgress {
  switch (intent.type) {
    case 'completeIntro':
      return state.introComplete ? state : { ...state, introComplete: true };
    case 'completeMilestone':
      if (
        state.completedMilestones.includes(intent.milestoneId) ||
        (!demo &&
          (!state.introComplete || weekTwoYearIds[state.completedMilestones.length] !== intent.milestoneId))
      )
        return state;
      return { ...state, completedMilestones: [...state.completedMilestones, intent.milestoneId] };
    case 'completeReplay':
      if (state.replayComplete || (!demo && state.completedMilestones.length !== weekTwoYearIds.length))
        return state;
      return { ...state, replayComplete: true };
    case 'completeFuture': {
      if (state.futureComplete || (!demo && !state.replayComplete)) return state;
      const { conceptId, humanDecisionId, evidenceId, rationale } = intent;
      return {
        ...state,
        futureComplete: true,
        futureProposal: { conceptId, humanDecisionId, evidenceId, rationale },
      };
    }
  }
}

export function useWeekTwoCheckpoint({
  access,
  reconnect,
  preview,
  localPreview,
}: {
  access?: Access;
  reconnect?: () => void;
  preview: boolean;
  localPreview: boolean;
}) {
  const token = !preview && !localPreview ? access?.token : undefined;
  const [record, setRecord] = useState<WeekTwoCheckpoint | undefined>(() =>
    localPreview ? (readLocalCheckpoint() ?? emptyCheckpoint()) : preview ? emptyCheckpoint() : undefined,
  );
  const [pending, setPending] = useState<WeekTwoAction>();
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);
  const inFlight = useRef(false);
  const waitingAction = useRef<WeekTwoAction>(undefined);
  const storageKey = 'next-move.w02.' + weekTwoVersion + '.pending.' + access?.accountKey;

  function remember(action?: WeekTwoAction) {
    waitingAction.current = action;
    setPending(action);
    try {
      if (action) sessionStorage.setItem(storageKey, JSON.stringify(action));
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* The action is also kept in memory when the embed blocks storage. */
    }
  }

  async function submit(action: WeekTwoAction) {
    if (!token || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    remember(action);
    setMessage('');
    try {
      const saved = await commitWeekTwoAction(token, action);
      setRecord((current) => (current && current.revision > saved.revision ? current : saved));
      remember();
    } catch (error) {
      if (error instanceof RequestError && error.status === 401) {
        setMessage('Reconnect to save your waiting move.');
        reconnect?.();
      } else if (error instanceof RequestError && error.status === 409) {
        setConflict(true);
        setMessage('This quest was saved in another tab. Load that saved work to continue.');
      } else if (error instanceof RequestError && error.status >= 400 && error.status < 500) {
        remember();
        setMessage(error.message);
      } else {
        setMessage('Save interrupted. Your change is ready to retry.');
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    let active = true;
    let waiting = waitingAction.current;
    if (!waiting) {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) waiting = JSON.parse(stored) as WeekTwoAction;
      } catch {
        /* The main checkpoint can still be restored from the server. */
      }
    }
    setBusy(true);
    getWeekTwoCheckpoint(token)
      .then(async (saved) => {
        if (!active) return;
        setRecord(saved);
        setConflict(false);
        setMessage('');
        if (waiting) await submit(waiting);
      })
      .catch((error) => {
        if (!active) return;
        setMessage(errorMessage(error, 'Could not open your saved timeline. Try again.'));
        if (error instanceof RequestError && error.status === 401) reconnect?.();
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadVersion, storageKey]);

  function dispatch(intent: WeekTwoIntent) {
    if (!record || busy || pending) return;
    if (preview || localPreview) {
      const stored = localPreview ? readLocalCheckpoint() : undefined;
      const prior = stored && stored.revision > record.revision ? stored : record;
      const state = advancePreview(prior.state, intent, preview);
      if (state === prior.state) {
        setRecord(prior);
        return;
      }
      const next = { ...prior, state, revision: prior.revision + 1 };
      if (localPreview) {
        try {
          next.lastSaved = new Date().toISOString();
          localStorage.setItem(localKey, JSON.stringify(next));
          setMessage('');
        } catch {
          next.lastSaved = null;
          setMessage('Browser storage is unavailable. Progress will last while this tab is open.');
        }
      }
      setRecord(next);
      return;
    }
    void submit({
      actionId: crypto.randomUUID(),
      expectedRevision: record.revision,
      contentVersion: weekTwoVersion,
      intent,
    });
  }

  function reload() {
    if (conflict) remember();
    setLoadVersion((version) => version + 1);
  }

  function reset() {
    if ((!preview && !localPreview) || busy || pending) return;
    const stored = localPreview ? readLocalCheckpoint() : undefined;
    const next = {
      ...emptyCheckpoint(),
      revision: Math.max(record?.revision ?? 0, stored?.revision ?? 0) + 1,
    };
    setMessage('');
    if (localPreview) {
      try {
        next.lastSaved = new Date().toISOString();
        localStorage.setItem(localKey, JSON.stringify(next));
      } catch {
        next.lastSaved = null;
        setMessage('Browser storage is unavailable. Progress will last while this tab is open.');
      }
    }
    setRecord(next);
  }

  return {
    record,
    busy,
    locked: busy || Boolean(pending),
    pending,
    conflict,
    message,
    dispatch,
    reset,
    reload,
    retry: () => {
      if (pending && !busy) void submit(pending);
    },
  };
}
