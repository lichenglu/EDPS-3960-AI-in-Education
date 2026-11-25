import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/I18n';
import './quest-footer.css';

export function QuestFooter({ children }: { children: ReactNode }) {
  const { t, href } = useI18n();
  return (
    <footer className="quest-footer" role="contentinfo">
      <a href={href('/')}>{t('allWeeks')}</a>
      {children}
    </footer>
  );
}
