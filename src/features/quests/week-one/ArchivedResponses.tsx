import { useState } from 'react';
import { errorMessage } from '@/lib/api-client';
import type { WeekOneArchive } from '@/contracts/week-one';
import { getArchivedCheckpoint } from '../api/week-one';

const writtenFields = [
  ['first', 'Independent first attempt'],
  ['revision', 'Assisted revision'],
  ['text', 'Saved response'],
  ['prediction', 'Prediction'],
  ['reflection', 'Private reflection'],
] as const;

// These titles identify saved answers in the first two editions of the quest.
const earlierScenes: Record<string, string> = {
  'previous-work': 'Comparing literacies',
  'demo-evidence': 'Comparing Pip’s two replies',
  'change-rule': 'Testing a response rule',
  'compare-measures': 'Comparing AI literacy checks',
  'drift-bottle': 'Drift Bottle',
  recommendation: 'Independent recommendation',
  'response-lab': 'Replay comparison',
  orientation: 'Canvas orientation note',
};

export function ArchivedResponses({ versions, token }: { versions: string[]; token: string }) {
  const [version, setVersion] = useState<string>();
  const [archive, setArchive] = useState<WeekOneArchive>();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function open(edition: string) {
    setVersion(edition);
    setLoading(true);
    setMessage('');
    setArchive(undefined);
    try {
      setArchive(await getArchivedCheckpoint(token, edition));
    } catch (error) {
      setMessage(errorMessage(error, 'Could not open these earlier responses. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  const notes = Object.entries(archive?.state.entries ?? {}).flatMap(([id, entry]) => {
    const responses = writtenFields.flatMap(([key, label]) => {
      const text = entry[key];
      return typeof text === 'string' && text.trim() ? [{ label, text }] : [];
    });
    return responses.length ? [{ id, responses }] : [];
  });

  return (
    <details className="archived-responses">
      <summary>Earlier versions of Week 1</summary>
      <p>Read the responses you saved in an earlier version of the quest.</p>
      <div className="actions">
        {versions.map((edition) => (
          <button
            className="button secondary"
            type="button"
            key={edition}
            disabled={loading}
            onClick={() => void open(edition)}
          >
            Open version {edition}
          </button>
        ))}
      </div>
      {loading && <p role="status">Opening version {version}…</p>}
      {message && <p role="status">{message}</p>}
      {archive && (
        <>
          <h3>Version {archive.contentVersion} · Saved responses</h3>
          <p>
            Last saved{' '}
            <time dateTime={archive.lastSaved}>{new Date(archive.lastSaved).toLocaleString()}</time>
          </p>
          {notes.length ? (
            notes.map(({ id, responses }) => (
              <section key={id}>
                <h4>{earlierScenes[id] ?? 'Saved activity'}</h4>
                {responses.map(({ label, text }) => (
                  <p key={label}>
                    <strong>{label}</strong> · {text}
                  </p>
                ))}
              </section>
            ))
          ) : (
            <p>
              This checkpoint contains activity progress. There are no written responses at that checkpoint.
            </p>
          )}
        </>
      )}
    </details>
  );
}
