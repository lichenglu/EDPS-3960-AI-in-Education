import { createContext, useEffect, useRef, useState } from 'react';
import {
  studioPath,
  studioVersion,
  type StudioCheckpoint,
  type StudioMission,
  type StudioState,
} from '@/contracts/studio';
import { api, RequestError } from '@/lib/api-client';

export const StudioWork = createContext<{
  work: StudioState['work'];
  save: (id: StudioMission, value: Record<string, unknown>) => void;
} | null>(null);

type SaveStatus = 'ready' | 'saving' | 'saved' | 'failed' | 'conflict' | 'reconnect';

export function useStudioSave(snapshot: StudioState, token?: string, initial?: StudioCheckpoint) {
  const serialized = JSON.stringify(snapshot);
  const [status, setStatus] = useState<SaveStatus>('ready');
  const revision = useRef(initial?.revision ?? 0);
  const committed = useRef(serialized);
  const [lastSaved, setLastSaved] = useState(initial?.lastSaved ?? null);
  const active = useRef(true);
  const priorToken = useRef(token);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    if (priorToken.current !== token) {
      priorToken.current = token;
      setStatus((current) => (current === 'reconnect' ? 'ready' : current));
    }
  }, [token]);

  useEffect(() => {
    if (!token || serialized === committed.current || (status !== 'ready' && status !== 'saved')) return;

    const timer = window.setTimeout(() => {
      setStatus('saving');
      void api<StudioCheckpoint>(studioPath, token, 'PUT', {
        version: studioVersion,
        revision: revision.current,
        state: JSON.parse(serialized),
      })
        .then((saved) => {
          if (!active.current) return;
          revision.current = saved.revision;
          committed.current = serialized;
          setLastSaved(saved.lastSaved);
          setStatus('saved');
        })
        .catch((error) => {
          if (!active.current) return;
          setStatus(
            error instanceof RequestError && error.status === 409
              ? 'conflict'
              : error instanceof RequestError && error.status === 401
                ? 'reconnect'
                : 'failed',
          );
        });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [serialized, status, token]);

  return { status, lastSaved, retry: () => setStatus('ready') };
}
