import { useEffect, useState } from 'react';
import { errorMessage } from '@/lib/api-client';
import { getBottles, sendBottle, replyToBottle, type Exchange } from '../api/bottles';
import { clearTabDraft, TextEntry, useTabDraft } from '@/components/TextEntry';
import type { Entry } from '@/game/quest-state';

export function DriftBottle({
  token,
  id,
  fallback,
  entry,
  onEntry,
  disabled: busy,
  review = false,
  draftKey,
}: {
  token: string;
  id: string;
  fallback: string;
  entry: Entry;
  onEntry: (entry: Entry) => void;
  disabled: boolean;
  review?: boolean;
  draftKey?: string;
}) {
  const disabled = busy || review;
  const [exchange, setExchange] = useState<Exchange>();
  const shelfKey = review ? undefined : draftKey;
  const [openedId, setOpened] = useTabDraft(shelfKey && shelfKey + '.opened', '');
  const target = exchange?.next?.id ?? 'example';
  const opened = openedId === target;
  const noteKey = shelfKey && shelfKey + '.bottle';
  const replyKey = shelfKey && shelfKey + '.reply.' + target;
  const reflectionKey = shelfKey && shelfKey + '.reflection';
  const [notice, setNotice] = useState('');
  const [running, setRunning] = useState(false);
  async function request(operation = () => getBottles(token, id), success = '') {
    setRunning(true);
    setNotice('');
    try {
      const updated = await operation();
      setExchange(updated);
      if (success) setNotice(success);
      return updated;
    } catch (error) {
      setNotice(errorMessage(error, 'The bottle shelf could not connect. Please try again.'));
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    void request();
  }, [token, id]);

  useEffect(() => {
    if (exchange?.own) clearTabDraft(noteKey);
    if (exchange?.responded) clearTabDraft(replyKey);
    if (entry.reflection) clearTabDraft(reflectionKey);
  }, [exchange?.own, exchange?.responded, entry.reflection, noteKey, replyKey, reflectionKey]);

  return (
    <div className="drift">
      {!exchange && (
        <button className="button secondary" disabled={running} onClick={() => void request()}>
          Load bottle shelf
        </button>
      )}
      {exchange && !exchange.own && (
        <TextEntry
          readOnly={review}
          draftKey={noteKey}
          label="Write a bottle"
          button="Send to class"
          maxLength={1200}
          disabled={disabled || running}
          onSubmit={(text) => void request(() => sendBottle(token, id, text), 'Bottle sent to the class.')}
        />
      )}
      {exchange?.own && (
        <>
          <div className="feedback">
            <strong>Your bottle</strong>
            <p>{exchange.own.text}</p>
          </div>
          {review &&
            exchange.sentReplies?.map((reply, index) => (
              <div className="feedback" key={index}>
                <strong>Your saved reply</strong>
                <p>{reply.text}</p>
              </div>
            ))}
          {exchange.replies.length > 0 && (
            <details>
              <summary>Read replies to your bottle</summary>
              {exchange.replies.map((reply, index) => (
                <blockquote key={index}>
                  <strong>{reply.label}</strong>
                  <p>{reply.text}</p>
                </blockquote>
              ))}
            </details>
          )}
          {!opened && (
            <button
              className="button secondary"
              disabled={running || (!review && disabled)}
              onClick={async () => {
                const updated = await request();
                if (updated) setOpened(updated.next?.id ?? 'example');
              }}
            >
              Open a bottle
            </button>
          )}
          {opened && (
            <div className="feedback">
              <strong>{exchange.next ? exchange.next.label || 'Classmate' : 'Example from Yinqi'}</strong>
              <p>{exchange.next?.text ?? fallback}</p>
            </div>
          )}
          {opened && !exchange.responded && (
            <TextEntry
              readOnly={review}
              draftKey={replyKey}
              label="Reply with evidence and a question or test"
              button="Save reply"
              maxLength={1200}
              disabled={disabled || running}
              onSubmit={(text) =>
                void request(() => replyToBottle(token, id, exchange.next?.id ?? null, text), 'Reply saved.')
              }
            />
          )}
          {exchange.responded && !entry.reflection && (
            <TextEntry
              readOnly={review}
              draftKey={reflectionKey}
              label="What would you keep or change in your own view?"
              button="Save private reflection"
              disabled={disabled || running}
              onSubmit={(reflection) => onEntry({ sent: true, responded: true, reflection })}
            />
          )}
        </>
      )}
      {entry.reflection && (
        <div className="feedback">
          <strong>Private reflection</strong>
          <p>{entry.reflection}</p>
        </div>
      )}
      <p className="notice" role="status">
        {notice}
      </p>
    </div>
  );
}
