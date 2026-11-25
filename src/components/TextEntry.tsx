import { useEffect, useState, type FormEvent } from 'react';

export function clearTabDraft(key?: string) {
  if (key)
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Browser storage is optional. */
    }
}

function readTabDraft(key: string | undefined, base: string, legacy = false): string {
  if (!key) return base;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return base;
    let saved;
    try {
      saved = JSON.parse(raw);
    } catch {
      /* Earlier recommendation drafts were plain text. */
    }
    if (typeof saved?.base === 'string' && typeof saved.text === 'string') {
      return saved.base === base ? saved.text : base;
    }
    return legacy ? raw : base;
  } catch {
    return base;
  }
}

function writeTabDraft(key: string | undefined, base: string, text: string) {
  if (!key) return;
  try {
    if (text === base) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify({ base, text }));
  } catch {
    /* Keep the in-memory value when a Canvas embed blocks storage. */
  }
}

export function useTabDraft(key: string | undefined, base: string, legacy = false, firstDraftKey?: string) {
  function restore() {
    const text = readTabDraft(key, base, legacy);
    if (text !== base || !key || !firstDraftKey) return text;
    // A competing first attempt in another tab may already be sealed. Preserve this tab’s
    // distinct draft as a possible revision without changing the submitted response.
    const previous = readTabDraft(firstDraftKey, '', true);
    return previous.trim() && previous.trim() !== base ? previous : base;
  }
  const [text, setText] = useState(restore);
  useEffect(() => {
    const current = restore();
    setText(current);
    writeTabDraft(key, base, current);
    if (key && firstDraftKey) clearTabDraft(firstDraftKey);
  }, [key, base, legacy, firstDraftKey]);
  function edit(value: string) {
    setText(value);
    writeTabDraft(key, base, value);
  }
  return [text, edit] as const;
}

export function TextEntry({
  label,
  button,
  onSubmit,
  disabled,
  initial = '',
  maxLength = 3000,
  draftKey,
  canSubmit = true,
  readOnly = false,
  legacyDraft = false,
  firstDraftKey,
}: {
  label: string;
  button: string;
  onSubmit: (text: string) => void;
  disabled: boolean;
  initial?: string;
  maxLength?: number;
  draftKey?: string;
  canSubmit?: boolean;
  readOnly?: boolean;
  legacyDraft?: boolean;
  firstDraftKey?: string;
}) {
  const [text, edit] = useTabDraft(readOnly ? undefined : draftKey, initial, legacyDraft, firstDraftKey);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || readOnly || !canSubmit || !text.trim()) return;
    const value = text.trim();
    if (value === initial) edit(initial);
    onSubmit(value);
  }
  return (
    <form className="response-form" onSubmit={submit}>
      <label>
        {label}
        <textarea
          rows={4}
          value={readOnly ? initial : text}
          onChange={readOnly ? undefined : (event) => edit(event.target.value)}
          maxLength={maxLength}
          required={!readOnly}
          readOnly={readOnly}
          disabled={disabled && !readOnly}
        />
      </label>
      {!readOnly && draftKey && text !== initial && (
        <span className="draft-note">Draft · awaiting submission</span>
      )}
      <button className="button" type="submit" disabled={readOnly || disabled || !canSubmit || !text.trim()}>
        {button}
      </button>
    </form>
  );
}
