import type { IncomingMessage, ServerResponse } from 'node:http';

export class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly problem = 'invalid-request',
  ) {
    super(message);
  }
}
export function reject(status: number, message: string, problem?: string): never {
  throw new RequestError(status, message, problem);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json') {
    reject(415, 'Send JSON for this action.');
  }
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > 65_536) reject(413, 'The message is too long.');
    chunks.push(buffer);
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    reject(400, 'The message could not be read.');
  }
  if (!isObject(value)) reject(400, 'Send a JSON object for this action.');
  return value;
}

export function textField(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
}

export function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}
export function problem(response: ServerResponse, error: RequestError) {
  response.writeHead(error.status, {
    'Content-Type': 'application/problem+json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(
    JSON.stringify({
      type: '/problems/' + error.problem,
      title: error.message,
      status: error.status,
      detail: error.message,
      error: error.message,
    }),
  );
}
