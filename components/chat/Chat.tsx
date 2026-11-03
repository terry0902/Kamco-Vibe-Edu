"use client";

// Design Ref: §1 화면 구성 — 대화와 API 키는 서버에 저장하지 않고 이 브라우저에만 둔다.
import { useEffect, useMemo, useRef, useState } from "react";
import StartHero from "@/components/start/StartHero";
import { toHistory, toTitle } from "@/lib/chat/conversations";
import {
  DEFAULT_MANUAL_FOLDER,
  manualFolderLabel,
  type ManualFolderId,
} from "@/lib/chat/folders";
import {
  API_KEY_HEADER,
  chatResponseSchema,
  errorResponseSchema,
  isInputTooLong,
  type ChatMessage,
  type ChatResponse,
  type CustomDoc,
} from "@/lib/chat/types";
import AnswerCard, { ErrorCard } from "./AnswerCard";
import ChatInput from "./ChatInput";
import SettingsDialog from "./SettingsDialog";
import { useCustomFolder } from "./useCustomFolder";
import Sidebar from "./Sidebar";
import {
  appendEntry,
  clearConversations,
  deleteConversation,
  saveApiKey,
  saveFolder,
  useChatStorage,
} from "./useChatStorage";
import WelcomeScreen from "./WelcomeScreen";

type ChatResult =
  | { ok: true; response: ChatResponse }
  | { ok: false; message: string; code?: string };

const DEFAULT_ERROR_MESSAGE =
  "답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.";

async function requestAnswer(
  messages: ChatMessage[],
  apiKey: string,
  folder: ManualFolderId,
  customDocs: CustomDoc[] | undefined,
): Promise<ChatResult> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", [API_KEY_HEADER]: apiKey },
      body: JSON.stringify({ messages, folder, customDocs }),
    });
    const body: unknown = await response.json();

    if (response.ok) {
      return { ok: true, response: chatResponseSchema.parse(body) };
    }
    const { error } = errorResponseSchema.parse(body);
    return { ok: false, message: error.message, code: error.code };
  } catch {
    return { ok: false, message: DEFAULT_ERROR_MESSAGE };
  }
}

export default function Chat() {
  const { conversations, apiKey, keyRemembered, folder } = useChatStorage();
  const customFolder = useCustomFolder();
  // 내 폴더를 고르지 않았거나 새로고침으로 사라졌으면 기본 폴더로 답한다.
  const activeFolder: ManualFolderId =
    folder === "custom" && !customFolder ? DEFAULT_MANUAL_FOLDER : folder;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(
    () => conversations.find((item) => item.id === activeId)?.entries ?? [],
    [conversations, activeId],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [entries, loading]);

  async function handleSubmit() {
    const question = input.trim();
    if (question === "" || loading || isInputTooLong(input)) return;
    if (!apiKey) {
      setSettingsOpen(true);
      return;
    }

    const id = activeId ?? crypto.randomUUID();
    const title = toTitle(question);
    const messages: ChatMessage[] = [
      ...toHistory(entries),
      { role: "user", content: question },
    ];

    setActiveId(id);
    appendEntry(id, title, { type: "question", text: question });
    setInput("");
    setLoading(true);

    const result = await requestAnswer(
      messages,
      apiKey,
      activeFolder,
      activeFolder === "custom" ? customFolder?.docs : undefined,
    );

    if (result.ok) {
      appendEntry(id, title, { type: "answer", response: result.response });
    } else {
      appendEntry(id, title, { type: "error", message: result.message });
      // 오류가 나면 질문을 입력창에 되돌려 다시 보낼 수 있게 한다.
      setInput(question);
      if (result.code === "API_KEY_REQUIRED" || result.code === "API_KEY_INVALID") {
        setSettingsOpen(true);
      }
    }
    setLoading(false);
  }

  function handleNewChat() {
    setActiveId(null);
    setInput("");
    setSidebarOpen(false);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setInput("");
    setSidebarOpen(false);
  }

  function handleDelete(id: string) {
    if (!window.confirm("이 대화를 삭제할까요? 되돌릴 수 없습니다.")) return;
    deleteConversation(id);
    if (id === activeId) {
      setActiveId(null);
    }
  }

  function handleClearConversations() {
    if (!window.confirm("대화를 모두 삭제할까요? 되돌릴 수 없습니다.")) return;
    clearConversations();
    setActiveId(null);
  }

  return (
    <>
    {!started && (
      <StartHero
        needsApiKey={!apiKey}
        onStart={() => setStarted(true)}
        onOpenHistory={() => {
          setStarted(true);
          setSidebarOpen(true);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    )}
    <div className="flex h-dvh w-full">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={sidebarOpen}
        disabled={loading}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onOpenSettings={() => {
          setSidebarOpen(false);
          setSettingsOpen(true);
        }}
      />

      <div className="mx-auto flex h-full min-w-0 max-w-3xl flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="대화 목록 열기"
            className="shrink-0 rounded-full border border-line bg-white/5 px-3 py-1 text-sm md:hidden"
          >
            ☰
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold">서버 장애 대응 도우미</h1>
            <p className="truncate text-xs text-muted">
              참조 폴더:{" "}
              {activeFolder === "custom" && customFolder
                ? `내 폴더 (${customFolder.label})`
                : manualFolderLabel(activeFolder)}
            </p>
          </div>
        </header>

        <main
          aria-live="polite"
          className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        >
          {entries.length === 0 && (
            <WelcomeScreen
              needsApiKey={!apiKey}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
          {entries.map((entry, index) => {
            switch (entry.type) {
              case "question":
                return (
                  <p
                    key={index}
                    className="max-w-[85%] self-end rounded-2xl bg-accent/15 px-3 py-2 text-sm leading-6 break-words whitespace-pre-wrap ring-1 ring-accent/30"
                  >
                    {entry.text}
                  </p>
                );
              case "answer":
                return <AnswerCard key={index} response={entry.response} />;
              case "error":
                return <ErrorCard key={index} message={entry.message} />;
            }
          })}
          {loading && (
            <p className="text-sm text-muted">찾는 중...</p>
          )}
          <div ref={bottomRef} />
        </main>

        <footer className="border-t border-line px-4 py-3">
          <ChatInput
            value={input}
            disabled={loading}
            onChange={setInput}
            onSubmit={handleSubmit}
          />
        </footer>
      </div>

      {settingsOpen && (
        <SettingsDialog
          apiKey={apiKey}
          keyRemembered={keyRemembered}
          folder={folder}
          onSaveFolder={saveFolder}
          conversationCount={conversations.length}
          onSaveApiKey={saveApiKey}
          onClearConversations={handleClearConversations}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
    </>
  );
}
