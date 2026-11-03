import { describe, expect, it } from "vitest";
import { readFolder, type EntryLike, type FileLike } from "./localFolder";

function file(name: string, text: string, size = text.length): EntryLike {
  const data: FileLike = {
    name,
    size,
    lastModified: Date.UTC(2026, 4, 6),
    text: async () => text,
  };
  return { kind: "file", name, getFile: async () => data };
}

function dir(name: string, children: EntryLike[]): EntryLike & { kind: "directory" } {
  return {
    kind: "directory",
    name,
    values: async function* () {
      for (const child of children) yield child;
    },
  };
}

describe("readFolder", () => {
  it(".md와 .txt만 읽고 수정일을 날짜로 바꾼다", async () => {
    const result = await readFolder(
      dir("NAS", [file("a.md", "가"), file("b.txt", "나"), file("c.pdf", "다"), file("d.docx", "라")]),
    );
    expect(result.label).toBe("NAS");
    expect(result.docs).toEqual([
      { file: "a.md", text: "가", modified: "2026-05-06" },
      { file: "b.txt", text: "나", modified: "2026-05-06" },
    ]);
  });

  it("하위 폴더는 한 단계까지만 읽는다", async () => {
    const result = await readFolder(
      dir("루트", [
        file("루트.md", "1"),
        dir("하위", [file("하위.md", "2"), dir("더하위", [file("깊음.md", "3")])]),
      ]),
    );
    expect(result.docs.map((doc) => doc.file)).toEqual(["루트.md", "하위/하위.md"]);
  });

  it("숨김 폴더와 NAS 관리용 폴더는 건너뛴다", async () => {
    const result = await readFolder(
      dir("NAS", [
        dir("@eaDir", [file("썸네일.md", "x")]),
        dir(".git", [file("메모.md", "x")]),
        dir("#recycle", [file("지운것.md", "x")]),
        file(".숨김.md", "x"),
        file("정상.md", "내용"),
      ]),
    );
    expect(result.docs.map((doc) => doc.file)).toEqual(["정상.md"]);
  });

  it("빈 문서는 건너뛰고, 너무 긴 문서는 제외하고 개수를 센다", async () => {
    const result = await readFolder(
      dir("NAS", [
        file("빈.md", "  \n"),
        file("긴.md", "가".repeat(5001)),
        file("거대.md", "가", 1_000_000),
        file("정상.md", "내용"),
      ]),
    );
    expect(result.docs.map((doc) => doc.file)).toEqual(["정상.md"]);
    expect(result.skipped).toEqual({ tooLong: 2, overLimit: 0 });
  });

  it("문서 30개와 전체 30,000자를 넘으면 나머지는 제외한다", async () => {
    const many = Array.from({ length: 32 }, (_, i) =>
      file(`${String(i).padStart(2, "0")}.md`, "가"),
    );
    const byCount = await readFolder(dir("NAS", many));
    expect(byCount.docs).toHaveLength(30);
    expect(byCount.skipped.overLimit).toBe(2);

    const big = Array.from({ length: 8 }, (_, i) => file(`${i}.md`, "가".repeat(4000)));
    const byChars = await readFolder(dir("NAS", big));
    expect(byChars.docs).toHaveLength(7);
    expect(byChars.skipped.overLimit).toBe(1);
  });
});
