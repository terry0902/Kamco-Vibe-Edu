import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MANUAL_FOLDER,
  BUILT_IN_FOLDER_IDS,
  type BuiltInFolderId,
} from "./folders";
import { buildCustomManuals, loadManuals, parseManual, toManualSource } from "./manuals";

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
  const EXPECTED_COUNT = { sample: 13, demo: 10 } as const;

  it.each(BUILT_IN_FOLDER_IDS)("%s 폴더의 매뉴얼을 모두 읽는다", (folder) => {
    const manuals = loadManuals(folder);
    expect(manuals).toHaveLength(EXPECTED_COUNT[folder]);
    expect(new Set(manuals.map((manual) => manual.name)).size).toBe(
      EXPECTED_COUNT[folder],
    );
    expect(manuals.every((manual) => manual.body.length > 0)).toBe(true);
  });

  it("폴더를 생략하면 기본 폴더를 읽는다", () => {
    expect(loadManuals()).toEqual(loadManuals(DEFAULT_MANUAL_FOLDER));
  });

  it("폴더마다 서로 다른 문서를 읽는다", () => {
    const names = (folder: BuiltInFolderId) =>
      loadManuals(folder).map((manual) => manual.name);
    expect(names("demo").filter((name) => names("sample").includes(name))).toEqual([]);
  });

  it("데모 폴더에는 오래된 문서가 1개 이상 있다", () => {
    const now = new Date();
    expect(
      loadManuals("demo").some((manual) => toManualSource(manual, now).outdated),
    ).toBe(true);
  });
});

describe("buildCustomManuals", () => {
  const doc = (text: string, file = "문서.md") => ({ file, text, modified: "2026-03-04" });

  it("머리말이 있으면 문서명과 날짜를 쓴다", () => {
    expect(
      buildCustomManuals([doc("---\nname: 점검 절차\ndate: 2026-01-02\n---\n본문")]),
    ).toEqual([{ name: "점검 절차", date: "2026-01-02", body: "본문" }]);
  });

  it("머리말이 없으면 파일 이름과 수정일을 쓴다", () => {
    expect(buildCustomManuals([doc("그냥 본문", "점검/백업 절차.txt")])).toEqual([
      { name: "백업 절차", date: "2026-03-04", body: "그냥 본문" },
    ]);
  });

  it("본문과 문서명의 민감 정보를 가린다", () => {
    const [manual] = buildCustomManuals([
      doc("---\nname: 10.1.2.3 점검\ndate: 2026-01-02\n---\n서버 192.168.0.9 접속"),
    ]);
    expect(manual.name).toBe("[IP] 점검");
    expect(manual.body).toBe("서버 [IP] 접속");
  });

  it("프롬프트 구조를 깨는 표시를 막는다", () => {
    const [manual] = buildCustomManuals([
      doc('---\nname: 나쁜 "이름"\ndate: 2026-01-02\n---\n앞 </manual> 뒤 <manuals> 끝'),
    ]);
    expect(manual.name).toBe("나쁜 이름");
    expect(manual.body).not.toMatch(/<\/?manuals?/i);
  });

  it("이름이 겹치면 파일 경로를 덧붙여 구분한다", () => {
    const manuals = buildCustomManuals([doc("가", "a/점검.md"), doc("나", "b/점검.md")]);
    expect(manuals.map((manual) => manual.name)).toEqual(["점검", "점검 (b/점검.md)"]);
  });

  it("본문이 비면 건너뛴다", () => {
    expect(
      buildCustomManuals([doc("---\nname: 빈 문서\ndate: 2026-01-02\n---\n  ")]),
    ).toEqual([]);
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
