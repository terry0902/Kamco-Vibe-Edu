import { describe, expect, it, vi } from "vitest";
import { loadManuals, parseManual, toManualSource } from "./manuals";

vi.mock("server-only", () => ({}));

describe("parseManual", () => {
  it("문서명, 날짜, 본문을 읽는다", () => {
    expect(
      parseManual("---\nname: 문서\ndate: 2026-01-02\n---\n본문\n"),
    ).toEqual({ name: "문서", date: "2026-01-02", body: "본문" });
  });

  it("Windows 줄바꿈과 주소가 든 source를 처리한다", () => {
    expect(
      parseManual(
        "---\r\nname: 문서\r\ndate: 2026-01-02\r\nsource: https://example.com/a\r\n---\r\n본문\r\n",
      ),
    ).toEqual({ name: "문서", date: "2026-01-02", body: "본문" });
  });

  it.each(["머리말 없음", "---\nname: 문서\n---\n본문", "---\nname: 문서\ndate: 어제\n---\n본문"])(
    "형식이 틀린 문서는 거절한다: %s",
    (text) => {
      expect(() => parseManual(text)).toThrow();
    },
  );
});

describe("loadManuals", () => {
  it("샘플 매뉴얼 10개를 모두 읽는다", () => {
    const manuals = loadManuals();
    expect(manuals).toHaveLength(10);
    expect(new Set(manuals.map((manual) => manual.name)).size).toBe(10);
    expect(manuals.every((manual) => manual.body.length > 0)).toBe(true);
  });
});

describe("toManualSource", () => {
  const now = new Date("2026-11-02T00:00:00Z");
  const source = (date: string) =>
    toManualSource({ name: "문서", date, body: "본문" }, now);

  it("1년이 지나면 오래된 문서로 표시한다", () => {
    expect(source("2025-11-01").outdated).toBe(true);
  });

  it("정확히 1년까지는 오래된 문서가 아니다", () => {
    expect(source("2025-11-02").outdated).toBe(false);
  });
});
