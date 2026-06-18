import { RequestKVRow } from '../../../types/http';
import { KeyValueRowsEditor } from './KeyValueRowsEditor';

interface ParamsEditorProps {
  rows: RequestKVRow[];
  locked?: boolean;
  onChange: (rows: RequestKVRow[]) => void;
}

export function ParamsEditor({ rows, locked, onChange }: ParamsEditorProps) {
  return (
    <div className="tw-space-y-3">
      <p className="body-small api-editor-hint">Configure query parameters that will be appended to the URL.</p>
      <KeyValueRowsEditor rows={rows} locked={locked} onChange={onChange} keyPlaceholder="Param" valuePlaceholder="Value" />
    </div>
  );
}
