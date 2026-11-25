import { api } from '@/lib/api-client';
import type { Access, Role } from '@/contracts/session';

const endpoint = '/api/v1/session';
export const connectSession = (code: string) => api<Access>(endpoint, undefined, 'POST', { code });
export const getSession = (token: string) => api<Omit<Access, 'token'>>(endpoint, token);
export const revokeSession = (token: string) => api(endpoint, token, 'DELETE');

export function readToken(role: Role) {
  try {
    return window.localStorage.getItem('next-move-' + role) ?? '';
  } catch {
    return '';
  }
}

export function rememberToken(role: Role, token?: string) {
  try {
    if (token) window.localStorage.setItem('next-move-' + role, token);
    else window.localStorage.removeItem('next-move-' + role);
  } catch {
    /* A blocked embed can still keep its session in memory. */
  }
}
