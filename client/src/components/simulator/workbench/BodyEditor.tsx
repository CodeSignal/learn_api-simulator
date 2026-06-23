import { KeyboardEvent, useLayoutEffect, useRef } from 'react';
import { RequestBodyMode } from '../../../types/http';

const INDENT = '  ';

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    if (pendingSelection.current && textareaRef.current) {
      const { start, end } = pendingSelection.current;
      textareaRef.current.selectionStart = start;
      textareaRef.current.selectionEnd = end;
      pendingSelection.current = null;
    }
  }, [text]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab') {
      return;
    }
    event.preventDefault();
    const { selectionStart, selectionEnd, value } = event.currentTarget;

    if (selectionStart === selectionEnd && !event.shiftKey) {
      const caret = selectionStart + INDENT.length;
      pendingSelection.current = { start: caret, end: caret };
      onChangeText(value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd));
      return;
    }

    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const lines = value.slice(lineStart, selectionEnd).split('\n');

    if (event.shiftKey) {
      let removedFirst = 0;
      let removedTotal = 0;
      const newBlock = lines
        .map((line, index) => {
          const match = line.match(/^( {1,2}|\t)/);
          if (!match) {
            return line;
          }
          const removed = match[0].length;
          if (index === 0) {
            removedFirst = removed;
          }
          removedTotal += removed;
          return line.slice(removed);
        })
        .join('\n');
      pendingSelection.current = {
        start: Math.max(lineStart, selectionStart - removedFirst),
        end: selectionEnd - removedTotal
      };
      onChangeText(value.slice(0, lineStart) + newBlock + value.slice(selectionEnd));
      return;
    }

    const newBlock = lines.map((line) => INDENT + line).join('\n');
    pendingSelection.current = {
      start: selectionStart + INDENT.length,
      end: selectionEnd + INDENT.length * lines.length
    };
    onChangeText(value.slice(0, lineStart) + newBlock + value.slice(selectionEnd));
  };

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
          ref={textareaRef}
          className={`input api-body-textarea ${jsonError ? 'tw-border-danger' : ''}`}
          disabled={locked}
          value={text}
          spellCheck={false}
          onChange={(event) => onChangeText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'json' ? '{\n  "key": "value"\n}' : mode === 'form' ? 'name=Alice&role=student' : 'Raw text'}
        />
      )}

      {jsonError && <p className="body-small tw-text-danger">{jsonError}</p>}
      {locked && <p className="body-small tw-text-warning">Locked by task</p>}
    </div>
  );
}
