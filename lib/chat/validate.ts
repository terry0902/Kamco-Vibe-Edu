// Design Ref: §2 답변 검사 — AI가 돌려준 판단을 화면에 보낼 답변 형식으로 바꾼다.
import "server-only";
import { z } from "zod";
import { toManualSource, type Manual } from "./manuals";
import type { ChatResponse } from "./types";

// OpenAI의 형식 지정은 모든 항목을 필수로 요구하므로, 쓰지 않는 값은 null이나 빈 배열로 받는다.
export const firstPassSchema = z.object({
  status: z.enum(["answer", "clarify", "notInManual"]),
  question: z.string().nullable(),
  steps: z.array(z.object({ text: z.string(), caution: z.boolean() })),
  sources: z.array(z.string()),
});

export type FirstPass = z.infer<typeof firstPassSchema>;

export function toChatResponse(
  answer: FirstPass,
  manuals: Manual[],
  now: Date,
): ChatResponse {
  switch (answer.status) {
    case "answer":
      return {
        kind: "manual",
        steps: answer.steps,
        sources: [...new Set(answer.sources)].map((name) => {
          const manual = manuals.find((candidate) => candidate.name === name);
          if (!manual) {
            throw new Error("매뉴얼에 없는 문서명");
          }
          return toManualSource(manual, now);
        }),
        followUp: false,
      };
    case "clarify":
      if (!answer.question) {
        throw new Error("추가 질문 없음");
      }
      return { kind: "clarify", question: answer.question };
    case "notInManual":
      return { kind: "notFound", followUp: false };
  }
}
