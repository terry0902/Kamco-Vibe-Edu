// Design Ref: §2 답변 검사 — AI 판단을 답변 형식으로 바꾸고, 어기면 다시 요청할 이유를 돌려준다.
import "server-only";
import { z } from "zod";
import { toManualSource, type Manual } from "./manuals";
import { chatResponseSchema, type ChatResponse } from "./types";

// OpenAI의 형식 지정은 모든 항목을 필수로 요구하므로, 쓰지 않는 값은 null이나 빈 배열로 받는다.
export const firstPassSchema = z.object({
  status: z.enum(["answer", "clarify", "notInManual"]),
  question: z.string().nullable(),
  steps: z.array(z.object({ text: z.string(), caution: z.boolean() })),
  sources: z.array(z.string()),
});

export type FirstPass = z.infer<typeof firstPassSchema>;

export type AnswerCheck =
  | { ok: true; response: ChatResponse }
  | { ok: false; reason: string };

// Design Ref: §2 "주의" 판단 낱말 — AI가 빠뜨린 표시를 채운다. 과하게 붙는 쪽은 허용한다.
const CAUTION_PATTERN =
  /재부팅|재기동|리부트|중지|정지|종료|재시작|삭제|지[우운워]|제거|포맷|초기화|설정\s*파일|설정\S*\s*(?:변경|수정|바꾸|바꾼|바꿔)|\b(?:reboot|shutdown|stop|restart|kill|delete|drop|truncate|format|mkfs|wipe|sysctl|chmod|chown|config)|(?:^|[\s`])rm\s/i;

export function applyCaution(steps: FirstPass["steps"]): FirstPass["steps"] {
  return steps.map((step) => ({
    ...step,
    caution: step.caution || CAUTION_PATTERN.test(step.text),
  }));
}

function buildResponse(
  answer: FirstPass,
  manuals: Manual[],
  now: Date,
): ChatResponse | { unknownSources: string[] } {
  switch (answer.status) {
    case "answer": {
      const names = [...new Set(answer.sources)];
      const known = names.flatMap((name) =>
        manuals.filter((manual) => manual.name === name),
      );
      if (known.length !== names.length) {
        return {
          unknownSources: names.filter((name) =>
            manuals.every((manual) => manual.name !== name),
          ),
        };
      }
      return {
        kind: "manual",
        steps: applyCaution(answer.steps),
        sources: known.map((manual) => toManualSource(manual, now)),
        followUp: false,
      };
    }
    case "clarify":
      return { kind: "clarify", question: answer.question ?? "" };
    case "notInManual":
      return { kind: "notFound", followUp: false };
  }
}

export function checkFirstPass(
  answer: FirstPass,
  manuals: Manual[],
  now: Date,
): AnswerCheck {
  const response = buildResponse(answer, manuals, now);
  if ("unknownSources" in response) {
    return {
      ok: false,
      reason: `sources에 매뉴얼에 없는 문서명을 썼다: ${response.unknownSources.join(", ")}. manual의 name을 그대로 쓴다.`,
    };
  }

  const parsed = chatResponseSchema.safeParse(response);
  if (!parsed.success) {
    return {
      ok: false,
      reason:
        'status가 "answer"이면 steps는 1~5단계, sources는 1~3개로 쓰고, "clarify"이면 question을 비우지 않는다.',
    };
  }
  return { ok: true, response: parsed.data };
}
