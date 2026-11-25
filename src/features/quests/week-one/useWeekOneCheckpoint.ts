import { useEffect, useRef, useState } from 'react';
import { errorMessage, RequestError } from '@/lib/api-client';
import type { Access } from '@/contracts/session';
import {
  weekOneVersion,
  type WeekOneAction,
  type WeekOneCheckpoint,
  type WeekOneIntent,
} from '@/contracts/week-one';
import { commitAction, getCheckpoint } from '../api/week-one';

export function useWeekOneCheckpoint({ token, accountKey }: Access, reconnect: () => void) {
  const [record, setRecord] = useState<WeekOneCheckpoint>();
  const [pending, setPending] = useState<WeekOneAction>();
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);
  const interrupted = useRef<WeekOneAction | undefined>(undefined);
  const [loadVersion, setLoadVersion] = useState(0);
  const storageKey = 'next-move.w01.' + weekOneVersion + '.pending.' + accountKey;

  function remember(action?: WeekOneAction) {
    interrupted.current = action;
    setPending(action);
    try {
      if (action) sessionStorage.setItem(storageKey, JSON.stringify(action));
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* The in-memory action still survives reconnecting in a restricted iframe. */
    }
  }

  async function submit(action: WeekOneAction) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    remember(action);
    setMessage('Saving…');
    try {
      const saved = await commitAction(token, action);
      setRecord((current) => (current && current.revision > saved.revision ? current : saved));
      setMessage('Saved');
      remember();
    } catch (error) {
      if (error instanceof RequestError && error.status === 401) {
        setMessage('Reconnect to save your waiting move.');
        reconnect();
      } else if (error instanceof RequestError && error.status === 409) {
        setConflict(true);
        setMessage(error.message);
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
    let active = true;
    // A new token for this account may arrive after the previous action committed.
    // Reuse its id so the server can return the original receipt.
    let waiting = interrupted.current;
    if (!waiting) {
      try {
        const item = sessionStorage.getItem(storageKey);
        if (item) waiting = JSON.parse(item) as WeekOneAction;
      } catch {
        /* A checkpoint can still be restored from the server. */
      }
    }
    setBusy(true);
    getCheckpoint(token)
      .then(async (saved) => {
        if (!active) return;
        setRecord(saved);
        setConflict(false);
        if (waiting) await submit(waiting);
        else setMessage('');
      })
      .catch((error) => {
        if (!active) return;
        setMessage(errorMessage(error, 'Could not load saved work. Try again.'));
        if (error instanceof RequestError && error.status === 401) reconnect();
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadVersion, storageKey]);

  function dispatch(intent: WeekOneIntent) {
    if (!record || busy || pending) return;
    void submit({
      actionId: crypto.randomUUID(),
      expectedRevision: record.revision,
      contentVersion: weekOneVersion,
      intent,
    });
  }
  function reload() {
    if (conflict) remember();
    setLoadVersion((n) => n + 1);
  }
  return {
    record,
    busy,
    locked: busy || Boolean(pending),
    pending,
    conflict,
    message,
    dispatch,
    reload,
    retry: () => {
      if (pending && !busy) void submit(pending);
    },
  };
}
