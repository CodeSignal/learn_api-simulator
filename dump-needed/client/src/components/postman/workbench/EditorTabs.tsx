import { ReactNode } from 'react';

export type EditorTabKey = 'params' | 'authorization' | 'headers' | 'body';

interface EditorTabsProps {
  activeTab: EditorTabKey;
  onChange: (tab: EditorTabKey) => void;
  sections: Record<EditorTabKey, ReactNode>;
}

const TAB_ITEMS: Array<{ id: EditorTabKey; label: string }> = [
  { id: 'params', label: 'Params' },
  { id: 'authorization', label: 'Authorization' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' }
];

export function EditorTabs({ activeTab, onChange, sections }: EditorTabsProps) {
  return (
    <div className="api-editor-panel">
      <div className="api-tab-row" role="tablist" aria-label="Request editor tabs">
        {TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`api-tab ${isActive ? 'api-tab-active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="api-editor-content">
        {sections[activeTab]}
      </div>
    </div>
  );
}
