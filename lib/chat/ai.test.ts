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
