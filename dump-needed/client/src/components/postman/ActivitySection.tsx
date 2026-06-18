import { RequestDraft } from '../../types/http';

interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
}

interface SavedRequest {
  id: string;
  name: string;
  draft: RequestDraft;
}

interface ActivitySectionProps {
  activity: ActivityItem[];
  savedRequests: SavedRequest[];
  onRestoreSaved: (item: SavedRequest) => void;
}

export function ActivitySection({ activity, savedRequests, onRestoreSaved }: ActivitySectionProps) {
  return (
    <section className="tw-grid tw-grid-cols-1 xl:tw-grid-cols-2 tw-gap-3 tw-h-full tw-min-h-0">
      <div className="box card non-interactive tw-bg-white tw-p-3 tw-overflow-auto">
        <h3 className="heading-small tw-mb-2">Activity Log</h3>
        {activity.length === 0 ? (
          <p className="body-small tw-opacity-70">No activity yet.</p>
        ) : (
          <div className="tw-space-y-2">
            {activity.map((item) => (
              <div key={item.id} className="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-border-b tw-border-border tw-pb-2">
                <span className="body-small">{item.message}</span>
                <span className="body-small tw-opacity-70">{new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="box card non-interactive tw-bg-white tw-p-3 tw-overflow-auto">
        <h3 className="heading-small tw-mb-2">Saved Requests</h3>
        {savedRequests.length === 0 ? (
          <p className="body-small tw-opacity-70">No saved requests yet.</p>
        ) : (
          <div className="tw-space-y-2">
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
    </section>
  );
}
