// 대화 기록은 이 브라우저의 localStorage에 둔다.
// API 키는 기본으로 이 탭의 sessionStorage에 두고, 사용자가 고르면 localStorage에 둔다.
import { useSyncExternalStore } from "react";
import {
  parseConversations,
  upsertConversation,
  type Conversation,
  type Entry,
} from "@/lib/chat/conversations";

const CONVERSATIONS_KEY = "server-incident-helper:conversations";
const API_KEY_KEY = "server-incident-helper:openai-api-key";

type StorageArea = "local" | "session";
type Snapshot = {
  conversations: Conversation[];
  apiKey: string;
  keyRemembered: boolean;
};

const SERVER_SNAPSHOT: Snapshot = {
  conversations: [],
  apiKey: "",
  keyRemembered: false,
};
const listeners = new Set<() => void>();
let snapshot: Snapshot | undefined;

function storageOf(area: StorageArea): Storage {
  return area === "local" ? localStorage : sessionStorage;
}

function readItem(area: StorageArea, key: string): string | null {
  try {
    return storageOf(area).getItem(key);
  } catch {
    return null;
  }
}

function readSnapshot(): Snapshot {
  const tabKey = readItem("session", API_KEY_KEY);
  const rememberedKey = readItem("local", API_KEY_KEY);
  return {
    conversations: parseConversations(readItem("local", CONVERSATIONS_KEY)),
    apiKey: tabKey ?? rememberedKey ?? "",
    keyRemembered: tabKey === null && rememberedKey !== null,
  };
}

function getSnapshot(): Snapshot {
  snapshot ??= readSnapshot();
  return snapshot;
}

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // 다른 탭에서 바꾼 내용도 반영한다.
  function handleStorage() {
    publish(readSnapshot());
  }
  listeners.add(listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function writeItem(area: StorageArea, key: string, value: string | null) {
  // 저장 공간이 없거나 막혀 있어도 이번 화면에서는 계속 쓸 수 있게 한다.
  try {
    if (value === null) {
      storageOf(area).removeItem(key);
    } else {
      storageOf(area).setItem(key, value);
    }
  } catch {}
}

function saveConversations(conversations: Conversation[]) {
  writeItem("local", CONVERSATIONS_KEY, JSON.stringify(conversations));
  publish({ ...getSnapshot(), conversations });
}

export function appendEntry(id: string, title: string, entry: Entry) {
  const { conversations } = getSnapshot();
  const current = conversations.find((item) => item.id === id);
  saveConversations(
    upsertConversation(conversations, {
      id,
      title: current?.title ?? title,
      updatedAt: Date.now(),
      entries: [...(current?.entries ?? []), entry],
    }),
  );
}

export function deleteConversation(id: string) {
  saveConversations(
    getSnapshot().conversations.filter((item) => item.id !== id),
  );
}

export function clearConversations() {
  writeItem("local", CONVERSATIONS_KEY, null);
  publish({ ...getSnapshot(), conversations: [] });
}

export function saveApiKey(apiKey: string, remember: boolean) {
  // 한쪽에만 남도록 양쪽을 먼저 지운다.
  writeItem("local", API_KEY_KEY, null);
  writeItem("session", API_KEY_KEY, null);
  if (apiKey) {
    writeItem(remember ? "local" : "session", API_KEY_KEY, apiKey);
  }
  publish({
    ...getSnapshot(),
    apiKey,
    keyRemembered: Boolean(apiKey) && remember,
  });
}

export function useChatStorage(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}
