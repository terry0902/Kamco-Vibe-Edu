import { describe, expect, it, vi } from "vitest";
import { toChatResponse, type FirstPass } from "./validate";

vi.mock("server-only", () => ({}));

const now = new Date("2026-11-02T00:00:00Z");
const manuals = [
  { name: "새 문서", date: "2026-09-14", body: "본문" },
  { name: "옛 문서", date: "2025-02-18", body: "본문" },
];
const steps = [{ text: "확인한다", caution: false }];
const base: FirstPass = {
  status: "answer",
  question: null,
  steps,
  sources: ["새 문서"],
};

describe("toChatResponse", () => {
  it("매뉴얼 답변에 문서 날짜를 붙인다", () => {
    expect(toChatResponse(base, manuals, now)).toEqual({
      kind: "manual",
      steps,
      sources: [{ name: "새 문서", date: "2026-09-14", outdated: false }],
      followUp: false,
    });
  });

  it("오래된 문서를 표시하고 같은 문서명은 합친다", () => {
    const response = toChatResponse(
      { ...base, sources: ["옛 문서", "옛 문서"] },
      manuals,
      now,
    );
    expect(response).toMatchObject({
      sources: [{ name: "옛 문서", date: "2025-02-18", outdated: true }],
    });
  });

  it("매뉴얼에 없는 문서명은 오류로 처리한다", () => {
    expect(() =>
      toChatResponse({ ...base, sources: ["지어낸 문서"] }, manuals, now),
    ).toThrow();
  });

  it("되묻기를 변환한다", () => {
    expect(
      toChatResponse(
        { ...base, status: "clarify", question: "어느 장비인가요?" },
        manuals,
        now,
      ),
    ).toEqual({ kind: "clarify", question: "어느 장비인가요?" });
  });

  it("질문 없는 되묻기는 오류로 처리한다", () => {
    expect(() =>
      toChatResponse({ ...base, status: "clarify" }, manuals, now),
    ).toThrow();
  });

  it("매뉴얼에 없으면 찾지 못함으로 변환한다", () => {
    expect(
      toChatResponse({ ...base, status: "notInManual" }, manuals, now),
    ).toEqual({ kind: "notFound", followUp: false });
  });
});
