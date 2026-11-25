import type { ReactNode } from 'react';
import type { Quest, Stage } from '@/curriculum';
import { courseTopic } from '@/curriculum/locales';
import { missions } from '@/curriculum/week-01/cases';
import { weekOneLessons } from '@/curriculum/week-01/lessons';
import { weekOneManifest } from '@/curriculum/week-01/manifest';
import { weekOnePrintMissions, weekOnePrintObjective } from '@/curriculum/week-01/printable';
import {
  ideaReferences,
  lessonReadings,
  lessonVideos,
  studioReferences,
} from '@/curriculum/week-01/references';
import { weekTwoLesson } from '@/curriculum/week-02/lesson';
import { weekTwoReferences } from '@/curriculum/week-02/references';
import { WeekTwoIntro } from '@/components/WeekTwoIntro';
import { useI18n } from '@/lib/i18n/I18n';
import './printable-week.css';

const stages: readonly Stage[] = ['I Do', 'We Do', 'You Do'];
const perspectives = ['Run · User', 'Tune · Developer', 'Audit · Critic'] as const;

function List({ items }: { items: readonly string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function WritingSpace() {
  return <div className="print-writing-space" aria-hidden="true" />;
}

function WeekOneHandout() {
  return (
    <>
      {weekOneManifest.missions.map((id, index) => {
        const { idea, name, task } = missions[id];
        const lesson = weekOneLessons[id];
        const paper = weekOnePrintMissions[id];
        const check = lesson.questions[0];
        const video = lessonVideos[id];
        const reading = lessonReadings[id];
        return (
          <section className="print-mission" key={id} aria-labelledby={`print-${id}`}>
            <h2 id={`print-${id}`}>
              {index + 1}. {idea} · {name}
            </h2>
            <p>{task}</p>
            <h3>I Do · {lesson.introTitle}</h3>
            <p>{lesson.why}</p>
            <List items={lesson.keyPoints} />
            <p className="print-sources">
              <a href={ideaReferences[id].url}>AI4K12 overview</a>
              {' · '}
              <a href={`https://www.youtube.com/watch?v=${video.youTubeId}&t=${video.startSeconds}s`}>
                {video.title} ({video.publisher})
              </a>
              {reading && (
                <>
                  {' '}
                  ·{' '}
                  <a href={reading.url}>
                    {reading.title} ({reading.publisher})
                  </a>
                </>
              )}
            </p>
            <h3>We Do · {lesson.practiceTitle}</h3>
            <div className="print-evidence">
              {paper.evidence.map(({ title, items }) => (
                <section key={title}>
                  <h4>{title}</h4>
                  <List items={items} />
                </section>
              ))}
            </div>
            <ol className="print-moves">
              {paper.actions.map((action, move) => (
                <li key={action}>
                  <strong>{perspectives[move]}.</strong> {action}
                </li>
              ))}
            </ol>
            {paper.exchange && (
              <div className="print-response-sheet">
                <h3>{idea} response sheet</h3>
                {perspectives.map((perspective) => (
                  <div className="print-response" key={perspective}>
                    <h4>{perspective}</h4>
                    <WritingSpace />
                  </div>
                ))}
                <h4>Drift Bottle</h4>
                <p>{paper.exchange.prompt}</p>
                <WritingSpace />
                <p>
                  <strong>Sample note.</strong> {paper.exchange.sample}
                </p>
              </div>
            )}
            <div className="print-check">
              <h3>You Do · Optional check</h3>
              <p>{check.prompt}</p>
              <ol>
                {check.options.map((option) => (
                  <li key={option}>{option}</li>
                ))}
              </ol>
              <WritingSpace />
              <p>
                <strong>After answering.</strong> Best choice is option {check.correct + 1}.{' '}
                {check.correctFeedback}
              </p>
            </div>
          </section>
        );
      })}
    </>
  );
}

function QuestHandout({ steps }: Pick<Quest, 'steps'>) {
  const guided = steps.filter((step) => step.type === 'tutor' || step.type === 'bottle');
  return (
    <>
      {stages.map((stage) => (
        <section className="print-stage" key={stage}>
          <h2>{stage}</h2>
          {steps
            .filter((step) => step.stage === stage)
            .map((step) => (
              <section className="print-step" key={step.id}>
                <h3>
                  {step.title} <span className="print-time">· {step.minutes} min</span>
                </h3>
                {step.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {step.prompt && (
                  <p>
                    <strong>{step.prompt}</strong>
                  </p>
                )}
                {step.options && <List items={step.options.map(({ label }) => label)} />}
                {step.criteria && (
                  <>
                    <h4>Success criteria</h4>
                    <List items={step.criteria} />
                  </>
                )}
                {step.sources?.map(({ label, url }) => (
                  <p className="print-sources" key={url}>
                    <a href={url}>{label}</a>
                  </p>
                ))}
                {step.type === 'tutor' && (
                  <p>Write your first attempt, then use the hints in the practice notes and try again.</p>
                )}
                {step.type === 'bottle' && (
                  <p>
                    Write your note first. Then use the sample note at the end of this handout to write a
                    reply.
                  </p>
                )}
                {step.prompt && <WritingSpace />}
                {stage === 'I Do' && step.feedback && (
                  <p className="print-example">
                    <strong>Compare with the worked example.</strong> {step.feedback}
                  </p>
                )}
              </section>
            ))}
        </section>
      ))}
      {guided.length > 0 && (
        <section className="print-stage print-practice-notes">
          <h2>Practice notes</h2>
          <p>Use these after recording your first attempts in We Do.</p>
          {guided.map((step) => (
            <section className="print-step" key={step.id}>
              <h3>{step.title}</h3>
              {step.hints && (
                <ol>
                  {step.hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ol>
              )}
              <p>
                <strong>{step.type === 'bottle' ? 'Sample note.' : 'Worked solution.'}</strong>{' '}
                {step.feedback}
              </p>
            </section>
          ))}
        </section>
      )}
    </>
  );
}

function WeekTwoHandout() {
  const { milestones, replay, driftBottle, future, quickCheck, stageMinutes, assignment } = weekTwoLesson;
  return (
    <>
      {(['I Do', 'We Do'] as const).map((stage) => (
        <section className="print-stage" key={stage}>
          <h2>
            {stage} <span className="print-time">· {stageMinutes[stage]} min</span>
          </h2>
          {stage === 'I Do' ? (
            <WeekTwoIntro textOnly includeSources={false} />
          ) : (
            <p>
              Work through the exhibits in order. Record a first response for each year, then compare it with
              the archive notes at the end. The choices and records are classroom simulations. The source list
              points to the historical accounts and studies behind them.
            </p>
          )}
          {milestones
            .filter((milestone) => milestone.stage === stage)
            .map((milestone) => (
              <section className="print-step" key={milestone.id}>
                <h3>{milestone.year}</h3>
                <p>{milestone.setup}</p>
                {milestone.previewEvidence && (
                  <p>
                    <strong>{milestone.previewEvidence.title}.</strong> {milestone.previewEvidence.body}
                  </p>
                )}
                <p>
                  <strong>{milestone.prompt}</strong>
                </p>
                <List items={milestone.options.map((option) => option.label)} />
                <WritingSpace />
              </section>
            ))}
          {stage === 'We Do' && (
            <>
              <h3>{replay.title}</h3>
              <p>{replay.setup}</p>
              {replay.cards.map((card) => (
                <section className="print-step" key={card.id}>
                  <h4>{card.title}</h4>
                  <List items={[card.observes, card.reply, card.whatNext, card.limit]} />
                </section>
              ))}
              <p>
                <strong>{replay.prompt}</strong>
              </p>
              <List items={replay.options.map((option) => option.label)} />
              <WritingSpace />
              <section className="print-step">
                <h3>{driftBottle.title}</h3>
                <p>{driftBottle.prompt}</p>
                <WritingSpace />
                <p>
                  <strong>Sample note.</strong> {driftBottle.example}
                </p>
                <p>{driftBottle.replyPrompt}</p>
                <WritingSpace />
              </section>
            </>
          )}
        </section>
      ))}
      <section className="print-stage">
        <h2>
          You Do <span className="print-time">· {stageMinutes['You Do']} min</span>
        </h2>
        <section className="print-step">
          <h3>20?? · {future.title}</h3>
          <p>{future.setup}</p>
          <p>
            Identify a tutoring approach, a decision a person should keep, and a way to check for learning.
          </p>
          <p>{future.rationalePrompt}</p>
          <h4>Success criteria</h4>
          <List items={future.criteria} />
          <WritingSpace />
          <WritingSpace />
          <p>
            <strong>
              {assignment.title} · {assignment.due}.
            </strong>{' '}
            {assignment.instructions}
          </p>
        </section>
        <section className="print-step">
          <h3>Optional check</h3>
          <p>{quickCheck.prompt}</p>
          <List items={quickCheck.options.map((option) => option.label)} />
        </section>
      </section>
      <section className="print-stage print-practice-notes">
        <h2>Archive notes</h2>
        <p>Read an entry after you record your first response for that year.</p>
        {milestones.map((milestone) => (
          <section className="print-step" key={milestone.id}>
            <h3>
              {milestone.year} · {milestone.title}
            </h3>
            <p>{milestone.summary}</p>
            <p>{milestone.reveal}</p>
            <p>{milestone.options.find((option) => option.best)?.feedback}</p>
            {milestone.revealPanels?.map((panel) => (
              <p key={panel.title}>
                <strong>{panel.title}.</strong> {panel.body}
              </p>
            ))}
          </section>
        ))}
        <section className="print-step">
          <h3>Optional check feedback</h3>
          <p>{quickCheck.options.find((option) => option.best)?.feedback}</p>
        </section>
      </section>
      <section className="print-stage">
        <h2>Sources</h2>
        <ul>
          {weekTwoReferences.map((source) => (
            <li key={source.id}>
              {source.citation} {source.locator}{' '}
              {source.links.map((link) => (
                <a key={link.url} href={link.url}>
                  {link.label}{' '}
                </a>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function PrintableWeek({ quest }: { quest: Quest }) {
  const { t, href, locale } = useI18n();
  const isStudio = quest.id === weekOneManifest.id;
  const objective = isStudio ? weekOnePrintObjective : quest.objective;
  let handout: ReactNode = null;
  if (isStudio) handout = <WeekOneHandout />;
  else if (quest.id === weekTwoLesson.id) handout = <WeekTwoHandout />;
  else if (quest.steps.length) handout = <QuestHandout steps={quest.steps} />;

  return (
    <article className="printable-week">
      <nav className="print-actions" aria-label={t('printHandout')}>
        <a href={href('/')}>{t('courseWeeks')}</a>
        <a href={href(`/quests/${quest.id}`)}>{t('returnToWeek')}</a>
        <button type="button" onClick={() => window.print()}>
          {t('printOrSavePdf')}
        </button>
      </nav>
      <header className="print-title">
        <p>{t('courseName')} · ED PS 3960</p>
        <h1>{t('weekTopic', { number: quest.number, topic: courseTopic(quest, locale) })}</h1>
        <p lang="en">
          {quest.dates} · {quest.assignment}
        </p>
        {handout && locale === 'es' && <p>{t('englishMaterials')}</p>}
      </header>
      {handout ? (
        <div lang="en">
          {objective && (
            <p>
              <strong>Learning goal.</strong> {objective}
            </p>
          )}
          <p>
            Write responses on this handout or on a separate sheet. Follow Canvas for any required submission.
          </p>
          {isStudio && (
            <p className="print-sources">
              <a href={studioReferences.poster.url}>{studioReferences.ideas.label}</a>
              {' · '}
              <a href={studioReferences.udc.url}>{studioReferences.udc.label}</a>
            </p>
          )}
          {handout}
        </div>
      ) : (
        <section className="print-stage">
          <h2>{t('printableSummary')}</h2>
          <p>{t('printablePending')}</p>
        </section>
      )}
    </article>
  );
}
