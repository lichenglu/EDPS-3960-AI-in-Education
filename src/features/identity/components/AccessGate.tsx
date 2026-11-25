import { useI18n } from '@/lib/i18n/I18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { Button } from 'animal-island-ui';
import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { RequestError } from '@/lib/api-client';
import type { Role, Access } from '@/contracts/session';
import { connectSession, getSession, revokeSession, readToken, rememberToken } from '../api/session';

const previewHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

function SignIn({
  role,
  onAccess,
  initialNotice,
  expectedAccount,
}: {
  role: Role;
  onAccess: (access: Access) => void;
  initialNotice?: MessageKey;
  expectedAccount?: string;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<MessageKey | undefined>(initialNotice);

  async function connect(value: string) {
    setBusy(true);
    setNotice(undefined);
    try {
      const access = await connectSession(value.trim());
      if (access.role !== role) {
        await revokeSession(access.token);
        setNotice(role === 'learner' ? 'useLearnerCode' : 'useInstructorCode');
        return;
      }
      if (expectedAccount && expectedAccount !== access.accountKey) {
        await revokeSession(access.token);
        setNotice('differentLearner');
        return;
      }
      rememberToken(role, access.token);
      onAccess(access);
    } catch (error) {
      setNotice(
        error instanceof RequestError && error.status === 401
          ? 'invalidCode'
          : error instanceof RequestError && error.status === 429
            ? 'tooManyAttempts'
            : 'connectFailed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel login" aria-labelledby="access-title">
      <h2 id="access-title">
        {expectedAccount
          ? t('reconnectNotebook')
          : role === 'learner'
            ? t('enterLearningCenter')
            : t('instructorSignIn')}
      </h2>
      <p id="access-description">
        {expectedAccount
          ? t('reconnectHelp')
          : role === 'learner'
            ? t('enterLearnerCode')
            : t('enterInstructorCode')}
      </p>
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void connect(code);
        }}
      >
        <label htmlFor="access-code">{t('accessCode')}</label>
        <input
          id="access-code"
          aria-describedby="access-description"
          type="password"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <div className="actions">
          <Button className="button" type="primary" htmlType="submit" disabled={busy}>
            {busy ? t('connecting') : t('connect')}
          </Button>
          {previewHost && (
            <Button
              className="button secondary"
              disabled={busy}
              onClick={() => void connect(role === 'learner' ? 'DEMO-LEARNER' : 'DEMO-INSTRUCTOR')}
            >
              {t(role === 'learner' ? 'demoLearner' : 'demoInstructor')}
            </Button>
          )}
        </div>
        <p className="notice" role="status">
          {notice && t(notice)}
        </p>
      </form>
    </section>
  );
}

export function AccessGate({
  role,
  children,
  signInLayout,
}: {
  role: Role;
  signInLayout?: (form: ReactNode) => ReactNode;
  children: (access: Access, signOut: () => void, reconnect: () => void) => ReactNode;
}) {
  const { t } = useI18n();
  const [access, setAccess] = useState<Access>();
  const [reconnecting, setReconnecting] = useState(false);
  const [checking, setChecking] = useState(Boolean(readToken(role)));
  const [notice, setNotice] = useState<MessageKey>();

  useEffect(() => {
    let active = true;
    const token = readToken(role);
    if (token)
      void getSession(token)
        .then((session) => {
          if (active && session.role === role) setAccess({ ...session, token });
        })
        .catch((error) => {
          if (!active) return;
          if (error instanceof RequestError && error.status === 401) rememberToken(role);
          else setNotice('restoreFailed');
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    return () => {
      active = false;
    };
  }, [role]);

  if (checking)
    return (
      <p className="loading" role="status">
        {t('restoringSession')}
      </p>
    );
  if (!access) {
    const form = <SignIn role={role} onAccess={setAccess} initialNotice={notice} />;
    return signInLayout ? signInLayout(form) : form;
  }
  const form = reconnecting && (
    <SignIn
      role={role}
      expectedAccount={access.accountKey}
      onAccess={(next) => {
        setAccess(next);
        setReconnecting(false);
      }}
    />
  );
  return (
    <>
      {reconnecting && (signInLayout ? signInLayout(form) : form)}
      <div className="access-session" hidden={reconnecting}>
        {children(
          access,
          () => {
            void revokeSession(access.token).catch(() => undefined);
            rememberToken(role);
            setAccess(undefined);
          },
          () => setReconnecting(true),
        )}
      </div>
    </>
  );
}
