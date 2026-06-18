import { RequestKVRow } from '../../../types/http';
import { KeyValueRowsEditor } from './KeyValueRowsEditor';

interface HeadersEditorProps {
  rows: RequestKVRow[];
  locked?: boolean;
  onChange: (rows: RequestKVRow[]) => void;
}

export function HeadersEditor({ rows, locked, onChange }: HeadersEditorProps) {
  return (
    <div className="tw-space-y-3">
      <p className="body-small api-editor-hint">Headers are sent exactly as enabled in this table.</p>
      <KeyValueRowsEditor rows={rows} locked={locked} onChange={onChange} keyPlaceholder="Header" valuePlaceholder="Value" />
    </div>
  );
}
