// Design Ref: §2 답변 검사 — AI 판단을 답변 형식으로 바꾸고, 어기면 다시 요청할 이유를 돌려준다.
import "server-only";
import { z } from "zod";
import { toManualSource, type Manual } from "./manuals";
import { chatResponseSchema, type ChatResponse } from "./types";

// OpenAI의 형식 지정은 모든 항목을 필수로 요구하므로, 쓰지 않는 값은 null이나 빈 배열로 받는다.
export const firstPassSchema = z.object({
  status: z.enum(["answer", "conflict", "clarify", "escalate", "notInManual"]),
  question: z.string().nullable(),
  steps: z.array(z.object({ text: z.string(), caution: z.boolean() })),
  sources: z.array(z.string()),
  isFollowUp: z.boolean(),
  standaloneQuestion: z.string().nullable(),
  versions: z.array(
    z.object({
      name: z.string(),
      steps: z.array(z.object({ text: z.string(), caution: z.boolean() })),
    }),
  ),
});

export type FirstPass = z.infer<typeof firstPassSchema>;

export type AnswerCheck =
  | { ok: true; response: ChatResponse }
  | { ok: false; reason: string };

// Design Ref: §2 "주의" 판단 낱말 — AI가 빠뜨린 표시를 채운다. 과하게 붙는 쪽은 허용한다.
const CAUTION_PATTERN =
  /재부팅|재기동|리부트|재적재|중지|정지|종료|재시작|삭제|지[우운워]|제거|포맷|초기화|설정\s*파일|설정\S*\s*(?:변경|수정|바꾸|바꾼|바꿔)|\b(?:reboot|shutdown|stop|restart|reload|kill|delete|drop|truncate|format|mkfs|wipe|sysctl|chmod|chown|config)|(?:^|[\s`])rm\s/i;

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
  followUp: boolean,
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
        followUp,
      };
    }
    // Design Ref: §1 답변 카드 종류 — 문서 충돌에도 단계 수 제한과 "주의" 표시를 적용한다.
    case "conflict": {
      const versions = answer.versions.filter(
        (version, index, all) =>
          all.findIndex((other) => other.name === version.name) === index,
      );
      const unknownSources = versions
        .map((version) => version.name)
        .filter((name) => manuals.every((manual) => manual.name !== name));
      if (unknownSources.length > 0) {
        return { unknownSources };
      }
      return {
        kind: "conflict",
        versions: versions.flatMap((version) =>
          manuals
            .filter((manual) => manual.name === version.name)
            .map((manual) => ({
              ...toManualSource(manual, now),
              steps: applyCaution(version.steps),
            })),
        ),
      };
    }
    case "clarify":
      return { kind: "clarify", question: answer.question ?? "" };
    case "escalate":
      return { kind: "escalate" };
    case "notInManual":
      return { kind: "notFound", followUp };
  }
}

export const secondPassSchema = z.object({
  found: z.boolean(),
  steps: z.array(z.object({ text: z.string(), caution: z.boolean() })),
});

export type SecondPass = z.infer<typeof secondPassSchema>;
export type Citation = { title: string; url: string };

const INLINE_CITATION = /\s*\(?\[[^\]]*\]\([^)\s]*\)\)?/g;

function toLinks(citations: Citation[]): Citation[] {
  const links = new Map<string, Citation>();
  for (const citation of citations) {
    try {
      const url = new URL(citation.url);
      url.searchParams.delete("utm_source");
      links.set(url.href, {
        title: citation.title || url.hostname,
        url: url.href,
      });
    } catch {
      // 주소로 해석되지 않는 인용은 출처로 인정하지 않는다.
    }
  }
  return [...links.values()];
}

// Design Ref: §2 답변 검사 — 출처는 응답의 url_citation만 인정하고, 없으면 찾지 못함으로 처리한다.
export function checkSecondPass(
  answer: SecondPass,
  citations: Citation[],
  followUp = false,
): AnswerCheck {
  const links = toLinks(citations);
  if (!answer.found || links.length === 0) {
    return { ok: true, response: { kind: "notFound", followUp } };
  }

  const parsed = chatResponseSchema.safeParse({
    kind: "web",
    steps: applyCaution(
      answer.steps.map((step) => ({
        ...step,
        text: step.text.replace(INLINE_CITATION, "").trim(),
      })),
    ),
    links,
    followUp,
  });
  if (!parsed.success) {
    return {
      ok: false,
      reason:
        "steps는 비어 있지 않은 1~5단계로 쓰고, 서로 다른 http 또는 https 페이지를 1~3개만 인용한다.",
    };
  }
  return { ok: true, response: parsed.data };
}

export function checkFirstPass(
  answer: FirstPass,
  manuals: Manual[],
  now: Date,
  alreadyClarified = false,
  canFollowUp = false,
): AnswerCheck {
  // Design Ref: §2 상황별 판단 규칙 — 증상 1건당 1번만 되묻고, 그래도 모호하면 검색 없이 선임 문의를 권한다.
  if (answer.status === "clarify" && alreadyClarified) {
    return { ok: true, response: { kind: "escalate" } };
  }
  if (answer.status === "escalate" && !alreadyClarified) {
    return {
      ok: false,
      reason: '아직 되묻지 않았으므로 status에 "escalate"를 쓰지 않는다.',
    };
  }

  const response = buildResponse(
    answer,
    manuals,
    now,
    answer.isFollowUp && canFollowUp,
  );
  if ("unknownSources" in response) {
    return {
      ok: false,
      reason: `매뉴얼에 없는 문서명을 썼다: ${response.unknownSources.join(", ")}. manual의 name을 그대로 쓴다.`,
    };
  }

  const parsed = chatResponseSchema.safeParse(response);
  if (!parsed.success) {
    return {
      ok: false,
      reason:
        'status가 "answer"이면 steps는 1~5단계, sources는 1~3개로 쓰고, "conflict"이면 versions에 서로 다른 문서 2개 이상을 각각 1~5단계로 쓰고, "clarify"이면 question을 비우지 않는다.',
    };
  }
  return { ok: true, response: parsed.data };
}
