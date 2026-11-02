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
        steps: answer.steps,
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
