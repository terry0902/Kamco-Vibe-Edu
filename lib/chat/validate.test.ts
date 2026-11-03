import { describe, expect, it, vi } from "vitest";
import { checkFirstPass, type FirstPass } from "./validate";

vi.mock("server-only", () => ({}));

const now = new Date("2026-11-02T00:00:00Z");
const manuals = ["가", "나", "다", "라"].map((name) => ({
  name,
  date: "2026-09-14",
  body: "본문",
}));
manuals.push({ name: "옛 문서", date: "2025-02-18", body: "본문" });

const step = { text: "확인한다", caution: false };
const base: FirstPass = {
  status: "answer",
  question: null,
  steps: [step],
  sources: ["가"],
  isFollowUp: false,
  standaloneQuestion: null,
  versions: [],
};
const check = (answer: Partial<FirstPass>) =>
  checkFirstPass({ ...base, ...answer }, manuals, now);

describe("checkFirstPass", () => {
  it("규칙에 맞는 매뉴얼 답변에 문서 날짜를 붙인다", () => {
    expect(check({})).toEqual({
      ok: true,
      response: {
        kind: "manual",
        steps: [step],
        sources: [{ name: "가", date: "2026-09-14", outdated: false }],
        followUp: false,
      },
    });
  });

  it("5단계와 근거 3개까지 허용한다", () => {
    expect(
      check({ steps: Array(5).fill(step), sources: ["가", "나", "다"] }).ok,
    ).toBe(true);
  });

  it("오래된 문서를 표시하고 같은 문서명은 합친다", () => {
    expect(check({ sources: ["옛 문서", "옛 문서"] })).toMatchObject({
      ok: true,
      response: {
        sources: [{ name: "옛 문서", date: "2025-02-18", outdated: true }],
      },
    });
  });

  it.each([
    ["6단계", { steps: Array(6).fill(step) }],
    ["0단계", { steps: [] }],
    ["빈 단계", { steps: [{ text: "", caution: false }] }],
    ["근거 0개", { sources: [] }],
    ["근거 4개", { sources: ["가", "나", "다", "라"] }],
    ["질문 없는 되묻기", { status: "clarify" as const }],
    ["빈 되묻기", { status: "clarify" as const, question: "" }],
  ])("%s 는 다시 요청한다", (_name, answer) => {
    expect(check(answer).ok).toBe(false);
  });

  it("매뉴얼에 없는 문서명은 이유와 함께 다시 요청한다", () => {
    expect(check({ sources: ["가", "지어낸 문서"] })).toMatchObject({
      ok: false,
      reason: expect.stringContaining("지어낸 문서"),
    });
  });

  it("문서 충돌에 날짜를 붙이고 빠진 주의 표시를 채운다", () => {
    const versions = [
      { name: "가", steps: [{ text: "서버를 종료한다", caution: false }] },
      { name: "옛 문서", steps: [step] },
    ];
    expect(check({ status: "conflict", versions })).toEqual({
      ok: true,
      response: {
        kind: "conflict",
        versions: [
          {
            name: "가",
            date: "2026-09-14",
            outdated: false,
            steps: [{ text: "서버를 종료한다", caution: true }],
          },
          { name: "옛 문서", date: "2025-02-18", outdated: true, steps: [step] },
        ],
      },
    });
  });

  it.each([
    ["문서 1개", [{ name: "가", steps: [step] }]],
    [
      "같은 문서 2개",
      [
        { name: "가", steps: [step] },
        { name: "가", steps: [step] },
      ],
    ],
    [
      "6단계",
      [
        { name: "가", steps: Array(6).fill(step) },
        { name: "나", steps: [step] },
      ],
    ],
    [
      "없는 문서명",
      [
        { name: "가", steps: [step] },
        { name: "지어낸 문서", steps: [step] },
      ],
    ],
  ])("문서 충돌의 %s 는 다시 요청한다", (_name, versions) => {
    expect(check({ status: "conflict", versions }).ok).toBe(false);
  });

  it("안내한 답변이 있을 때만 재입력으로 표시한다", () => {
    const answer = { ...base, isFollowUp: true };
    expect(checkFirstPass(answer, manuals, now, false, true)).toMatchObject({
      response: { kind: "manual", followUp: true },
    });
    expect(checkFirstPass(answer, manuals, now, false, false)).toMatchObject({
      response: { kind: "manual", followUp: false },
    });
    expect(
      checkFirstPass({ ...answer, status: "notInManual" }, manuals, now, false, true),
    ).toEqual({ ok: true, response: { kind: "notFound", followUp: true } });
  });

  it("되묻기 횟수 규칙을 적용한다", () => {
    const clarify = { ...base, status: "clarify" as const, question: "질문" };
    expect(checkFirstPass(clarify, manuals, now, true)).toEqual({
      ok: true,
      response: { kind: "escalate" },
    });
    expect(
      checkFirstPass({ ...base, status: "escalate" }, manuals, now, true),
    ).toEqual({ ok: true, response: { kind: "escalate" } });
    expect(checkFirstPass({ ...base, status: "escalate" }, manuals, now).ok).toBe(
      false,
    );
  });

  it("되묻기와 매뉴얼에 없음을 변환한다", () => {
    expect(check({ status: "clarify", question: "어느 장비인가요?" })).toEqual({
      ok: true,
      response: { kind: "clarify", question: "어느 장비인가요?" },
    });
    expect(check({ status: "notInManual" })).toEqual({
      ok: true,
      response: { kind: "notFound", followUp: false },
    });
  });
});
