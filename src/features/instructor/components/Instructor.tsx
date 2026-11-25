import { useI18n } from '@/lib/i18n/I18n';
import { courseTopic } from '@/curriculum/locales';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  getRoster,
  moderationQueue,
  createLearner,
  reissueCode,
  hideMessage,
  type Learner,
  type Message,
} from '../api/course';
import { errorMessage } from '@/lib/api-client';
import type { Access } from '@/contracts/session';
import { weekOneStudioPath } from '@/curriculum/studio-route';
import { quests } from '@/curriculum';
import { stages } from '@/game/quest-state';
import './instructor.css';

const playable = Object.values(quests).filter((quest) => quest.steps.length);

const stageKeys = { 'I Do': 'iDo', 'We Do': 'weDo', 'You Do': 'youDo' } as const;

export function Instructor({ access, signOut }: { access: Access; signOut: () => void }) {
  const { t, href, locale } = useI18n();
  const dateFormat = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Denver',
  });
  const statusKeys = {
    'not-started': 'notStarted',
    'in-progress': 'inProgress',
    complete: 'complete',
    optional: 'optional',
  } as const;
  function statusLabel(status: string) {
    const key = statusKeys[status as keyof typeof statusKeys];
    return key ? t(key).toLocaleLowerCase(locale) : status;
  }
  const [learners, setLearners] = useState<Learner[]>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [label, setLabel] = useState('');
  const [issued, setIssued] = useState<{ label: string; code: string }>();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [roster, moderation] = await Promise.all([getRoster(access.token), moderationQueue(access.token)]);
    setLearners(roster.learners);
    setMessages(moderation.messages);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setNotice('');
    try {
      await action();
    } catch (error) {
      setNotice(locale === 'en' ? errorMessage(error, t('dashboardFailed')) : t('dashboardFailed'));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void run(load);
  }, [access.token]);

  function add(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    void run(async () => {
      const learner = await createLearner(access.token, label.trim());
      setIssued(learner);
      setLabel('');
      await load();
    });
  }

  return (
    <div className="dashboard field-logbook">
      <div className="dashboard-toolbar">
        <span>{access.label}</span>
        <div className="actions">
          <a className="button secondary" href={href(weekOneStudioPath + '?preview=instructor')}>
            {t('previewWeekOne')}
          </a>
          <button className="button secondary" onClick={() => void run(load)} disabled={busy}>
            {t('refresh')}
          </button>
          <button className="text-button" onClick={signOut}>
            {t('signOut')}
          </button>
        </div>
      </div>
      <p className="notice" role="status">
        {notice || (!learners && busy ? t('loadingCourseProgress') : '')}
      </p>
      <section className="panel roster-panel" aria-labelledby="roster-title">
        <h2 id="roster-title">{t('learnerProgress')}</h2>
        {learners?.length === 0 && <p>{t('emptyRoster')}</p>}
        {learners && learners.length > 0 && (
          <div className="table-scroll" tabIndex={0} role="region" aria-label={t('learnerProgressTable')}>
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('learner')}</th>
                  {playable.map((quest) => (
                    <th scope="col" key={quest.id}>
                      {t('week', { number: quest.number })}
                      <small lang={quest.id === 'w01' ? locale : 'en'}>
                        {quest.id === 'w01' ? courseTopic(quest, locale) : quest.title}
                      </small>
                    </th>
                  ))}
                  <th scope="col">{t('access')}</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((learner) => (
                  <tr key={learner.id}>
                    <th scope="row">{learner.label}</th>
                    {playable.map((quest) => {
                      const progress = learner.progress[quest.id];
                      const studio = quest.id === 'w01' ? learner.studioProgress : undefined;
                      return (
                        <td key={quest.id}>
                          {studio ? (
                            <>
                              <strong className={studio.complete ? 'roster-tag complete' : 'roster-tag'}>
                                {studio.complete ? t('complete') : t('inProgress')}
                              </strong>
                              <ul className="stage-summary">
                                <li>
                                  {t('iDo')} · {statusLabel(studio.stages['i-do'])}
                                </li>
                                <li>
                                  {t('weDo')} · {statusLabel(studio.stages['we-do'])}
                                </li>
                                <li>
                                  {t('youDo')} · {statusLabel(studio.stages['you-do'])}
                                </li>
                              </ul>
                              <small>
                                {t('missionProgress', {
                                  completed: studio.completedMissions,
                                  total: studio.totalMissions,
                                  time: dateFormat.format(new Date(studio.lastSaved)),
                                })}
                              </small>
                            </>
                          ) : progress ? (
                            <>
                              {quest.id === 'w01' && <small>{t('archivedRun')}</small>}
                              <strong className={progress.complete ? 'roster-tag complete' : 'roster-tag'}>
                                {progress.complete
                                  ? t('complete')
                                  : t(
                                      progress.stage && progress.stage in stageKeys
                                        ? stageKeys[progress.stage as keyof typeof stageKeys]
                                        : 'inProgress',
                                    )}
                              </strong>
                              <ul className="stage-summary">
                                {stages.map((stage) => (
                                  <li key={stage}>
                                    {t(stageKeys[stage])} ·{' '}
                                    {statusLabel(progress.stages?.[stage] ?? 'not-started')}
                                  </li>
                                ))}
                              </ul>
                              <small>
                                {t('savedDate', { time: dateFormat.format(new Date(progress.lastSaved)) })}
                              </small>
                            </>
                          ) : (
                            t('notStarted')
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const result = await reissueCode(access.token, learner.id);
                            setIssued({ ...result, label: learner.label });
                            setNotice(t('newCodeIssued', { name: learner.label }));
                          })
                        }
                        aria-label={t('reissueCodeFor', { name: learner.label })}
                      >
                        {t('reissueCode')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form className="add-learner" onSubmit={add}>
          <label>
            {t('newRosterLabel')}{' '}
            <input value={label} onChange={(event) => setLabel(event.target.value)} required maxLength={60} />
          </label>
          <button className="button" disabled={busy || !label.trim()}>
            {t('createLearner')}
          </button>
        </form>
        {issued && (
          <div className="feedback">
            <label>
              {t('privateAccessCode', { name: issued.label })}
              <input value={issued.code} readOnly onFocus={(event) => event.target.select()} />
            </label>
            <p>{t('shareCode')}</p>
            <button className="text-button" onClick={() => setIssued(undefined)}>
              {t('hideCode')}
            </button>
          </div>
        )}
      </section>
      <section className="panel moderation" aria-labelledby="moderation-title">
        <h2 id="moderation-title">{t('bottleModeration')}</h2>
        {messages.length === 0 && <p>{t('emptyModeration')}</p>}
        {messages.map((message) => (
          <article key={message.id}>
            <div>
              <strong>{message.label}</strong> · {t('week', { number: Number(message.questId.slice(1)) })} ·{' '}
              {message.kind}
              <p>{message.text}</p>
            </div>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await hideMessage(access.token, message.id);
                  setMessages((current) => current.filter((item) => item.id !== message.id));
                  setNotice(t('hiddenMessage'));
                })
              }
            >
              {t('hideMessage')}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
