import { RequestHistoryEntry } from '../../types/http';

interface HistoryPanelProps {
  entries: RequestHistoryEntry[];
  onSelect: (entry: RequestHistoryEntry) => void;
}

function statusTagClass(status: number): string {
  if (status >= 200 && status < 300) return 'tag-positive';
  if (status >= 400) return 'tag-danger';
  return 'tag-warning';
}

export function HistoryPanel({ entries, onSelect }: HistoryPanelProps) {
  const getPath = (rawUrl: string): string => {
    try {
      const parsed = new URL(rawUrl);
      return `${parsed.pathname}${parsed.search}`;
    } catch (_error) {
      return rawUrl;
    }
  };

  return (
    <div className="tw-flex tw-flex-col tw-gap-2">
      {entries.length === 0 ? (
        <p className="body-small tw-opacity-70">No requests yet.</p>
      ) : (
        <div className="tw-flex tw-flex-col tw-gap-2">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="api-history-item"
              onClick={() => onSelect(entry)}
            >
              <span className={`api-method-dot api-method-${entry.method.toLowerCase()}`}>{entry.method}</span>
              <span className="body-default tw-font-medium tw-truncate">{getPath(entry.url)}</span>
              <span className="body-small tw-font-mono" style={{ color: '#64748b' }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="api-history-item-meta">
                <span className={`tag ${entry.status ? statusTagClass(entry.status) : 'tag-neutral'}`}>
                  {entry.status ?? '–'}
                </span>
                {typeof entry.durationMs === 'number' && (
                  <span className="tag tag-neutral">{entry.durationMs.toFixed(0)} ms</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
