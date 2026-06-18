import { useState } from 'react';
import { HttpResponseData } from '../../types/http';
import { CopyIcon } from '../icons';

interface ResponsePaneProps {
  response: HttpResponseData | null;
  error: string | null;
  onCopy: () => void;
}

type ResponseTab = 'pretty' | 'raw' | 'headers';

function statusClass(status: number): string {
  if (status >= 200 && status < 300) {
    return 'tag-positive';
  }
  if (status >= 400) {
    return 'tag-danger';
  }
  return 'tag-warning';
}

export function ResponsePane({ response, error, onCopy }: ResponsePaneProps) {
  const [tab, setTab] = useState<ResponseTab>('pretty');

  if (error) {
    return (
      <div className="api-response-pane api-response-pane-error tw-h-full">
        <h3 className="heading-small tw-text-danger">Request error</h3>
        <p className="body-default tw-mt-2 tw-text-danger">{error}</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="api-response-pane api-response-empty tw-h-full">
        <div className="api-response-empty-hint">
          <p className="heading-small">No Response Yet</p>
          <p>Send a request to see the response here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="api-response-pane tw-min-w-0 tw-h-full tw-flex tw-flex-col">
      <div className="api-response-summary">
        <div className="tw-flex tw-flex-wrap tw-gap-2 tw-items-center">
          <span className={`tag ${statusClass(response.status)}`}>{response.status}</span>
          <span className="body-default">{response.statusText}</span>
          <span className="tag tag-neutral">{Math.round(response.durationMs)} ms</span>
          <span className="tag tag-neutral">{response.sizeBytes} bytes</span>
        </div>
        <button type="button" className="button button-text api-copy-response-btn" onClick={onCopy}>
          <CopyIcon size={14} />
          <span>Copy</span>
        </button>
      </div>

      <div className="api-tab-row api-response-tabs" role="tablist" aria-label="Response tabs">
        <button type="button" className={`api-tab ${tab === 'pretty' ? 'api-tab-active' : ''}`} onClick={() => setTab('pretty')}>
          Pretty
        </button>
        <button type="button" className={`api-tab ${tab === 'raw' ? 'api-tab-active' : ''}`} onClick={() => setTab('raw')}>
          Raw
        </button>
        <button type="button" className={`api-tab ${tab === 'headers' ? 'api-tab-active' : ''}`} onClick={() => setTab('headers')}>
          Headers
        </button>
      </div>

      <div className="api-response-viewer">
        {tab !== 'headers' ? (
          <pre className="api-response-code">
            {tab === 'pretty' ? response.prettyBody : response.rawBody}
          </pre>
        ) : (
          <div className="api-response-headers">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="tw-grid tw-grid-cols-[minmax(140px,220px)_1fr] tw-gap-2 tw-items-start">
                <span className="body-small tw-font-semibold">{key}</span>
                <span className="body-small tw-break-all">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
