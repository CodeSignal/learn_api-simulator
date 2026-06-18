import { useEffect, useState } from "react";
import { CheckEvaluationResult } from "../../lib/checks";
import { SimulatorConfig } from "../../types/config";
import {
  HttpResponseData,
  RequestDraft,
  RequestHistoryEntry,
} from "../../types/http";
import { CloseIcon, MenuIcon } from "../icons";
import { ActivitySection } from "./ActivitySection";
import { GuidedStepsSection } from "./GuidedStepsSection";
import { LogsSection } from "./LogsSection";
import { RequestSection } from "./RequestSection";
import { AppSection } from "./SectionNav";

interface SavedRequest {
  id: string;
  name: string;
  draft: RequestDraft;
}

interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
}

const SECTION_LABELS: Record<AppSection, string> = {
  request: "Request",
  guided: "Guided Steps",
  activity: "Activity",
  logs: "Logs",
};

interface PostmanPageProps {
  config: SimulatorConfig;
  draft: RequestDraft;
  isSending: boolean;
  response: HttpResponseData | null;
  requestError: string | null;
  selectedStepId: string | null;
  completedStepIds: string[];
  checkResults: CheckEvaluationResult[];
  history: RequestHistoryEntry[];
  savedRequests: SavedRequest[];
  activity: ActivityItem[];
  section: AppSection;
  onSelectSection: (section: AppSection) => void;
  onSelectStep: (stepId: string | null) => void;
  onRunStep: () => void;
  onDraftChange: (draft: RequestDraft) => void;
  onSend: () => void;
  onCopyCurl: () => void;
  onSaveRequest: () => void;
  onNewRequest: () => void;
  onCopyResponse: () => void;
  onRestoreHistory: (entry: RequestHistoryEntry) => void;
  onClearHistory: () => void;
  onRestoreSaved: (item: SavedRequest) => void;
}

const SECTIONS: AppSection[] = ["request", "guided", "activity", "logs"];

export function PostmanPage({
  config,
  draft,
  isSending,
  response,
  requestError,
  selectedStepId,
  completedStepIds,
  checkResults,
  history,
  savedRequests,
  activity,
  section,
  onSelectSection,
  onSelectStep,
  onRunStep,
  onDraftChange,
  onSend,
  onCopyCurl,
  onSaveRequest,
  onNewRequest,
  onCopyResponse,
  onRestoreHistory,
  onClearHistory,
  onRestoreSaved,
}: PostmanPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  return (
    <div className="api-sim-app tw-w-full tw-h-full tw-overflow-hidden">
      <div className="api-sim-topbar">
        <div className="api-sim-brand">
          <h2 className="heading-small">API Simulator</h2>
        </div>
        <div className="api-sim-topbar-controls">
          <div
            className="api-sim-section-switcher"
            role="tablist"
            aria-label="Workspace sections"
          >
            {SECTIONS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={section === id}
                className={`api-section-tab ${section === id ? "api-section-tab-active" : ""}`}
                onClick={() => onSelectSection(id)}
              >
                {SECTION_LABELS[id]}
              </button>
            ))}
          </div>
          {/* <button
            type="button"
            className="button button-text api-help-button"
            onClick={() => {
              const helpButton = document.getElementById('btn-help') as HTMLButtonElement | null;
              helpButton?.click();
            }}
          >
            Help
          </button> */}
          <button
            type="button"
            className="api-mobile-menu-toggle"
            aria-label="Open navigation menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <MenuIcon size={20} />
          </button>
        </div>
      </div>

      {/* Mobile nav overlay */}
      {mobileMenuOpen && (
        <div
          className="api-mobile-nav-overlay api-mobile-nav-open"
          onClick={() => setMobileMenuOpen(false)}
        >
          <nav
            className="api-mobile-nav-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="api-mobile-menu-toggle tw-self-end"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
            >
              <CloseIcon size={20} />
            </button>
            {SECTIONS.map((id) => (
              <button
                key={id}
                type="button"
                className={`api-mobile-nav-item ${section === id ? "api-mobile-nav-item-active" : ""}`}
                onClick={() => {
                  onSelectSection(id);
                  setMobileMenuOpen(false);
                }}
              >
                {SECTION_LABELS[id]}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="api-sim-layout">
        <section className="api-sim-layout-main tw-min-h-0 tw-overflow-hidden tw-p-4">
          {section === "request" && (
            <RequestSection
              draft={draft}
              allowEditing={
                config.steps.find((step) => step.id === selectedStepId)?.request
                  .allowEditing
              }
              isSending={isSending}
              response={response}
              requestError={requestError}
              history={history}
              onDraftChange={onDraftChange}
              onSend={onSend}
              onCopyCurl={onCopyCurl}
              onSaveRequest={onSaveRequest}
              onNewRequest={onNewRequest}
              onCopyResponse={onCopyResponse}
              onRestoreHistory={onRestoreHistory}
              onClearHistory={onClearHistory}
            />
          )}

          {section === "guided" && (
            <GuidedStepsSection
              steps={config.steps}
              selectedStepId={selectedStepId}
              completedStepIds={completedStepIds}
              checkResults={checkResults}
              onSelectStep={onSelectStep}
              onRunStep={onRunStep}
              isSending={isSending}
            />
          )}

          {section === "activity" && (
            <ActivitySection
              activity={activity}
              savedRequests={savedRequests}
              onRestoreSaved={onRestoreSaved}
            />
          )}

          {section === "logs" && <LogsSection />}
        </section>
      </div>
    </div>
  );
}
