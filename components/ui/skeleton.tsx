import { cn } from "@/lib/utils"

/**
 * Skeleton 컴포넌트
 * - 로딩 상태를 나타내는 shimmer 애니메이션 플레이스홀더
 * - 왼쪽→오른쪽 그라데이션 스윕 효과
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-[length:200%_100%] animate-shimmer",
        "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
