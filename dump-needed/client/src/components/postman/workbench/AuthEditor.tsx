import { RequestAuthState } from '../../../types/http';

interface AuthEditorProps {
  auth: RequestAuthState;
  locked?: boolean;
  onChange: (auth: RequestAuthState) => void;
}

export function AuthEditor({ auth, locked, onChange }: AuthEditorProps) {
  return (
    <div className="api-auth-editor">
      <label className="tw-flex tw-flex-col tw-gap-1">
        <span className="body-small api-field-label">Auth type</span>
        <select
          className="input"
          value={auth.type}
          disabled={locked}
          onChange={(event) => {
            const nextType = event.target.value as RequestAuthState['type'];
            onChange({
              ...auth,
              type: nextType,
              apiKeyIn: auth.apiKeyIn ?? 'header',
              apiKeyName: auth.apiKeyName ?? 'x-api-key'
            });
          }}
        >
          <option value="none">None</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apiKey">API Key</option>
        </select>
      </label>

      {auth.type === 'bearer' && (
        <label className="tw-flex tw-flex-col tw-gap-1">
          <span className="body-small api-field-label">Token</span>
          <input
            className="input"
            type="password"
            disabled={locked}
            value={auth.bearerToken ?? ''}
            onChange={(event) => onChange({ ...auth, bearerToken: event.target.value })}
          />
        </label>
      )}

      {auth.type === 'basic' && (
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-2">
          <label className="tw-flex tw-flex-col tw-gap-1">
            <span className="body-small api-field-label">Username</span>
            <input
              className="input"
              type="text"
              disabled={locked}
              value={auth.username ?? ''}
              onChange={(event) => onChange({ ...auth, username: event.target.value })}
            />
          </label>
          <label className="tw-flex tw-flex-col tw-gap-1">
            <span className="body-small api-field-label">Password</span>
            <input
              className="input"
              type="password"
              disabled={locked}
              value={auth.password ?? ''}
              onChange={(event) => onChange({ ...auth, password: event.target.value })}
            />
          </label>
        </div>
      )}

      {auth.type === 'apiKey' && (
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-[1fr_180px_1fr] tw-gap-2">
          <label className="tw-flex tw-flex-col tw-gap-1">
            <span className="body-small api-field-label">Key</span>
            <input
              className="input"
              type="text"
              disabled={locked}
              value={auth.apiKeyName ?? 'x-api-key'}
              onChange={(event) => onChange({ ...auth, apiKeyName: event.target.value })}
            />
          </label>
          <label className="tw-flex tw-flex-col tw-gap-1">
            <span className="body-small api-field-label">Add to</span>
            <select
              className="input"
              value={auth.apiKeyIn ?? 'header'}
              disabled={locked}
              onChange={(event) => onChange({ ...auth, apiKeyIn: event.target.value as 'header' | 'query' })}
            >
              <option value="header">Header</option>
              <option value="query">Query</option>
            </select>
          </label>
          <label className="tw-flex tw-flex-col tw-gap-1">
            <span className="body-small api-field-label">Value</span>
            <input
              className="input"
              type="password"
              disabled={locked}
              value={auth.apiKeyValue ?? ''}
              onChange={(event) => onChange({ ...auth, apiKeyValue: event.target.value })}
            />
          </label>
        </div>
      )}

      {locked && <p className="body-small tw-text-warning">Locked by task</p>}
    </div>
  );
}
