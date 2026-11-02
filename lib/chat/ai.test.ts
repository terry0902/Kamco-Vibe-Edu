import { beforeEach, describe, expect, it, vi } from "vitest";
import { askAssistant } from "./ai";

const parse = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("openai", () => {
  class APIError extends Error {}
  class OpenAI {
    static APIError = APIError;
    responses = { parse };
  }
  return { default: OpenAI };
});

const messages = [{ role: "user" as const, content: "[IP] 디스크 풀" }];
const name = "디스크 용량 부족 대응 매뉴얼";
const good = {
  status: "answer",
  question: null,
  steps: [{ text: "확인한다", caution: false }],
  sources: [name],
  isFollowUp: false,
  versions: [],
};
const parsed = (output_parsed: unknown) => ({ output_parsed });

describe("askAssistant", () => {
  beforeEach(() => {
    parse.mockReset();
  });

  it("직전이 되묻기면 다시 묻지 말라고 지시하고, 또 되물으면 선임 문의로 바꾼다", async () => {
    parse.mockResolvedValue(
      parsed({ ...good, status: "clarify", question: "또 질문", steps: [], sources: [] }),
    );

    const response = await askAssistant([
      { role: "user", content: "이상해요" },
      { role: "assistant", content: "어느 장비인가요?", kind: "clarify" },
      { role: "user", content: "몰라요" },
    ]);

    expect(response).toEqual({ kind: "escalate" });
    expect(parse.mock.calls[0][0].instructions).toContain("다시 되묻지 않는다");
  });

  it("다른 증상을 새로 물으면 다시 되물을 수 있다", async () => {
    parse.mockResolvedValue(
      parsed({ ...good, status: "clarify", question: "어느 장비인가요?", steps: [], sources: [] }),
    );

    const response = await askAssistant([
      { role: "user", content: "이상해요" },
      { role: "assistant", content: "어느 장비인가요?", kind: "clarify" },
      { role: "user", content: "디스크 풀" },
      { role: "assistant", content: "1. 확인", kind: "manual" },
      { role: "user", content: "또 이상해요" },
    ]);

    expect(response).toEqual({ kind: "clarify", question: "어느 장비인가요?" });
    expect(parse.mock.calls[0][0].instructions).not.toContain("다시 되묻지 않는다");
  });

  it("되묻기 전의 선임 문의 판단은 다시 요청한다", async () => {
    parse
      .mockResolvedValueOnce(parsed({ ...good, status: "escalate", steps: [], sources: [] }))
      .mockResolvedValueOnce(parsed(good));

    await expect(askAssistant(messages)).resolves.toMatchObject({ kind: "manual" });
    expect(parse).toHaveBeenCalledTimes(2);
  });

  describe("조치 결과 재입력", () => {
    const history = [
      { role: "user" as const, content: "nginx 502 에러" },
      {
        role: "assistant" as const,
        content: "1. 상태를 확인한다\n2. 서비스를 재시작한다\n근거: 비공개 문서명",
        kind: "manual" as const,
      },
      { role: "user" as const, content: "해봤는데 안 돼요" },
    ];
    const followUpNotFound = parsed({
      status: "notInManual",
      question: null,
      steps: [],
      sources: [],
      isFollowUp: true,
      versions: [],
    });
    const webAnswer = {
      output_parsed: { found: true, steps: [{ text: "로그를 본다", caution: false }] },
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              annotations: [
                { type: "url_citation", title: "문서", url: "https://example.com/a" },
              ],
            },
          ],
        },
      ],
    };

    it("매뉴얼에 다른 방법이 있으면 재입력 답변으로 표시한다", async () => {
      parse.mockResolvedValue(parsed({ ...good, isFollowUp: true }));

      await expect(askAssistant(history)).resolves.toMatchObject({
        kind: "manual",
        followUp: true,
      });
      expect(parse).toHaveBeenCalledTimes(1);
    });

    it("다른 방법이 없으면 안내한 단계를 빼도록 알려 검색한다", async () => {
      parse.mockResolvedValueOnce(followUpNotFound).mockResolvedValueOnce(webAnswer);

      await expect(askAssistant(history)).resolves.toMatchObject({
        kind: "web",
        followUp: true,
      });
      const request = parse.mock.calls[1][0];
      expect(request.input).toEqual([
        { role: "user", content: "nginx 502 에러" },
        { role: "user", content: "해봤는데 안 돼요" },
      ]);
      expect(request.instructions).toContain("1. 상태를 확인한다");
      expect(request.instructions).toContain("2. 서비스를 재시작한다");
      expect(request.instructions).not.toContain("비공개 문서명");
    });

    it("인터넷에도 없으면 재입력 찾지 못함으로 답한다", async () => {
      parse
        .mockResolvedValueOnce(followUpNotFound)
        .mockResolvedValueOnce({ ...webAnswer, output: [] });

      await expect(askAssistant(history)).resolves.toEqual({
        kind: "notFound",
        followUp: true,
      });
    });

    it("안내한 답변이 없으면 재입력으로 보지 않는다", async () => {
      parse.mockResolvedValueOnce(followUpNotFound).mockResolvedValueOnce(webAnswer);

      await expect(askAssistant(messages)).resolves.toMatchObject({
        kind: "web",
        followUp: false,
      });
      expect(parse.mock.calls[1][0].instructions).not.toContain("<excluded>");
    });
  });

  describe("인터넷 검색", () => {
    const notInManual = parsed({
      status: "notInManual",
      question: null,
      steps: [],
      sources: [],
      isFollowUp: false,
      versions: [],
    });
    const webAnswer = {
      output_parsed: { found: true, steps: [{ text: "확인한다", caution: false }] },
      output: [
        { type: "web_search_call" },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              annotations: [
                { type: "url_citation", title: "문서", url: "https://example.com/a" },
              ],
            },
          ],
        },
      ],
    };

    it("매뉴얼에 없을 때만 웹 검색 도구를 주어 호출한다", async () => {
      parse.mockResolvedValueOnce(notInManual).mockResolvedValueOnce(webAnswer);

      const response = await askAssistant(messages);

      expect(response).toEqual({
        kind: "web",
        steps: [{ text: "확인한다", caution: false }],
        links: [{ title: "문서", url: "https://example.com/a" }],
        followUp: false,
      });
      expect(parse).toHaveBeenCalledTimes(2);
      expect(parse.mock.calls[0][0].tools).toBeUndefined();
      const request = parse.mock.calls[1][0];
      expect(request.tools).toEqual([
        { type: "web_search", search_context_size: "low" },
      ]);
      expect(request.tool_choice).toBe("required");
      expect(request.max_tool_calls).toBe(2);
      expect(request.reasoning).toEqual({ effort: "low" });
      expect(request.store).toBe(false);
    });

    it.each([
      ["매뉴얼 답변", parsed(good)],
      [
        "되묻기",
        parsed({ ...good, status: "clarify", question: "질문", steps: [], sources: [] }),
      ],
    ])("%s 이면 검색하지 않는다", async (_name, answer) => {
      parse.mockResolvedValue(answer);

      await askAssistant(messages);

      expect(parse).toHaveBeenCalledTimes(1);
    });

    it("이전 답변과 지난 증상을 빼고 현재 증상의 사용자 메시지만 보낸다", async () => {
      parse.mockResolvedValueOnce(notInManual).mockResolvedValueOnce(webAnswer);

      await askAssistant([
        { role: "user", content: "지난 증상" },
        { role: "assistant", content: "1. 매뉴얼 조치", kind: "manual" },
        { role: "user", content: "이상해요" },
        { role: "assistant", content: "어느 장비인가요?", kind: "clarify" },
        { role: "user", content: "[호스트명]에서 Redis 오류" },
      ]);

      const request = parse.mock.calls[1][0];
      expect(request.input).toEqual([
        { role: "user", content: "이상해요" },
        { role: "user", content: "[호스트명]에서 Redis 오류" },
      ]);
      expect(request.instructions).not.toContain("<manuals>");
    });

    it("출처가 없으면 다시 요청하지 않고 찾지 못함으로 답한다", async () => {
      parse
        .mockResolvedValueOnce(notInManual)
        .mockResolvedValueOnce({ ...webAnswer, output: [] });

      await expect(askAssistant(messages)).resolves.toEqual({
        kind: "notFound",
        followUp: false,
      });
      expect(parse).toHaveBeenCalledTimes(2);
    });

    it("규칙을 어기면 1번 다시 요청한다", async () => {
      parse
        .mockResolvedValueOnce(notInManual)
        .mockResolvedValueOnce({
          ...webAnswer,
          output_parsed: { found: true, steps: [] },
        })
        .mockResolvedValueOnce(webAnswer);

      await expect(askAssistant(messages)).resolves.toMatchObject({ kind: "web" });
      expect(parse).toHaveBeenCalledTimes(3);
      expect(parse.mock.calls[2][0].instructions).toContain("직전 답변이 규칙을 어겼다");
    });
  });

  it("보관을 끄고 가린 대화와 매뉴얼을 보낸다", async () => {
    parse.mockResolvedValue(parsed(good));

    const response = await askAssistant(messages);

    expect(response).toMatchObject({ kind: "manual" });
    expect(parse).toHaveBeenCalledTimes(1);
    const request = parse.mock.calls[0][0];
    expect(request.store).toBe(false);
    expect(request.tools).toBeUndefined();
    expect(request.input).toEqual(messages);
    expect(request.instructions).toContain(name);
  });

  it("규칙을 어기면 이유를 알려 1번 다시 요청한다", async () => {
    parse
      .mockResolvedValueOnce(parsed({ ...good, sources: ["지어낸 문서"] }))
      .mockResolvedValueOnce(parsed(good));

    const response = await askAssistant(messages);

    expect(response).toMatchObject({ kind: "manual" });
    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse.mock.calls[1][0].instructions).toContain("지어낸 문서");
  });

  it("다시 요청해도 어기면 오류로 끝내고 내용을 잘라 내지 않는다", async () => {
    parse.mockResolvedValue(
      parsed({ ...good, steps: Array(6).fill(good.steps[0]) }),
    );

    await expect(askAssistant(messages)).rejects.toThrow();
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("형식이 틀린 답변도 1번 다시 요청한다", async () => {
    parse
      .mockResolvedValueOnce(parsed(null))
      .mockRejectedValueOnce(new SyntaxError("JSON 오류"))
      .mockResolvedValueOnce(parsed(good));

    await expect(askAssistant(messages)).rejects.toThrow();
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("서비스 오류는 다시 요청하지 않고 그대로 올린다", async () => {
    const { default: OpenAI } = await import("openai");
    const error = Object.assign(new OpenAI.APIError(429, undefined, "한도", undefined), {
      code: "project_spend_limit_exceeded",
    });
    parse.mockRejectedValue(error);

    await expect(askAssistant(messages)).rejects.toBe(error);
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
