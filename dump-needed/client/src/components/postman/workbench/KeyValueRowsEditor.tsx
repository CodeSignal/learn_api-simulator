import { RequestKVRow } from '../../../types/http';
import { generateId } from '../../../lib/id';

interface KeyValueRowsEditorProps {
  rows: RequestKVRow[];
  locked?: boolean;
  onChange: (rows: RequestKVRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
}

function ensureAtLeastOne(rows: RequestKVRow[]): RequestKVRow[] {
  if (rows.length > 0) {
    return rows;
  }
  return [{ id: generateId(), key: '', value: '', enabled: true }];
}

export function KeyValueRowsEditor({
  rows,
  locked = false,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  addLabel = '+ Add row'
}: KeyValueRowsEditorProps) {
  return (
    <div className="api-kv-editor">
      <div className="api-kv-head body-small">
        <span>On</span>
        <span>{keyPlaceholder}</span>
        <span>{valuePlaceholder}</span>
        <span className="tw-sr-only">Remove</span>
      </div>
      <div className="tw-flex tw-flex-col tw-gap-2">
        {rows.map((row) => (
          <div key={row.id} className="api-kv-row">
            <label className="input-checkbox input-checkbox-xsmall tw-self-center">
              <input
                type="checkbox"
                checked={row.enabled}
                disabled={locked}
                onChange={(event) => {
                  onChange(rows.map((item) => (item.id === row.id ? { ...item, enabled: event.target.checked } : item)));
                }}
              />
              <span className="input-checkbox-box">
                <span className="input-checkbox-checkmark" />
              </span>
              <span className="input-checkbox-label tw-sr-only">Enable row</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder={keyPlaceholder}
              value={row.key}
              disabled={locked}
              onChange={(event) => {
                onChange(rows.map((item) => (item.id === row.id ? { ...item, key: event.target.value } : item)));
              }}
            />
            <input
              type="text"
              className="input"
              placeholder={valuePlaceholder}
              value={row.value}
              disabled={locked}
              onChange={(event) => {
                onChange(rows.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item)));
              }}
            />
            <button
              type="button"
              className="button button-text api-kv-remove"
              disabled={locked}
              onClick={() => {
                onChange(ensureAtLeastOne(rows.filter((item) => item.id !== row.id)));
              }}
              aria-label="Remove row"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-pt-1">
        <button
          type="button"
          className="button button-text api-add-row-button"
          disabled={locked}
          onClick={() => {
            onChange([...rows, { id: generateId(), key: '', value: '', enabled: true }]);
          }}
        >
          {addLabel}
        </button>
        {locked && <span className="body-small tw-text-warning">Locked by task</span>}
      </div>
    </div>
  );
}
