// 대화 기록과 API 키를 이 브라우저의 localStorage에만 보관한다.
import { useSyncExternalStore } from "react";
import {
  parseConversations,
  upsertConversation,
  type Conversation,
  type Entry,
} from "@/lib/chat/conversations";

const CONVERSATIONS_KEY = "server-incident-helper:conversations";
const API_KEY_KEY = "server-incident-helper:openai-api-key";

type Snapshot = { conversations: Conversation[]; apiKey: string };

const SERVER_SNAPSHOT: Snapshot = { conversations: [], apiKey: "" };
const listeners = new Set<() => void>();
let snapshot: Snapshot | undefined;

function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readSnapshot(): Snapshot {
  return {
    conversations: parseConversations(readItem(CONVERSATIONS_KEY)),
    apiKey: readItem(API_KEY_KEY) ?? "",
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

function writeItem(key: string, value: string | null) {
  // 저장 공간이 없거나 막혀 있어도 이번 화면에서는 계속 쓸 수 있게 한다.
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {}
}

function saveConversations(conversations: Conversation[]) {
  writeItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
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
  writeItem(CONVERSATIONS_KEY, null);
  publish({ ...getSnapshot(), conversations: [] });
}

export function saveApiKey(apiKey: string) {
  writeItem(API_KEY_KEY, apiKey || null);
  publish({ ...getSnapshot(), apiKey });
}

export function useChatStorage(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}
