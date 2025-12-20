import { cn } from "@/lib/utils"

/**
 * Skeleton 컴포넌트
 * - 로딩 상태를 나타내는 플레이스홀더
 * - 디자인 시스템: 짙은 회색(bg-gray-300) 사용
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-gray-300 animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
