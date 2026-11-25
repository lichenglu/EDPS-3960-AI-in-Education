import { Title } from 'animal-island-ui';
import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/I18n';
import { LanguageSelect } from './LanguageSelect';
import './quest-masthead.css';

export function QuestMasthead({
  week,
  title,
  navigation,
  tools,
}: {
  week: number;
  title: ReactNode;
  navigation?: ReactNode;
  tools?: ReactNode;
}) {
  const { t, href } = useI18n();

  return (
    <header className="masthead" role="banner">
      <a className="brand" href={href('/')}>
        {t('courseName')}
      </a>
      <div className="studio-toolbar">
        <div className="studio-toolbar-main">
          <div className="quest-masthead-heading">
            <Title className="studio-week-ribbon" color="app-yellow" size="small">
              {t('week', { number: week })}
            </Title>
            <h1 className="quest-masthead-title">{title}</h1>
          </div>
          {navigation}
        </div>
        <div className="top-controls">
          {tools}
          <LanguageSelect />
        </div>
      </div>
    </header>
  );
}
