// 내 폴더에서 읽은 문서는 이 탭의 메모리에만 두고, 저장소에는 쓰지 않는다. 새로고침하면 다시 골라야 한다.
import { useSyncExternalStore } from "react";
import type { LocalFolderResult } from "./localFolder";

const listeners = new Set<() => void>();
let current: LocalFolderResult | null = null;

export function setCustomFolder(next: LocalFolderResult | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCustomFolder(): LocalFolderResult | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
