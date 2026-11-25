import { I18nProvider } from '@/lib/i18n/I18n';
import { enableSourceDialogs } from '@/features/quests/week-one/sources/source-dialog';
import { createRoot } from 'react-dom/client';
import { App } from './App';

enableSourceDialogs();
createRoot(document.getElementById('app')!).render(
  <I18nProvider>
    <App />
  </I18nProvider>,
);
