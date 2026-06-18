import { CheckEvaluationResult } from '../../lib/checks';
import { StepConfig } from '../../types/config';
import { CheckList } from '../steps/CheckList';
import { StepList } from '../steps/StepList';

interface GuidedStepsSectionProps {
  steps: StepConfig[];
  selectedStepId: string | null;
  completedStepIds: string[];
  checkResults: CheckEvaluationResult[];
  onSelectStep: (stepId: string | null) => void;
  onRunStep: () => void;
  isSending: boolean;
}

export function GuidedStepsSection({
  steps,
  selectedStepId,
  completedStepIds,
  checkResults,
  onSelectStep,
  onRunStep,
  isSending
}: GuidedStepsSectionProps) {
  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? null;

  if (steps.length === 0) {
    return (
      <div className="box card non-interactive tw-bg-white tw-p-4">
        <h3 className="heading-small">Guided Steps</h3>
        <p className="body-small tw-opacity-70 tw-mt-2">No guided steps configured for this task.</p>
      </div>
    );
  }

  return (
    <section className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-[360px_1fr] tw-gap-3 tw-h-full tw-min-h-0">
      <div className="box card non-interactive tw-bg-white tw-p-3 tw-overflow-auto">
        <StepList
          steps={steps}
          completedStepIds={completedStepIds}
          selectedStepId={selectedStepId}
          onSelect={(step) => onSelectStep(step.id)}
        />
      </div>

      <div className="tw-space-y-3 tw-min-h-0">
        <div className="box card non-interactive tw-bg-white tw-p-3">
          <div className="row-between tw-gap-2">
            <div>
              <h3 className="heading-small">{selectedStep ? selectedStep.title : 'Select a step'}</h3>
              <p className="body-small tw-opacity-70 tw-mt-1">
                {selectedStep ? selectedStep.description : 'Pick a step from the list to load and run its request preset.'}
              </p>
            </div>
            <button type="button" className="button button-primary" disabled={!selectedStep || isSending} onClick={onRunStep}>
              {isSending ? 'Running...' : 'Run Step'}
            </button>
          </div>
        </div>

        <div className="box card non-interactive tw-bg-white tw-p-3 tw-overflow-auto">
          <div className="row-between tw-mb-2">
            <h4 className="heading-small">Check Results</h4>
            {selectedStep && (
              <span className={`tag ${completedStepIds.includes(selectedStep.id) ? 'tag-positive' : 'tag-neutral'}`}>
                {completedStepIds.includes(selectedStep.id) ? 'Completed' : 'Pending'}
              </span>
            )}
          </div>
          <CheckList results={checkResults} />
        </div>
      </div>
    </section>
  );
}
