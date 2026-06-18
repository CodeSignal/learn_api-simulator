export type AppSection = 'request' | 'guided' | 'activity' | 'logs';

interface SectionNavProps {
  active: AppSection;
  open: boolean;
  onSelect: (section: AppSection) => void;
}

const ITEMS: Array<{ id: AppSection; label: string }> = [
  { id: 'request', label: 'Request' },
  { id: 'guided', label: 'Guided Steps' },
  { id: 'activity', label: 'Activity' },
  { id: 'logs', label: 'Logs' }
];

export function SectionNav({ active, open, onSelect }: SectionNavProps) {
  return (
    <aside className={`${open ? 'tw-block' : 'tw-hidden'} lg:tw-block api-sim-nav tw-bg-white`}>
      <div className="tw-p-3 tw-space-y-2">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`button tw-w-full tw-justify-start ${active === item.id ? 'button-primary' : 'button-text'}`}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
