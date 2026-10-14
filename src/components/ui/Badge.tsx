import { STATUS_COLORS } from '@/lib/constants';

export function Badge({ status, label }: { status: string; label?: string }) {
  const config = STATUS_COLORS[status] ?? STATUS_COLORS['planned'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label ?? config.label}
    </span>
  );
}

export function ProgressBadge({ value }: { value: number }) {
  let color = 'bg-slate-200 text-slate-600';
  if (value >= 100) color = 'bg-emerald-100 text-emerald-700';
  else if (value >= 75) color = 'bg-blue-100 text-blue-700';
  else if (value >= 50) color = 'bg-amber-100 text-amber-700';
  else if (value > 0) color = 'bg-orange-100 text-orange-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      {value}%
    </span>
  );
}
