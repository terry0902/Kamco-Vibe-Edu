"use client";

// Design Ref: §1 화면 구성 — 대화는 서버에 저장하지 않고 브라우저 상태로만 둔다.
import { useEffect, useRef, useState } from "react";
import type { ChatResponse } from "@/lib/chat/types";
import AnswerCard, { ErrorCard } from "./AnswerCard";
import ChatInput from "./ChatInput";
import { MOCK_RESULTS } from "./mockAnswers";

type Entry =
  | { id: number; type: "question"; text: string }
  | { id: number; type: "answer"; response: ChatResponse }
  | { id: number; type: "error"; message: string };

const MOCK_DELAY_MS = 600;

export default function Chat() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(0);
  const mockIndex = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [entries, loading]);

  function handleSubmit() {
    const question = input.trim();
    if (question === "" || loading) return;

    setEntries((current) => [
      ...current,
      { id: nextId.current++, type: "question", text: question },
    ]);
    setInput("");
    setLoading(true);

    const result = MOCK_RESULTS[mockIndex.current % MOCK_RESULTS.length];
    mockIndex.current += 1;

    setTimeout(() => {
      if (result.ok) {
        setEntries((current) => [
          ...current,
          { id: nextId.current++, type: "answer", response: result.response },
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
    }, MOCK_DELAY_MS);
  }

  function handleNewChat() {
    setEntries([]);
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
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          아직 AI가 연결되지 않아, 보낼 때마다 임시 답변이 종류별로 표시됩니다.
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
