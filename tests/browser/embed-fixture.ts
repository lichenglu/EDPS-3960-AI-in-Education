import { archivedWeekOnePath, weekOneStudioPath } from '../../src/curriculum/studio-route';

const embedPaths: Record<string, string> = {
  '/studio': weekOneStudioPath,
  '/week-two': '/quests/w02',
};

Bun.serve({
  hostname: '127.0.0.1',
  port: 4199,
  fetch: (request) => {
    const path = embedPaths[new URL(request.url).pathname] ?? archivedWeekOnePath;
    return new Response(
      `<!doctype html><title>Canvas-style course frame</title><body style="margin:0"><iframe title="Course" style="border:0;width:320px;height:720px" src="http://127.0.0.1:4187${path}"></iframe>`,
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  },
});
