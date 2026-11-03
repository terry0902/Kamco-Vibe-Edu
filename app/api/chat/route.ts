// Design Ref: §2 데이터 흐름 — 검사, 가리기, AI 호출 순서로 처리하고 대화를 저장하지 않는다.
import { askAssistant } from "@/lib/chat/ai";
import { buildCustomManuals } from "@/lib/chat/manuals";
import { isRateLimited } from "@/lib/chat/rateLimit";
import { getServerKey, isServerKeyMode } from "@/lib/chat/serverKey";
import { maskSensitive } from "@/lib/chat/mask";
import {
  chatRequestSchema,
  chatResponseSchema,
  API_KEY_HEADER,
  isApiKeyFormatValid,
  isConversationTooLong,
  isInputTooLong,
  type ErrorCode,
  type ErrorResponse,
} from "@/lib/chat/types";

// 매뉴얼 호출과 웹 검색 호출을 각각 1번씩 재요청해도 끝날 수 있는 시간이다.
export const maxDuration = 110;

const ERRORS: Record<ErrorCode, { status: number; message: string }> = {
  INPUT_TOO_LONG: {
    status: 400,
    message: "입력이 너무 깁니다. 에러 부분만 넣어 주세요.",
  },
  CONVERSATION_TOO_LONG: {
    status: 400,
    message:
      '대화가 길어졌습니다. "새 대화"를 눌러 현재 증상을 다시 입력해 주세요.',
  },
  INVALID_REQUEST: {
    status: 400,
    message: "입력 내용을 확인한 뒤 다시 보내 주세요.",
  },
  QUOTA_EXCEEDED: {
    status: 429,
    message: "사용 한도에 도달해 답변할 수 없습니다. 선임에게 문의해 주세요.",
  },
  API_KEY_REQUIRED: {
    status: 401,
    message: "설정에서 OpenAI API 키를 입력해 주세요.",
  },
  API_KEY_INVALID: {
    status: 401,
    message: "API 키가 올바르지 않습니다. 설정에서 키를 확인해 주세요.",
  },
  RATE_LIMITED: {
    status: 429,
    message: "요청이 많아 잠시 후 다시 시도해 주세요.",
  },
  AI_ERROR: {
    status: 502,
    message: "답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  },
};

const QUOTA_ERROR_CODES = new Set([
  "project_spend_limit_exceeded",
  "credit_balance_exhausted",
  "insufficient_quota",
]);

function errorResponse(code: ErrorCode): Response {
  const { status, message } = ERRORS[code];
  const body: ErrorResponse = { error: { code, message } };
  return Response.json(body, { status });
}

function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return typeof error.code === "string" && QUOTA_ERROR_CODES.has(error.code);
}

function isInvalidKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 401
  );
}

function toErrorCode(error: unknown): ErrorCode {
  if (isInvalidKeyError(error)) {
    return "API_KEY_INVALID";
  }
  return isQuotaError(error) ? "QUOTA_EXCEEDED" : "AI_ERROR";
}

export async function POST(request: Request) {
  // 키는 이번 요청의 OpenAI 호출에만 쓰고 저장하거나 로그에 남기지 않는다.
  // 발표용 서버 키 모드에서는 사용자가 보낸 키를 쓰지 않고, 남용을 막으려고 사용 횟수를 제한한다.
  const serverKeyMode = isServerKeyMode();
  if (serverKeyMode) {
    const caller = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (isRateLimited(caller)) {
      return errorResponse("RATE_LIMITED");
    }
  }
  const apiKey = serverKeyMode
    ? getServerKey()
    : (request.headers.get(API_KEY_HEADER)?.trim() ?? "");
  if (!isApiKeyFormatValid(apiKey)) {
    if (serverKeyMode) {
      console.error("chat API 오류: SERVER_KEY_MISSING");
      return errorResponse("AI_ERROR");
    }
    return errorResponse("API_KEY_REQUIRED");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST");
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("INVALID_REQUEST");
  }

  const { messages, folder, customDocs } = parsed.data;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user" || lastMessage.content.trim() === "") {
    return errorResponse("INVALID_REQUEST");
  }
  if (
    messages.some(
      (message) => message.role === "user" && isInputTooLong(message.content),
    )
  ) {
    return errorResponse("INPUT_TOO_LONG");
  }
  if (isConversationTooLong(messages)) {
    return errorResponse("CONVERSATION_TOO_LONG");
  }

  const maskedMessages = messages.map((message) => ({
    ...message,
    content: maskSensitive(message.content),
  }));

  try {
    const answer = chatResponseSchema.safeParse(
      await askAssistant(
        maskedMessages,
        apiKey,
        folder === "custom" ? buildCustomManuals(customDocs ?? []) : folder,
      ),
    );
    if (!answer.success) {
      console.error("chat API 오류: AI_ERROR");
      return errorResponse("AI_ERROR");
    }
    return Response.json(answer.data);
  } catch (error) {
    // 오류 객체에 입력 내용이 들어 있을 수 있으므로 오류 코드만 남긴다.
    const code = toErrorCode(error);
    console.error(`chat API 오류: ${code}`);
    return errorResponse(code);
  }
}
