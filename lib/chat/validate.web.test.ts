import { describe, expect, it, vi } from "vitest";
import { checkSecondPass } from "./validate";

vi.mock("server-only", () => ({}));

const step = { text: "상태를 확인한다", caution: false };
const link = { title: "문서", url: "https://example.com/a" };

describe("checkSecondPass", () => {
  it("단계와 출처를 인터넷 답변으로 만든다", () => {
    expect(checkSecondPass({ found: true, steps: [step] }, [link])).toEqual({
      ok: true,
      response: { kind: "web", steps: [step], links: [link], followUp: false },
    });
  });

  it("찾지 못했다고 판단하면 찾지 못함으로 처리한다", () => {
    expect(checkSecondPass({ found: false, steps: [] }, [link])).toEqual({
      ok: true,
      response: { kind: "notFound", followUp: false },
    });
  });

  it("출처가 없으면 내용이 있어도 찾지 못함으로 처리한다", () => {
    expect(checkSecondPass({ found: true, steps: [step] }, [])).toEqual({
      ok: true,
      response: { kind: "notFound", followUp: false },
    });
  });

  it("빠진 주의 표시를 채운다", () => {
    expect(
      checkSecondPass(
        { found: true, steps: [{ text: "`systemctl restart nginx`", caution: false }] },
        [link],
      ),
    ).toMatchObject({
      response: { steps: [{ caution: true }] },
    });
  });

  it("단계 글에 섞인 인용 링크를 뺀다", () => {
    expect(
      checkSecondPass(
        {
          found: true,
          steps: [
            {
              text: "크기 제한을 확인합니다. ([nginx.org](https://nginx.org/a?utm_source=openai))",
              caution: false,
            },
          ],
        },
        [link],
      ),
    ).toMatchObject({
      response: { steps: [{ text: "크기 제한을 확인합니다." }] },
    });
  });

  it("추적 값을 빼고 같은 주소를 합친다", () => {
    expect(
      checkSecondPass({ found: true, steps: [step] }, [
        { title: "문서", url: "https://example.com/a?utm_source=openai" },
        { title: "문서", url: "https://example.com/a" },
      ]),
    ).toMatchObject({
      response: { links: [{ url: "https://example.com/a" }] },
    });
  });

  it("제목이 없으면 도메인을 쓴다", () => {
    expect(
      checkSecondPass({ found: true, steps: [step] }, [
        { title: "", url: "https://example.com/a" },
      ]),
    ).toMatchObject({
      response: { links: [{ title: "example.com" }] },
    });
  });

  it("주소로 해석되지 않는 인용은 인정하지 않는다", () => {
    expect(
      checkSecondPass({ found: true, steps: [step] }, [
        { title: "문서", url: "주소 아님" },
      ]),
    ).toMatchObject({ response: { kind: "notFound" } });
  });

  it.each([
    ["6단계", { found: true, steps: Array(6).fill(step) }, [link]],
    ["0단계", { found: true, steps: [] }, [link]],
    [
      "출처 4개",
      { found: true, steps: [step] },
      ["a", "b", "c", "d"].map((path) => ({
        title: "문서",
        url: `https://example.com/${path}`,
      })),
    ],
    [
      "http가 아닌 출처",
      { found: true, steps: [step] },
      [{ title: "문서", url: "javascript:alert(1)" }],
    ],
  ])("%s 는 다시 요청한다", (_name, answer, citations) => {
    expect(checkSecondPass(answer, citations).ok).toBe(false);
  });
});
