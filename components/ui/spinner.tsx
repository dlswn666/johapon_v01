import { LoaderIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Spinner 컴포넌트
 * - shadcn/ui 패턴을 따르는 로딩 인디케이터
 * - 버튼 및 기타 UI 요소의 로딩 상태 표시에 사용
 */
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }

