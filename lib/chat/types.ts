// Design Ref: §2 주고받는 데이터 — 화면과 서버가 같은 형식을 쓰도록 검사 규칙과 타입을 한곳에 둔다.
import { z } from "zod";

const MAX_STEPS = 5;
const MAX_SOURCES = 3;

// 화면과 서버 API가 같은 기준으로 검사하도록 여기에 둔다.
export const MAX_INPUT_LENGTH = 2000;

// 사용자가 설정에 넣은 OpenAI 키를 서버로 보낼 때 쓰는 헤더다.
export const API_KEY_HEADER = "x-openai-api-key";
const API_KEY_FORMAT = /^[\x21-\x7e]{20,300}$/;

export function isApiKeyFormatValid(apiKey: string): boolean {
  return API_KEY_FORMAT.test(apiKey);
}

export function isInputTooLong(input: string): boolean {
  return input.length > MAX_INPUT_LENGTH;
}

const MAX_MESSAGES = 20;
const MAX_CONVERSATION_LENGTH = 20000;

export function isConversationTooLong(messages: ChatMessage[]): boolean {
  const totalLength = messages.reduce(
    (total, message) => total + message.content.length,
    0,
  );
  return messages.length > MAX_MESSAGES || totalLength > MAX_CONVERSATION_LENGTH;
}

export const answerKindSchema = z.enum([
  "manual",
  "conflict",
  "clarify",
  "escalate",
  "web",
  "notFound",
]);

const stepSchema = z.object({
  text: z.string().min(1),
  caution: z.boolean(),
});

const stepsSchema = z.array(stepSchema).min(1).max(MAX_STEPS);

const manualSourceSchema = z.object({
  name: z.string().min(1),
  date: z.iso.date(),
  outdated: z.boolean(),
});

// Design Ref: §5 보안 — 출처 링크는 http, https만 허용한다.
const webLinkSchema = z.object({
  title: z.string().min(1),
  url: z.url({ protocol: /^https?$/ }),
});

export const chatResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("manual"),
    steps: stepsSchema,
    sources: z.array(manualSourceSchema).min(1).max(MAX_SOURCES),
    followUp: z.boolean(),
  }),
  z.object({
    kind: z.literal("conflict"),
    versions: z.array(manualSourceSchema.extend({ steps: stepsSchema })).min(2),
  }),
  z.object({
    kind: z.literal("clarify"),
    question: z.string().min(1),
  }),
  z.object({
    kind: z.literal("escalate"),
  }),
  z.object({
    kind: z.literal("web"),
    steps: stepsSchema,
    links: z.array(webLinkSchema).min(1).max(MAX_SOURCES),
    followUp: z.boolean(),
  }),
  z.object({
    kind: z.literal("notFound"),
    followUp: z.boolean(),
  }),
]);

// 서버가 되묻기 횟수를 판단할 수 있도록 이전 답변에는 종류를 반드시 함께 보낸다.
const chatMessageSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("user"),
    content: z.string().min(1),
  }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().min(1),
    kind: answerKindSchema,
  }),
]);

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
});

export const errorCodeSchema = z.enum([
  "INPUT_TOO_LONG",
  "CONVERSATION_TOO_LONG",
  "INVALID_REQUEST",
  "QUOTA_EXCEEDED",
  "AI_ERROR",
  "API_KEY_REQUIRED",
  "API_KEY_INVALID",
]);

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string().min(1),
  }),
});

export type AnswerKind = z.infer<typeof answerKindSchema>;
export type Step = z.infer<typeof stepSchema>;
export type ManualSource = z.infer<typeof manualSourceSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

function formatSteps(steps: Step[]): string {
  return steps.map((step, index) => `${index + 1}. ${step.text}`).join("\n");
}

function toHistoryText(response: ChatResponse): string {
  switch (response.kind) {
    case "manual":
      return `${formatSteps(response.steps)}\n근거: ${response.sources
        .map((source) => source.name)
        .join(", ")}`;
    case "conflict":
      return response.versions
        .map(
          (version) =>
            `${version.name} (${version.date})\n${formatSteps(version.steps)}`,
        )
        .join("\n\n");
    case "clarify":
      return response.question;
    case "escalate":
      return "증상을 특정하지 못해 선임 문의를 권했다";
    case "web":
      return `${formatSteps(response.steps)}\n출처: ${response.links
        .map((link) => link.url)
        .join(", ")}`;
    case "notFound":
      return "찾지 못해 선임 문의를 권했다";
  }
}

// Design Ref: §2 이전 답변을 다시 보내는 규칙 — 오류는 대화 기록에 넣지 않으므로 정상 답변만 받는다.
export function toHistoryMessage(response: ChatResponse): ChatMessage {
  return {
    role: "assistant",
    content: toHistoryText(response),
    kind: response.kind,
  };
}
