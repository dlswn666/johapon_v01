'use client';

interface QuorumProgressBarProps {
  label: string;
  currentPct: number;
  requiredPct: number;
}

export default function QuorumProgressBar({ label, currentPct, requiredPct }: QuorumProgressBarProps) {
  const isMet = currentPct >= requiredPct;
  const barColor = isMet ? 'bg-[#16a34a]' : 'bg-[#dc2626]';
  const displayPct = Math.min(currentPct, 100);
  const deficit = requiredPct - currentPct;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-semibold ${isMet ? 'text-green-700' : 'text-red-600'}`}>
          {isMet ? '충족' : `${deficit.toFixed(1)}% 부족`}
        </span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${displayPct}%` }}
        />
        {/* 기준선 마커 */}
        <div
          className="absolute top-0 h-full w-0.5 bg-gray-400"
          style={{ left: `${Math.min(requiredPct, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>현재 {currentPct.toFixed(1)}%</span>
        <span>기준 {requiredPct}%</span>
      </div>
    </div>
  );
}
