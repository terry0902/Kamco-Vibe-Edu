"use client";

// Design Ref: §1 화면 구성 — 대화는 서버에 저장하지 않고 브라우저 상태로만 둔다.
import { useEffect, useRef, useState } from "react";
import {
  chatResponseSchema,
  errorResponseSchema,
  isInputTooLong,
  toHistoryMessage,
  type ChatMessage,
  type ChatResponse,
} from "@/lib/chat/types";
import AnswerCard, { ErrorCard } from "./AnswerCard";
import ChatInput from "./ChatInput";

type Entry =
  | { id: number; type: "question"; text: string }
  | { id: number; type: "answer"; response: ChatResponse }
  | { id: number; type: "error"; message: string };

type ChatResult =
  | { ok: true; response: ChatResponse }
  | { ok: false; message: string };

const DEFAULT_ERROR_MESSAGE =
  "답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.";

async function requestAnswer(messages: ChatMessage[]): Promise<ChatResult> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const body: unknown = await response.json();

    if (response.ok) {
      return { ok: true, response: chatResponseSchema.parse(body) };
    }
    return { ok: false, message: errorResponseSchema.parse(body).error.message };
  } catch {
    return { ok: false, message: DEFAULT_ERROR_MESSAGE };
  }
}

export default function Chat() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [entries, loading]);

  async function handleSubmit() {
    const question = input.trim();
    if (question === "" || loading || isInputTooLong(input)) return;

    setEntries((current) => [
      ...current,
      { id: nextId.current++, type: "question", text: question },
    ]);
    setInput("");
    setLoading(true);

    const userMessage: ChatMessage = { role: "user", content: question };
    const result = await requestAnswer([...history, userMessage]);

    if (result.ok) {
      setEntries((current) => [
        ...current,
        { id: nextId.current++, type: "answer", response: result.response },
      ]);
      // Design Ref: §2 이전 답변을 다시 보내는 규칙 — 오류가 난 질문은 대화 기록에 넣지 않는다.
      setHistory((current) => [
        ...current,
        userMessage,
        toHistoryMessage(result.response),
      ]);
    } else {
      setEntries((current) => [
        ...current,
        { id: nextId.current++, type: "error", message: result.message },
      ]);
      // 오류가 나면 질문을 입력창에 되돌려 다시 보낼 수 있게 한다.
      setInput(question);
    }
    setLoading(false);
  }

  function handleNewChat() {
    setEntries([]);
    setHistory([]);
    setInput("");
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-base font-semibold">서버 장애 대응 도우미</h1>
        <button
          type="button"
          onClick={handleNewChat}
          disabled={loading}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
        >
          새 대화
        </button>
      </header>

      <main
        aria-live="polite"
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {/* 작업 14에서 인터넷 검색을 연결하면 이 안내를 지운다. */}
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          아직 인터넷 검색이 연결되지 않아, 매뉴얼에 없는 내용은 찾지
          못함으로 답합니다.
        </p>
        {entries.map((entry) => {
          switch (entry.type) {
            case "question":
              return (
                <p
                  key={entry.id}
                  className="max-w-[85%] self-end rounded-lg bg-zinc-200 px-3 py-2 text-sm leading-6 break-words whitespace-pre-wrap dark:bg-zinc-700"
                >
                  {entry.text}
                </p>
              );
            case "answer":
              return <AnswerCard key={entry.id} response={entry.response} />;
            case "error":
              return <ErrorCard key={entry.id} message={entry.message} />;
          }
        })}
        {loading && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">찾는 중...</p>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <ChatInput
          value={input}
          disabled={loading}
          onChange={setInput}
          onSubmit={handleSubmit}
        />
      </footer>
    </div>
  );
}
