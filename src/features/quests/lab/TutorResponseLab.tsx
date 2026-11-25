import { useState } from 'react';
import { labReplies } from '@/curriculum/week-one';
import { runLabRule, type LabReply as Reply } from '../api/lab';

export function TutorResponseLab({ token, disabled }: { token: string; disabled: boolean }) {
  const [replies, setReplies] = useState<Partial<Record<'answer' | 'hint', Reply>>>({});
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const modes = [
    { id: 'answer' as const, label: 'Draft a correction', fallback: labReplies.answer },
    { id: 'hint' as const, label: 'Ask for a source line', fallback: labReplies.hint },
  ];

  async function runLab() {
    setRunning(true);
    setNotice('Preparing two responses…');
    const results = await Promise.all(
      modes.map(async (mode) => {
        try {
          return await runLabRule(token, mode.id);
        } catch {
          return { text: mode.fallback, source: 'scripted' } as const;
        }
      }),
    );
    setReplies({ answer: results[0], hint: results[1] });
    setNotice('Both responses are ready to compare.');
    setRunning(false);
  }

  return (
    <div className="lab">
      <button className="button secondary" disabled={running || disabled} onClick={() => void runLab()}>
        Compare tutor responses
      </button>
      <p className="notice" role="status">
        {notice}
      </p>
      {replies.answer && (
        <div className="lab-grid">
          {modes.map((mode) => (
            <section key={mode.id}>
              <h3>{mode.label}</h3>
              <small>
                {replies[mode.id]?.source === 'generated' ? 'Live AI response' : 'Scripted example'}
              </small>
              <p>{replies[mode.id]?.text}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
