// 브라우저에 저장하는 대화 기록의 형식이다. 서버로 저장하지 않는다.
import { z } from "zod";
import {
  chatResponseSchema,
  toHistoryMessage,
  type ChatMessage,
} from "./types";

export const MAX_CONVERSATIONS = 50;
const MAX_TITLE_LENGTH = 40;

const entrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("question"), text: z.string().min(1) }),
  z.object({ type: z.literal("answer"), response: chatResponseSchema }),
  z.object({ type: z.literal("error"), message: z.string().min(1) }),
]);

const conversationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  updatedAt: z.number(),
  entries: z.array(entrySchema),
});

export type Entry = z.infer<typeof entrySchema>;
export type Conversation = z.infer<typeof conversationSchema>;

export function toTitle(question: string): string {
  const line = question.trim().split(/\r?\n/)[0];
  return line.length > MAX_TITLE_LENGTH
    ? `${line.slice(0, MAX_TITLE_LENGTH)}…`
    : line;
}

// 저장된 값이 깨졌거나 형식이 달라도 앱이 멈추지 않도록 읽을 수 있는 대화만 돌려준다.
export function parseConversations(raw: string | null): Conversation[] {
  if (!raw) {
    return [];
  }
  try {
    const stored: unknown = JSON.parse(raw);
    if (!Array.isArray(stored)) {
      return [];
    }
    return stored.flatMap((item) => {
      const parsed = conversationSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

// 가장 최근 대화를 맨 앞에 두고, 상한을 넘으면 오래된 대화부터 지운다.
export function upsertConversation(
  conversations: Conversation[],
  conversation: Conversation,
): Conversation[] {
  return [
    conversation,
    ...conversations.filter((item) => item.id !== conversation.id),
  ].slice(0, MAX_CONVERSATIONS);
}

// Design Ref: §2 이전 답변을 다시 보내는 규칙 — 오류가 난 질문과 오류 메시지는 대화 기록에 넣지 않는다.
export function toHistory(entries: Entry[]): ChatMessage[] {
  return entries.flatMap((entry, index): ChatMessage[] => {
    if (entry.type === "answer") {
      return [toHistoryMessage(entry.response)];
    }
    if (entry.type === "question" && entries[index + 1]?.type === "answer") {
      return [{ role: "user", content: entry.text }];
    }
    return [];
  });
}
