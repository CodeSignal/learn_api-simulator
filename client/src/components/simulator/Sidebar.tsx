import { RequestDraft, RequestHistoryEntry } from '../../types/http';
import { StepConfig } from '../../types/config';
import { StepList } from '../steps/StepList';
import { HistoryPanel } from '../history/HistoryPanel';

interface SavedRequest {
  id: string;
  name: string;
  draft: RequestDraft;
}

interface SidebarProps {
  steps: StepConfig[];
  completedStepIds: string[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string | null) => void;
  history: RequestHistoryEntry[];
  onRestoreHistory: (entry: RequestHistoryEntry) => void;
  onClearHistory: () => void;
  savedRequests: SavedRequest[];
  onRestoreSaved: (item: SavedRequest) => void;
}

export function Sidebar({
  steps,
  completedStepIds,
  selectedStepId,
  onSelectStep,
  history,
  onRestoreHistory,
  onClearHistory,
  savedRequests,
  onRestoreSaved
}: SidebarProps) {
  return (
    <div className="tw-h-full tw-overflow-auto tw-p-3 tw-space-y-3">
      <div className="box card tw-bg-white tw-p-3 tw-space-y-2">
        <div className="row-between">
          <h3 className="heading-small">Guided steps</h3>
          <button type="button" className="button button-text" onClick={() => onSelectStep(null)}>
            Manual
          </button>
        </div>
        {steps.length === 0 ? (
          <p className="body-small tw-opacity-70">No guided steps configured.</p>
        ) : (
          <StepList
            steps={steps}
            completedStepIds={completedStepIds}
            selectedStepId={selectedStepId}
            onSelect={(step) => onSelectStep(step.id)}
          />
        )}
      </div>

      <div className="box card tw-bg-white tw-p-3">
        <HistoryPanel entries={history} onSelect={onRestoreHistory} onClear={onClearHistory} />
      </div>

      <div className="box card tw-bg-white tw-p-3 tw-space-y-2">
        <h3 className="heading-small">Collections</h3>
        {savedRequests.length === 0 ? (
          <p className="body-small tw-opacity-70">Save requests to build a collection.</p>
        ) : (
          <div className="tw-space-y-1">
            {savedRequests.map((item) => (
              <button
                key={item.id}
                type="button"
                className="button button-text tw-w-full tw-justify-start"
                onClick={() => onRestoreSaved(item)}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
