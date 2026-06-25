import { useCallback, useEffect, useMemo, useState } from 'react';
import { SimulatorPage } from './components/simulator/SimulatorPage';
import { AppSection } from './components/simulator/SectionNav';
import { useConfig } from './hooks/useConfig';
import { useProgress } from './hooks/useProgress';
import { useRequestHistory } from './hooks/useRequestHistory';
import { useSession } from './hooks/useSession';
import { evaluateChecks, CheckEvaluationResult } from './lib/checks';
import { buildDraftForStep, createDefaultDraft } from './lib/requestDraft';
import { composeUrlFromDraft } from './lib/urlDraft';
import { buildCurl, executeRequest, maskDraftSecrets } from './services/httpClient';
import { logEvent } from './services/loggingApi';
import { SimulatorConfig } from './types/config';
import { SimulatorEvent } from './types/events';
import { HttpResponseData, RequestDraft, RequestHistoryEntry } from './types/http';

const FALLBACK_CONFIG: SimulatorConfig = {
  taskId: 'manual-mode',
  title: 'Manual Request',
  description: 'Compose and send HTTP requests without guided steps.',
  baseUrl: '',
  steps: []
};

interface SavedRequest {
  id: string;
  name: string;
  draft: RequestDraft;
}

const BASE_URL_STORAGE_KEY = 'api-sim-base-url';

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validateJsonBody(draft: RequestDraft): string | null {
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
    return error instanceof Error ? error.message : 'Invalid JSON body';
  }
}

export default function App() {
  const { config, error } = useConfig();
  const sessionId = useSession();

  const activeConfig = config ?? FALLBACK_CONFIG;
  return <ClientContainer key={activeConfig.taskId} config={activeConfig} sessionId={sessionId} configError={error} />;
}

function ClientContainer({
  config,
  sessionId,
  configError
}: {
  config: SimulatorConfig;
  sessionId: string;
  configError: string | null;
}) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(BASE_URL_STORAGE_KEY);
      if (stored !== null) {
        return stored;
      }
    } catch (_error) {
      // ignore unavailable storage
    }
    return config.baseUrl ?? '';
  });
  const [draft, setDraft] = useState<RequestDraft>(() => createDefaultDraft(config.baseUrl ?? ''));
  const [response, setResponse] = useState<HttpResponseData | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<CheckEvaluationResult[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeSavedRequestId, setActiveSavedRequestId] = useState<string | null>(null);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [section, setSection] = useState<AppSection>('request');
  const [toast, setToast] = useState<string | null>(null);
  const [activity, setActivity] = useState<Array<{ id: string; message: string; timestamp: string }>>([]);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>(() => {
    try {
      const raw = localStorage.getItem('api-sim-saved-requests');
      return raw ? (JSON.parse(raw) as SavedRequest[]) : [];
    } catch (_error) {
      return [];
    }
  });

  const { history, addEntry, clear } = useRequestHistory();
  const { progress, updateProgress } = useProgress(config.taskId, sessionId);

  const selectedStep = useMemo(
    () => config.steps.find((step) => step.id === selectedStepId) ?? null,
    [config.steps, selectedStepId]
  );

  const addActivity = useCallback((message: string) => {
    setActivity((prev) => [{ id: makeId(), message, timestamp: new Date().toISOString() }, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    void emitEvent(config.taskId, sessionId, 'app_loaded', {
      title: config.title,
      configStatus: configError ? 'fallback' : 'ok'
    }, null, setToast);
    addActivity('App loaded');
  }, [addActivity, config.taskId, config.title, configError, sessionId]);

  useEffect(() => {
    try {
      localStorage.setItem('api-sim-saved-requests', JSON.stringify(savedRequests));
    } catch (_error) {
      setToast('Could not persist saved requests');
    }
  }, [savedRequests]);

  useEffect(() => {
    try {
      localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl);
    } catch (_error) {
      // ignore unavailable storage
    }
  }, [baseUrl]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleSelectStep = useCallback(
    (stepId: string | null) => {
      setSelectedStepId(stepId);
      setRequestError(null);
      setActiveSavedRequestId(null);
      if (!stepId) {
        return;
      }
      const step = config.steps.find((item) => item.id === stepId);
      if (!step) {
        return;
      }
      setDraft(buildDraftForStep(config.baseUrl ?? '', step));
      addActivity(`Selected step: ${step.title}`);
      void emitEvent(config.taskId, sessionId, 'step_selected', { stepId }, stepId, setToast);
      void updateProgress((prev) => ({ ...prev, lastSelectedStepId: stepId, updatedAt: new Date().toISOString() }));
    },
    [addActivity, config.baseUrl, config.steps, config.taskId, sessionId, updateProgress]
  );

  const handleSend = useCallback(async () => {
    const jsonError = validateJsonBody(draft);
    if (jsonError) {
      setRequestError(jsonError);
      return;
    }

    setIsSending(true);
    setRequestError(null);
    setCheckResults([]);

    const masked = maskDraftSecrets(draft);
    await emitEvent(
      config.taskId,
      sessionId,
      'request_sent',
      {
        request: {
          method: masked.method,
          url: composeUrlFromDraft(masked, baseUrl),
          headerKeys: masked.headers.filter((row) => row.enabled && row.key.trim()).map((row) => row.key),
          bodyLength: masked.body.text.length,
          authType: masked.auth.type
        }
      },
      selectedStepId,
      setToast
    );
    addActivity(`Request sent: ${draft.method}`);

    try {
      const result = await executeRequest(draft, { baseUrl });
      setResponse(result.response);

      await emitEvent(
        config.taskId,
        sessionId,
        'response_received',
        {
          status: result.response.status,
          durationMs: result.response.durationMs,
          sizeBytes: result.response.sizeBytes,
          bodyPreview: result.response.rawBody.slice(0, 500)
        },
        selectedStepId,
        setToast
      );

      addEntry({
        timestamp: new Date().toISOString(),
        method: draft.method,
        url: result.requestUrl,
        status: result.response.status,
        durationMs: result.response.durationMs,
        stepId: selectedStepId,
        request: JSON.parse(JSON.stringify(draft)) as RequestDraft,
        response: result.response
      });

      void updateProgress((prev) => ({
        ...prev,
        lastSelectedStepId: selectedStepId,
        lastRequestDraftSummary: { method: draft.method, url: result.requestUrl, bodyMode: draft.body.mode },
        updatedAt: new Date().toISOString()
      }));

      addActivity(`Response ${result.response.status} in ${Math.round(result.response.durationMs)} ms`);

      if (!selectedStep) {
        return;
      }

      const checks = evaluateChecks(selectedStep.checks, result.response);
      setCheckResults(checks.results);
      await emitEvent(
        config.taskId,
        sessionId,
        'checks_evaluated',
        { stepId: selectedStep.id, allPassed: checks.allPassed, results: checks.results },
        selectedStep.id,
        setToast
      );

      addActivity(`Checks ${checks.allPassed ? 'passed' : 'failed'}: ${selectedStep.title}`);

      if (checks.allPassed) {
        await updateProgress((prev) => {
          const completedStepIds = prev.completedStepIds.includes(selectedStep.id)
            ? prev.completedStepIds
            : [...prev.completedStepIds, selectedStep.id];
          return {
            ...prev,
            completedStepIds,
            lastSelectedStepId: selectedStep.id,
            updatedAt: new Date().toISOString()
          };
        });
        await emitEvent(config.taskId, sessionId, 'step_completed', { stepId: selectedStep.id }, selectedStep.id, setToast);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setRequestError(message);
      addActivity(`Request failed: ${message}`);
      await emitEvent(config.taskId, sessionId, 'error', { message }, selectedStepId, setToast);
    } finally {
      setIsSending(false);
    }
  }, [addActivity, addEntry, baseUrl, config.taskId, draft, selectedStep, selectedStepId, sessionId, updateProgress]);

  const handleRunStep = useCallback(() => {
    if (!selectedStepId) {
      return;
    }
    void handleSend();
  }, [handleSend, selectedStepId]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !isSending) {
        event.preventDefault();
        void handleSend();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handleSend, isSending]);

  const handleDraftChange = useCallback((next: RequestDraft) => {
    setActiveSavedRequestId(null);
    setDraft(next);
  }, []);

  const handleNewRequest = useCallback(() => {
    setDraft(createDefaultDraft(config.baseUrl ?? ''));
    setSelectedStepId(null);
    setResponse(null);
    setRequestError(null);
    setCheckResults([]);
    setActiveSavedRequestId(null);
  }, [config.baseUrl]);

  const handleSaveRequest = useCallback(() => {
    setSaveName(`Request ${savedRequests.length + 1}`);
    setSavePromptOpen(true);
  }, [savedRequests.length]);

  const handleConfirmSave = useCallback(() => {
    const name = saveName.trim();
    if (!name) {
      return;
    }
    const item: SavedRequest = { id: makeId(), name, draft: JSON.parse(JSON.stringify(draft)) as RequestDraft };
    setSavedRequests((prev) => [item, ...prev].slice(0, 25));
    setActiveSavedRequestId(item.id);
    addActivity(`Saved request: ${name}`);
    void emitEvent(config.taskId, sessionId, 'request_saved', { name }, selectedStepId, setToast);
    setSavePromptOpen(false);
  }, [addActivity, config.taskId, draft, saveName, selectedStepId, sessionId]);

  const handleRestoreHistory = useCallback(
    (entry: RequestHistoryEntry) => {
      setDraft(JSON.parse(JSON.stringify(entry.request)) as RequestDraft);
      setResponse(entry.response ?? null);
      setRequestError(null);
      setSelectedStepId(entry.stepId ?? null);
      setActiveSavedRequestId(null);
      addActivity(`Restored from history: ${entry.method}`);
      void emitEvent(config.taskId, sessionId, 'history_restored', { historyId: entry.id }, entry.stepId ?? null, setToast);
    },
    [addActivity, config.taskId, sessionId]
  );

  const handleRestoreSaved = useCallback((item: SavedRequest) => {
    setDraft(JSON.parse(JSON.stringify(item.draft)) as RequestDraft);
    setRequestError(null);
    setSelectedStepId(null);
    setActiveSavedRequestId(item.id);
  }, []);

  const handleCopyCurl = useCallback(async () => {
    await navigator.clipboard.writeText(buildCurl(draft, baseUrl));
    setToast('Copied cURL');
  }, [baseUrl, draft]);

  const handleCopyResponse = useCallback(async () => {
    if (!response) {
      return;
    }
    await navigator.clipboard.writeText(response.rawBody);
    setToast('Copied response');
  }, [response]);

  return (
    <>
      <SimulatorPage
        config={config}
        draft={draft}
        baseUrl={baseUrl}
        onChangeBaseUrl={setBaseUrl}
        isSending={isSending}
        response={response}
        requestError={requestError}
        selectedStepId={selectedStepId}
        completedStepIds={progress.completedStepIds}
        checkResults={checkResults}
        history={history}
        savedRequests={savedRequests}
        activeSavedRequestId={activeSavedRequestId}
        activity={activity}
        section={section}
        onSelectSection={setSection}
        onSelectStep={handleSelectStep}
        onRunStep={handleRunStep}
        onDraftChange={handleDraftChange}
        onSend={() => void handleSend()}
        onCopyCurl={() => void handleCopyCurl()}
        onSaveRequest={handleSaveRequest}
        onNewRequest={handleNewRequest}
        onCopyResponse={() => void handleCopyResponse()}
        onRestoreHistory={handleRestoreHistory}
        onClearHistory={clear}
        onRestoreSaved={handleRestoreSaved}
      />

      {savePromptOpen && (
        <div
          className="api-modal-overlay"
          onClick={() => setSavePromptOpen(false)}
          role="presentation"
        >
          <div
            className="api-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Save request"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="heading-xsmall api-modal-title">Save Request</h3>
            <label className="body-small api-modal-label" htmlFor="api-save-name">
              Name
            </label>
            <input
              id="api-save-name"
              className="input"
              type="text"
              autoFocus
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleConfirmSave();
                } else if (event.key === 'Escape') {
                  setSavePromptOpen(false);
                }
              }}
              placeholder="e.g. Create user"
            />
            <div className="api-modal-actions">
              <button type="button" className="button button-text" onClick={() => setSavePromptOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleConfirmSave}
                disabled={!saveName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {configError && (
        <div className="tw-fixed tw-bottom-16 tw-right-4 box card tw-bg-warning tw-p-2 body-small">
          Config failed to load, running manual mode.
        </div>
      )}
      {toast && (
        <div className="tw-fixed tw-bottom-4 tw-right-4 tw-bg-[#0f172a] tw-text-white tw-px-4 tw-py-2 tw-rounded tw-shadow-lg body-small">
          {toast}
        </div>
      )}
    </>
  );
}

async function emitEvent(
  taskId: string,
  sessionId: string,
  eventType: SimulatorEvent['eventType'],
  payload: Record<string, unknown>,
  stepId: string | null,
  setToast: (value: string | null) => void
): Promise<void> {
  const success = await logEvent({
    timestamp: new Date().toISOString(),
    taskId,
    sessionId,
    stepId,
    eventType,
    payload
  });
  if (!success) {
    setToast('Logging unavailable');
  }
}
