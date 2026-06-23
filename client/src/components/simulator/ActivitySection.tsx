interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
}

interface ActivitySectionProps {
  activity: ActivityItem[];
}

export function ActivitySection({ activity }: ActivitySectionProps) {
  return (
    <section className="tw-h-full tw-min-h-0">
      <div className="box card non-interactive api-activity-card tw-h-full">
        <div className="api-activity-card-header">
          <h3 className="heading-xsmall">Activity Log</h3>
          {activity.length > 0 && <span className="api-activity-count body-small">{activity.length}</span>}
        </div>
        <div className="api-activity-card-body">
          {activity.length === 0 ? (
            <p className="body-small tw-opacity-70">No activity yet.</p>
          ) : (
            <ul className="api-activity-list">
              {activity.map((item) => (
                <li key={item.id} className="api-activity-item">
                  <span className="body-small api-activity-message">{item.message}</span>
                  <span className="body-small api-activity-time">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
