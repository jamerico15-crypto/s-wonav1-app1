interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: string;
}

export function ProgressBar({ value, max = 100, color, height = 'h-2' }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const barColor = color ?? 'bg-[#EE3A25]';

  return (
    <div className={`w-full ${height} bg-slate-200 rounded-full overflow-hidden`}>
      <div
        className={`h-full ${barColor} rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
