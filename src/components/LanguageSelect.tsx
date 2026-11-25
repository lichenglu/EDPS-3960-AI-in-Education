import { GlobeIcon } from 'naive-icons';
import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/I18n';
import { languages, type Locale } from '@/lib/i18n/messages';
import './language-select.css';

const options = Object.keys(languages) as Locale[];

export function LanguageSelect() {
  const { t, locale, selectLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function closeAndFocus() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div
      className="language-select"
      lang={locale}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (!open || event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        closeAndFocus();
      }}
    >
      <button
        type="button"
        ref={trigger}
        className="language-trigger"
        aria-label={t('language')}
        title={t('language')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <GlobeIcon size={23} aria-hidden="true" />
      </button>
      <div className="language-options" id={panelId} role="group" aria-label={t('language')} hidden={!open}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            lang={option}
            aria-pressed={option === locale}
            onClick={() => {
              selectLocale?.(option);
              closeAndFocus();
            }}
          >
            {languages[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
