const postHogHosts = ['https://us.i.posthog.com', 'https://eu.i.posthog.com'];

export function hostedConfig(env: NodeJS.ProcessEnv) {
  const production = env.GAME_RUNTIME === 'production';
  if (!production)
    return {
      production,
      dbUrl: undefined,
      telemetry: undefined,
      staff: undefined,
    };

  let dbUrl: string | undefined;
  if (env.GAME_STORAGE === 'supabase') {
    let url: URL;
    try {
      url = new URL(env.SUPABASE_DATABASE_URL ?? '');
    } catch {
      throw new Error('Supabase storage requires SUPABASE_DATABASE_URL.');
    }
    if (!['postgres:', 'postgresql:'].includes(url.protocol))
      throw new Error('SUPABASE_DATABASE_URL must be a Postgres connection URL.');
    const sslMode = url.searchParams.get('sslmode') ?? 'verify-full';
    if (!['verify-full', 'verify-ca'].includes(sslMode))
      throw new Error('Supabase connections must verify database TLS.');
    if (!url.hostname || url.searchParams.has('host') || env.NODE_TLS_REJECT_UNAUTHORIZED === '0')
      throw new Error('Supabase storage requires a database host and TLS verification.');
    url.searchParams.set('sslmode', sslMode);
    dbUrl = url.toString();
  }

  const token = env.POSTHOG_PROJECT_TOKEN?.trim();
  const host = env.POSTHOG_HOST ?? postHogHosts[0];
  if (env.GAME_POSTHOG_ENABLED === '1' && (!token || !postHogHosts.includes(host)))
    throw new Error('PostHog requires a project token and a supported US or EU ingestion host.');
  const telemetry = env.GAME_POSTHOG_ENABLED === '1' ? { token, host } : undefined;

  const { GAME_COURSE_ID: courseId, GAME_INSTRUCTOR_LABEL: label, GAME_INSTRUCTOR_CODE: code } = env;
  if (
    dbUrl &&
    (courseId || label || code) &&
    (!courseId ||
      !/^[\w-]{1,80}$/.test(courseId) ||
      !label ||
      label.length > 60 ||
      !code ||
      !/^[\w-]{32,256}$/.test(code))
  )
    throw new Error(
      'Set a course ID, short instructor label, and private 32-character or longer bootstrap code together.',
    );
  const staff = dbUrl && courseId && label && code ? { courseId, label, code } : undefined;
  return { production, dbUrl, telemetry, staff };
}
