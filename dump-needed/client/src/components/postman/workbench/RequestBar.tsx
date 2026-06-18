import { useEffect, useRef, useState } from 'react';
import { HttpMethod } from '../../../types/http';
import { ChevronDownIcon } from '../../icons';

interface RequestBarProps {
  method: HttpMethod;
  url: string;
  isSending: boolean;
  methodDisabled?: boolean;
  urlDisabled?: boolean;
  onChangeMethod: (method: HttpMethod) => void;
  onChangeUrl: (url: string) => void;
  onSend: () => void;
  onCopyCurl: () => void;
  onSave: () => void;
  onClear: () => void;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function methodClass(method: HttpMethod): string {
  switch (method) {
    case 'GET':
      return 'api-method-get';
    case 'POST':
      return 'api-method-post';
    case 'PUT':
      return 'api-method-put';
    case 'PATCH':
      return 'api-method-patch';
    case 'DELETE':
      return 'api-method-delete';
    default:
      return '';
  }
}

export function RequestBar({
  method,
  url,
  isSending,
  methodDisabled = false,
  urlDisabled = false,
  onChangeMethod,
  onChangeUrl,
  onSend,
  onCopyCurl,
  onSave,
  onClear
}: RequestBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sendMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!sendMenuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  return (
    <div className="api-request-bar">
      <div className="api-request-main">
        <select
          className={`input api-method-select ${methodClass(method)}`}
          value={method}
          disabled={methodDisabled}
          onChange={(event) => onChangeMethod(event.target.value as HttpMethod)}
          aria-label="HTTP method"
        >
          {METHODS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <input
          className="input api-url-input"
          type="text"
          value={url}
          disabled={urlDisabled}
          onChange={(event) => onChangeUrl(event.target.value)}
          placeholder="http://localhost:3001/demo-api/health"
          aria-label="Request URL"
        />

        <div className="api-send-group" ref={sendMenuRef}>
          <button
            type="button"
            className="button button-primary api-send-button"
            onClick={() => {
              setMenuOpen(false);
              onSend();
            }}
            disabled={isSending}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
          <button
            type="button"
            className="button button-primary api-send-menu-toggle"
            aria-label="Open send actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <ChevronDownIcon size={14} />
          </button>
          {menuOpen && (
            <div className="api-send-menu" role="menu" aria-label="Send actions">
              <button
                type="button"
                className="api-send-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onCopyCurl();
                }}
              >
                Copy cURL
              </button>
              <button
                type="button"
                className="api-send-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSave();
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="api-send-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onClear();
                }}
              >
                New Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
