import { useI18n } from '@/lib/i18n/I18n';
import { LanguageSelect } from '@/components/LanguageSelect';
import { courseTopic } from '@/curriculum/locales';
import { quests } from '@/curriculum';
import { questPrintPath } from '@/curriculum/print-route';
import { RibbonHeading } from '@/components/RibbonHeading';
import './home.css';

export function Home() {
  const { t, href, locale } = useI18n();
  return (
    <div className="course-home">
      <header className="course-heading">
        <LanguageSelect />
        <RibbonHeading label="ED PS 3960">{t('courseName')}</RibbonHeading>
      </header>
      <nav className="quest-map" aria-labelledby="course-weeks">
        <h2 id="course-weeks">{t('courseWeeks')}</h2>
        <ol>
          {Object.values(quests).map((quest) => (
            <li key={quest.id}>
              <a href={href('/quests/' + quest.id)}>
                {t('weekTopic', { number: quest.number, topic: courseTopic(quest, locale) })}
              </a>
              <div className="week-card-details">
                <span lang="en">{quest.dates}</span>
                <a
                  href={href(questPrintPath(quest.id))}
                  aria-label={t('printWeekLink', { number: quest.number })}
                >
                  {t('printHandout')}
                </a>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
