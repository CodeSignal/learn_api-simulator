import { useMemo, useState } from 'react';
import { ConfigRequestPreset } from '../../types/config';
import { HttpResponseData, RequestDraft, RequestHistoryEntry } from '../../types/http';
import { HistoryPanel } from '../history/HistoryPanel';
import { HistoryIcon, TrashIcon } from '../icons';
import { ResponsePane } from './ResponsePane';
import { RequestWorkbench } from './workbench/RequestWorkbench';

interface RequestSectionProps {
  draft: RequestDraft;
  allowEditing?: ConfigRequestPreset['allowEditing'];
  isSending: boolean;
  response: HttpResponseData | null;
  requestError: string | null;
  history: RequestHistoryEntry[];
  onDraftChange: (draft: RequestDraft) => void;
  onSend: () => void;
  onCopyCurl: () => void;
  onSaveRequest: () => void;
  onNewRequest: () => void;
  onCopyResponse: () => void;
  onRestoreHistory: (entry: RequestHistoryEntry) => void;
  onClearHistory: () => void;
}

export function RequestSection({
  draft,
  allowEditing,
  isSending,
  response,
  requestError,
  history,
  onDraftChange,
  onSend,
  onCopyCurl,
  onSaveRequest,
  onNewRequest,
  onCopyResponse,
  onRestoreHistory,
  onClearHistory
}: RequestSectionProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const historyTitle = useMemo(() => {
    if (history.length === 0) {
      return 'History';
    }
    return `History (${history.length})`;
  }, [history.length]);

  const filteredHistory = useMemo(() => {
    if (!historyFilter.trim()) return history;
    const term = historyFilter.toLowerCase();
    return history.filter(
      (e) =>
        e.method.toLowerCase().includes(term) ||
        e.url.toLowerCase().includes(term) ||
        String(e.status).includes(term)
    );
  }, [history, historyFilter]);

  return (
    <section className="api-request-workspace">
      <div className="api-request-composer">
        <RequestWorkbench
          draft={draft}
          allowEditing={allowEditing}
          isSending={isSending}
          onChange={onDraftChange}
          onSend={onSend}
          onCopyCurl={onCopyCurl}
          onSave={onSaveRequest}
          onClear={onNewRequest}
        />
      </div>

      <div className="api-response-pane-wrap">
        <ResponsePane response={response} error={requestError} onCopy={onCopyResponse} />
      </div>

      <div className="box card non-interactive api-history-drawer tw-shrink-0 tw-overflow-hidden">
        <div className="api-history-header">
          <span className="body-default api-history-header-title">
            <HistoryIcon size={16} />
            {historyTitle}
          </span>
          <div className="api-history-controls">
            {history.length > 0 && (
              <>
                {!confirmClear ? (
                  <button
                    type="button"
                    className="button button-text body-small api-history-clear-btn"
                    onClick={() => setConfirmClear(true)}
                    aria-label="Clear history"
                  >
                    <TrashIcon size={14} />
                  </button>
                ) : (
                  <div className="tw-flex tw-items-center tw-gap-1">
                    <span className="body-small" style={{ color: 'var(--danger)' }}>
                      Clear all?
                    </span>
                    <button
                      type="button"
                      className="button button-text body-small"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => {
                        onClearHistory();
                        setConfirmClear(false);
                      }}
                    >
                      Yes
                    </button>
                    <button type="button" className="button button-text body-small" onClick={() => setConfirmClear(false)}>
                      No
                    </button>
                  </div>
                )}
              </>
            )}
            <button type="button" className="button button-text body-small" onClick={() => setHistoryOpen((prev) => !prev)}>
              {historyOpen ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {historyOpen && (
          <div className="api-history-content">
            {history.length > 3 && (
              <input
                type="text"
                className="input api-history-search"
                placeholder="Filter by method, path, or status…"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              />
            )}
            <HistoryPanel entries={filteredHistory} onSelect={onRestoreHistory} />
          </div>
        )}
      </div>
    </section>
  );
}
