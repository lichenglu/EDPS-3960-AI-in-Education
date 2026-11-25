import { useEffect, useState } from 'react';
import { studioPath, type StudioConfig } from '@/contracts/studio';
import { api } from '@/lib/api-client';

export function usePreviewConfig(enabled = true) {
  const [config, setConfig] = useState<StudioConfig>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setFailed(false);
    void api<StudioConfig>(studioPath + '/config')
      .then((value) => {
        if (active) setConfig(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, enabled]);

  return { config, failed, retry: () => setAttempt((value) => value + 1) };
}
