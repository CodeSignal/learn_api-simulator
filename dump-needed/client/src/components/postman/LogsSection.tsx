import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRecentEvents } from '../../services/loggingApi';
import { EventType, SimulatorEvent } from '../../types/events';
import { CopyIcon, FilterIcon } from '../icons';

const EVENT_TYPES: EventType[] = [
  'app_loaded',
  'step_selected',
  'request_sent',
  'response_received',
  'checks_evaluated',
  'check_result',
  'step_completed',
  'request_saved',
  'history_restored',
  'progress_saved',
  'error'
];

export function LogsSection() {
  const [events, setEvents] = useState<SimulatorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(new Set(EVENT_TYPES));
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const data = await fetchRecentEvents({ limit: 200 });
    setEvents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const filtered = useMemo(
    () => events.filter((e) => selectedTypes.has(e.eventType)),
    [events, selectedTypes]
  );

  const toggleType = (type: EventType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const copyEvent = async (event: SimulatorEvent) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    } catch {
      // clipboard API may fail in non-secure contexts
    }
  };

  const eventKey = (e: SimulatorEvent, i: number) => `${e.timestamp}-${e.eventType}-${i}`;

  return (
    <section className="api-logs-section tw-h-full tw-flex tw-flex-col tw-gap-3 tw-min-h-0">
      {/* Filter bar */}
      <div className="api-logs-filter-bar">
        <div className="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
          <FilterIcon size={14} className="tw-shrink-0" />
          {EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`api-logs-type-chip ${selectedTypes.has(type) ? 'api-logs-type-chip-active' : ''}`}
              onClick={() => toggleType(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <button type="button" className="button button-text body-small" onClick={() => void loadEvents()}>
          Refresh
        </button>
      </div>

      {/* Events list */}
      <div className="api-logs-list tw-flex-1 tw-min-h-0 tw-overflow-auto">
        {loading ? (
          <p className="body-small tw-opacity-70 tw-p-4">Loading events…</p>
        ) : filtered.length === 0 ? (
          <p className="body-small tw-opacity-70 tw-p-4">No events match the current filter.</p>
        ) : (
          <table className="api-logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Step</th>
                <th>Session</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event, i) => {
                const key = eventKey(event, i);
                const isExpanded = expandedKey === key;
                return (
                  <Fragment key={key}>
                    <tr
                      className={`api-logs-row ${isExpanded ? 'api-logs-row-expanded' : ''}`}
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                    >
                      <td className="api-logs-cell-time">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <span
                          className={`api-logs-event-badge ${event.eventType === 'error' ? 'api-logs-event-error' : ''}`}
                        >
                          {event.eventType}
                        </span>
                      </td>
                      <td className="body-small">{event.stepId ?? '–'}</td>
                      <td className="body-small tw-font-mono tw-truncate" style={{ maxWidth: '120px' }}>
                        {event.sessionId.slice(0, 8)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button button-text api-logs-copy-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            void copyEvent(event);
                          }}
                          aria-label="Copy event JSON"
                        >
                          <CopyIcon size={14} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="api-logs-payload-row">
                        <td colSpan={5}>
                          <pre className="api-logs-payload-code">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
