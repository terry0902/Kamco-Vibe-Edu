// Design Ref: §2 데이터 흐름 — OpenAI 호출은 서버에서만 하고, 응답 보관을 끈다.
import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { ChatMessage, ChatResponse } from "./types";

const DEFAULT_MODEL = "gpt-6-luna";
const MAX_OUTPUT_TOKENS = 1000;
const REQUEST_TIMEOUT_MS = 50_000;

const firstPassSchema = z.object({
  status: z.enum(["clarify", "notInManual"]),
  question: z.string().nullable(),
});

// 작업 8에서 매뉴얼을 연결하기 전까지는 근거가 없으므로 조치 방법을 만들지 않게 한다.
const INSTRUCTIONS = `당신은 서버 장애 대응을 돕는 도우미다.
아직 참고할 매뉴얼이 없으므로 조치 방법을 추측해서 쓰지 않는다.
- 증상이나 에러를 특정할 수 없을 만큼 입력이 모호하면 status를 "clarify"로 하고, question에 필요한 정보를 묻는 한국어 질문 1개를 쓴다.
- 그 밖에는 status를 "notInManual"로 하고 question을 null로 한다.
입력의 [IP], [호스트명], [계정] 같은 표시는 가려진 값이다. 원래 값을 묻거나 추측하지 않는다.`;

export async function askAssistant(
  messages: ChatMessage[],
): Promise<ChatResponse> {
  const client = new OpenAI({ timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });

  const result = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    store: false,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    instructions: INSTRUCTIONS,
    input: messages.map(({ role, content }) => ({ role, content })),
    text: { format: zodTextFormat(firstPassSchema, "first_pass") },
  });

  const answer = result.output_parsed;
  if (!answer) {
    throw new Error("AI 답변 형식 오류");
  }

  if (answer.status === "clarify" && answer.question) {
    return { kind: "clarify", question: answer.question };
  }
  return { kind: "notFound", followUp: false };
}
