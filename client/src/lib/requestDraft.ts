import { ConfigRequestPreset, StepConfig } from '../types/config';
import { RequestAuthState, RequestDraft, RequestKVRow } from '../types/http';
import { generateId } from './id';

function createRow(key = '', value = '', enabled = true): RequestKVRow {
  return {
    id: generateId(),
    key,
    value,
    enabled
  };
}

function toRows(record?: Record<string, string>): RequestKVRow[] {
  if (!record || Object.keys(record).length === 0) {
    return [createRow('', '', true)];
  }
  return Object.entries(record).map(([key, value]) => createRow(key, value, true));
}

function authFromPreset(preset?: ConfigRequestPreset): RequestAuthState {
  if (!preset?.authPreset) {
    return { type: 'none' };
  }
  return {
    type: preset.authPreset.type,
    bearerToken: preset.authPreset.token,
    username: preset.authPreset.username,
    password: preset.authPreset.password,
    apiKeyIn: preset.authPreset.apiKeyIn ?? 'header',
    apiKeyName: preset.authPreset.apiKeyName ?? 'x-api-key',
    apiKeyValue: preset.authPreset.apiKeyValue
  };
}

export function createDefaultDraft(baseUrl: string): RequestDraft {
  return {
    id: generateId(),
    method: 'GET',
    urlMode: 'full',
    baseUrl,
    path: '',
    fullUrl: '',
    query: [createRow()],
    headers: [createRow()],
    auth: { type: 'none', apiKeyIn: 'header', apiKeyName: 'x-api-key' },
    body: { mode: 'none', text: '' },
    timeoutMs: 15000
  };
}

export function buildRequestDraft(baseUrl: string, preset?: ConfigRequestPreset): RequestDraft {
  const draft = createDefaultDraft(baseUrl);
  draft.method = preset?.method ?? draft.method;
  draft.path = preset?.path ?? draft.path;
  draft.fullUrl = draft.path.startsWith('/') ? draft.path : `/${draft.path}`;
  draft.headers = toRows(preset?.headers);
  draft.query = toRows(preset?.query);
  draft.body = {
    mode: preset?.bodyTemplate ? 'json' : 'none',
    text: preset?.bodyTemplate ?? ''
  };
  draft.auth = authFromPreset(preset);
  return draft;
}

export function buildDraftForStep(baseUrl: string, step: StepConfig): RequestDraft {
  return buildRequestDraft(baseUrl, step.request);
}
