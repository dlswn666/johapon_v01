import { useSyncExternalStore } from 'react';

// 클라이언트 여부를 안전하게 확인하는 훅
// useSyncExternalStore를 사용하여 hydration 불일치 방지
function subscribe() {
    // 브라우저에서는 구독이 필요없음 (한번 마운트되면 항상 클라이언트)
    return () => {};
}

function getSnapshot() {
    return true; // 클라이언트에서 호출되면 항상 true
}

function getServerSnapshot() {
    return false; // 서버에서 호출되면 항상 false
}

export function useIsClient() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
