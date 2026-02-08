import { cn } from '@/lib/utils';

interface FloorIndicatorProps {
  isBasement: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const FloorIndicator: React.FC<FloorIndicatorProps> = ({
  isBasement,
  size = 'md',
}) => {
  if (isBasement) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'bg-gray-800 text-white rounded font-bold',
            size === 'sm' && 'px-1.5 py-0.5 text-xs',
            size === 'md' && 'px-2 py-1 text-xs',
            size === 'lg' && 'px-3 py-1.5 text-sm'
          )}
        >
          B
        </span>
        <span
          className={cn(
            'text-gray-700 font-medium',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base'
          )}
        >
          지하층
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'bg-blue-500 text-white rounded font-bold flex items-center justify-center',
          size === 'sm' && 'px-1.5 py-0.5 text-xs w-6 h-6',
          size === 'md' && 'px-2 py-1 text-xs w-7 h-7',
          size === 'lg' && 'px-3 py-1.5 text-sm w-8 h-8'
        )}
      >
        ↑
      </span>
      <span
        className={cn(
          'text-blue-600 font-medium',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base'
        )}
      >
        지상층
      </span>
    </div>
  );
};
