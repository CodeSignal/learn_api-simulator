import { RequestDraft, RequestExecutionResult, RequestKVRow } from '../types/http';
import { ensureScheme, joinBaseUrl } from '../lib/urlDraft';

function enabledRows(rows: RequestKVRow[]): RequestKVRow[] {
  return rows.filter((row) => row.enabled && row.key.trim().length > 0);
}

function buildSplitUrl(baseUrl: string, path: string, query: RequestKVRow[]): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost';
  const resolvedBase = new URL(baseUrl, origin).toString();
  const trimmedBase = resolvedBase.endsWith('/') ? resolvedBase.slice(0, -1) : resolvedBase;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const composed = new URL(`${trimmedBase}${normalizedPath}`);
  enabledRows(query).forEach((row) => {
    composed.searchParams.set(row.key, row.value);
  });
  return composed.toString();
}

function resolveRequestUrl(draft: RequestDraft, baseUrl = ''): string {
  if (draft.urlMode === 'full') {
    return ensureScheme(joinBaseUrl(baseUrl, draft.fullUrl).trim());
  }
  return ensureScheme(buildSplitUrl(draft.baseUrl, draft.path, draft.query));
}

function buildHeaders(draft: RequestDraft): Record<string, string> {
  const headers: Record<string, string> = {};
  enabledRows(draft.headers).forEach((row) => {
    headers[row.key] = row.value;
  });
  const hasContentTypeRow = draft.headers.some((row) => row.key.toLowerCase() === 'content-type');

  if (draft.auth.type === 'bearer' && draft.auth.bearerToken) {
    headers.Authorization = `Bearer ${draft.auth.bearerToken}`;
  }
  if (draft.auth.type === 'basic') {
    const encoded = btoa(`${draft.auth.username ?? ''}:${draft.auth.password ?? ''}`);
    headers.Authorization = `Basic ${encoded}`;
  }
  if (draft.auth.type === 'apiKey' && draft.auth.apiKeyIn === 'header' && draft.auth.apiKeyName && draft.auth.apiKeyValue) {
    headers[draft.auth.apiKeyName] = draft.auth.apiKeyValue;
  }

  if (draft.body.mode === 'json' && !hasContentTypeRow) {
    headers['Content-Type'] = 'application/json';
  }
  if (draft.body.mode === 'form' && !hasContentTypeRow) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  return headers;
}

function shouldSendBody(method: RequestDraft['method']): boolean {
  return !['GET', 'HEAD'].includes(method);
}

function resolveBody(draft: RequestDraft): string | undefined {
  if (!shouldSendBody(draft.method) || draft.body.mode === 'none') {
    return undefined;
  }
  return draft.body.text;
}

function applyAuthQueryParams(url: string, draft: RequestDraft): string {
  if (draft.auth.type !== 'apiKey' || draft.auth.apiKeyIn !== 'query' || !draft.auth.apiKeyName || !draft.auth.apiKeyValue) {
    return url;
  }
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost';
  const next = new URL(url, origin);
  next.searchParams.set(draft.auth.apiKeyName, draft.auth.apiKeyValue);
  return next.toString();
}

function shouldProxyThroughServer(requestUrl: string): boolean {
  try {
    const parsed = new URL(requestUrl);
    const localSidecarHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
    const currentOrigin =
      typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined;

    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      localSidecarHosts.has(parsed.hostname) &&
      Boolean(parsed.port) &&
      parsed.origin !== currentOrigin
    );
  } catch (_error) {
    return false;
  }
}

export interface ExecuteRequestOptions {
  signal?: AbortSignal;
  baseUrl?: string;
}

export async function executeRequest(
  draft: RequestDraft,
  options?: ExecuteRequestOptions
): Promise<RequestExecutionResult> {
  const requestUrl = applyAuthQueryParams(resolveRequestUrl(draft, options?.baseUrl ?? ''), draft).trim();
  const headers = buildHeaders(draft);
  const body = resolveBody(draft);

  const start = performance.now();
  const response = shouldProxyThroughServer(requestUrl)
    ? await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: requestUrl,
          method: draft.method,
          headers,
          body: body ?? null
        }),
        signal: options?.signal
      })
    : await fetch(requestUrl, {
        method: draft.method,
        headers,
        body,
        signal: options?.signal
      });

  const rawBody = await response.text();
  const durationMs = performance.now() - start;

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let jsonBody: unknown;
  let prettyBody = rawBody;
  try {
    jsonBody = JSON.parse(rawBody);
    prettyBody = JSON.stringify(jsonBody, null, 2);
  } catch (_error) {
    jsonBody = undefined;
  }

  return {
    requestUrl,
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      rawBody,
      prettyBody,
      jsonBody,
      durationMs,
      sizeBytes: new TextEncoder().encode(rawBody).length,
      requestUrl
    }
  };
}

export function buildCurl(draft: RequestDraft, baseUrl = ''): string {
  const parts: string[] = ['curl'];
  parts.push('-X', draft.method);
  const url = applyAuthQueryParams(resolveRequestUrl(draft, baseUrl), draft);
  parts.push(`"${url}"`);

  const headers = buildHeaders(draft);
  Object.entries(headers).forEach(([key, value]) => {
    parts.push('-H', `"${key}: ${value}"`);
  });

  const body = resolveBody(draft);
  if (typeof body === 'string' && body.length > 0) {
    parts.push('--data-raw', `"${body.replace(/"/g, '\\"')}"`);
  }

  return parts.join(' ');
}

export function maskDraftSecrets(draft: RequestDraft): RequestDraft {
  const cloned: RequestDraft = JSON.parse(JSON.stringify(draft)) as RequestDraft;
  if (cloned.auth.type === 'bearer' && cloned.auth.bearerToken) {
    cloned.auth.bearerToken = `${'*'.repeat(Math.max(0, cloned.auth.bearerToken.length - 4))}${cloned.auth.bearerToken.slice(-4)}`;
  }
  if (cloned.auth.type === 'basic') {
    cloned.auth.password = cloned.auth.password ? '***' : cloned.auth.password;
  }
  if (cloned.auth.type === 'apiKey') {
    cloned.auth.apiKeyValue = cloned.auth.apiKeyValue ? '***' : cloned.auth.apiKeyValue;
  }
  cloned.headers = cloned.headers.map((header) => {
    if (header.key.toLowerCase() === 'authorization' && header.value) {
      return { ...header, value: '***' };
    }
    return header;
  });
  return cloned;
}
