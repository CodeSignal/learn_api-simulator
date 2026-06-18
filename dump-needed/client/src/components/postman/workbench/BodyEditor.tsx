import { RequestBodyMode } from '../../../types/http';

interface BodyEditorProps {
  mode: RequestBodyMode;
  text: string;
  locked?: boolean;
  jsonError: string | null;
  onChangeMode: (mode: RequestBodyMode) => void;
  onChangeText: (value: string) => void;
  onPrettify: () => void;
}

const BODY_MODES: RequestBodyMode[] = ['none', 'json', 'text', 'form'];

export function BodyEditor({
  mode,
  text,
  locked,
  jsonError,
  onChangeMode,
  onChangeText,
  onPrettify
}: BodyEditorProps) {
  return (
    <div className="api-body-editor">
      <div className="api-tab-row api-body-mode-row">
        {BODY_MODES.map((item) => (
          <button
            key={item}
            type="button"
            className={`api-tab ${item === mode ? 'api-tab-active' : ''}`}
            disabled={locked}
            onClick={() => onChangeMode(item)}
          >
            {item.toUpperCase()}
          </button>
        ))}
        {mode === 'json' && (
          <button type="button" className="button button-text api-body-beautify" disabled={locked} onClick={onPrettify}>
            Beautify
          </button>
        )}
      </div>

      {mode === 'none' ? (
        <div className="api-body-none-hint">
          This request does not have a body. Select a body type above to add one.
        </div>
      ) : (
        <textarea
          className={`input api-body-textarea ${jsonError ? 'tw-border-danger' : ''}`}
          disabled={locked}
          value={text}
          onChange={(event) => onChangeText(event.target.value)}
          placeholder={mode === 'json' ? '{\n  "key": "value"\n}' : mode === 'form' ? 'name=Alice&role=student' : 'Raw text'}
        />
      )}

      {jsonError && <p className="body-small tw-text-danger">{jsonError}</p>}
      {locked && <p className="body-small tw-text-warning">Locked by task</p>}
    </div>
  );
}
