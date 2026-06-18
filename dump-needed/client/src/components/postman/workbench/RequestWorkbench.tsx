import { ReactNode, useMemo, useState } from 'react';
import { ConfigRequestPreset } from '../../../types/config';
import { RequestBodyMode, RequestDraft } from '../../../types/http';
import { applyUrlInputToDraft, composeUrlFromDraft } from '../../../lib/urlDraft';
import { generateId } from '../../../lib/id';
import { RequestBar } from './RequestBar';
import { EditorTabs, EditorTabKey } from './EditorTabs';
import { ParamsEditor } from './ParamsEditor';
import { HeadersEditor } from './HeadersEditor';
import { AuthEditor } from './AuthEditor';
import { BodyEditor } from './BodyEditor';

interface RequestWorkbenchProps {
  draft: RequestDraft;
  allowEditing?: ConfigRequestPreset['allowEditing'];
  isSending: boolean;
  onChange: (next: RequestDraft) => void;
  onSend: () => void;
  onCopyCurl: () => void;
  onSave: () => void;
  onClear: () => void;
}

function jsonErrorFromDraft(draft: RequestDraft): string | null {
  if (draft.body.mode !== 'json') {
    return null;
  }
  if (!draft.body.text.trim()) {
    return null;
  }
  try {
    JSON.parse(draft.body.text);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid JSON payload';
  }
}

export function RequestWorkbench({
  draft,
  allowEditing,
  isSending,
  onChange,
  onSend,
  onCopyCurl,
  onSave,
  onClear
}: RequestWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<EditorTabKey>('params');

  const editable = useMemo(
    () => ({
      method: allowEditing?.method ?? true,
      path: allowEditing?.path ?? true,
      query: allowEditing?.query ?? true,
      headers: allowEditing?.headers ?? true,
      auth: allowEditing?.auth ?? true,
      body: allowEditing?.body ?? true
    }),
    [allowEditing]
  );

  const currentUrl = composeUrlFromDraft(draft);
  const jsonError = jsonErrorFromDraft(draft);

  const sections: Record<EditorTabKey, ReactNode> = {
    params: (
      <ParamsEditor
        rows={draft.query}
        locked={!editable.query}
        onChange={(rows) => {
          onChange({ ...draft, query: rows });
        }}
      />
    ),
    authorization: (
      <AuthEditor
        auth={draft.auth}
        locked={!editable.auth}
        onChange={(auth) => {
          onChange({ ...draft, auth });
        }}
      />
    ),
    headers: (
      <HeadersEditor
        rows={draft.headers}
        locked={!editable.headers}
        onChange={(rows) => {
          onChange({ ...draft, headers: rows });
        }}
      />
    ),
    body: (
      <BodyEditor
        mode={draft.body.mode}
        text={draft.body.text}
        locked={!editable.body}
        jsonError={jsonError}
        onChangeMode={(mode: RequestBodyMode) => {
          const hasContentType = draft.headers.some((row) => row.key.toLowerCase() === 'content-type');
          const nextHeaders =
            mode === 'json' && !hasContentType
              ? [...draft.headers, { id: generateId(), key: 'Content-Type', value: 'application/json', enabled: true }]
              : draft.headers;
          onChange({ ...draft, headers: nextHeaders, body: { ...draft.body, mode } });
        }}
        onChangeText={(text) => {
          onChange({ ...draft, body: { ...draft.body, text } });
        }}
        onPrettify={() => {
          try {
            const parsed = JSON.parse(draft.body.text);
            onChange({ ...draft, body: { ...draft.body, text: JSON.stringify(parsed, null, 2) } });
          } catch (_error) {
            // keep current text; validation message is already shown
          }
        }}
      />
    )
  };

  return (
    <div className="api-request-workbench">
      <RequestBar
        method={draft.method}
        url={currentUrl}
        isSending={isSending}
        methodDisabled={!editable.method}
        urlDisabled={!editable.path}
        onChangeMethod={(method) => {
          onChange({ ...draft, method });
        }}
        onChangeUrl={(url) => {
          onChange(applyUrlInputToDraft(draft, url));
        }}
        onSend={onSend}
        onCopyCurl={onCopyCurl}
        onSave={onSave}
        onClear={onClear}
      />
      {(!editable.method || !editable.path) && (
        <div className="body-small tw-text-warning api-request-lock-note">Some request fields are locked by the selected task.</div>
      )}
      <EditorTabs activeTab={activeTab} onChange={setActiveTab} sections={sections} />
    </div>
  );
}
