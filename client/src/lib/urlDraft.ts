import { RequestDraft, RequestKVRow } from '../types/http';
import { generateId } from './id';

function normalizedRowsFromSearch(search: string): RequestKVRow[] {
  const params = new URLSearchParams(search);
  const rows = Array.from(params.entries()).map(([key, value]) => ({
    id: generateId(),
    key,
    value,
    enabled: true
  }));
  return rows.length > 0 ? rows : [{ id: generateId(), key: '', value: '', enabled: true }];
}

export function isAbsoluteUrl(input: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(input.trim());
}

export function ensureScheme(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || isAbsoluteUrl(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `http:${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

export function joinBaseUrl(baseUrl: string, input: string): string {
  const endpoint = input.trim();
  const base = baseUrl.trim();
  if (!base || isAbsoluteUrl(endpoint)) {
    return endpoint;
  }
  const trimmedBase = base.replace(/\/+$/, '');
  if (!endpoint) {
    return trimmedBase;
  }
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${trimmedBase}${normalizedPath}`;
}

export function composeUrlFromDraft(draft: RequestDraft, baseUrl = ''): string {
  if (draft.urlMode === 'full') {
    return joinBaseUrl(baseUrl, draft.fullUrl);
  }
  const base = draft.baseUrl.endsWith('/') ? draft.baseUrl.slice(0, -1) : draft.baseUrl;
  const path = draft.path.startsWith('/') ? draft.path : `/${draft.path}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(`${base}${path}`, origin);
  draft.query
    .filter((row) => row.enabled && row.key.trim().length > 0)
    .forEach((row) => url.searchParams.set(row.key, row.value));
  return url.toString();
}

export function applyUrlInputToDraft(draft: RequestDraft, input: string): RequestDraft {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  try {
    const parsed = new URL(input, origin);
    return {
      ...draft,
      urlMode: 'full',
      fullUrl: input,
      baseUrl: `${parsed.protocol}//${parsed.host}`,
      path: parsed.pathname,
      query: normalizedRowsFromSearch(parsed.search)
    };
  } catch (_error) {
    return {
      ...draft,
      urlMode: 'full',
      fullUrl: input
    };
  }
}
