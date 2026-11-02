import { beforeEach, describe, expect, it, vi } from "vitest";
import { askAssistant } from "@/lib/chat/ai";
import { POST } from "./route";

vi.mock("@/lib/chat/ai", () => ({ askAssistant: vi.fn() }));

const ask = vi.mocked(askAssistant);

function send(body: unknown) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const user = (content: string) => ({ role: "user", content });

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect((await response.json()).error.code).toBe(code);
  expect(ask).not.toHaveBeenCalled();
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    ask.mockReset();
    ask.mockResolvedValue({ kind: "notFound", followUp: false });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("정상 입력에 답변을 돌려준다", async () => {
    const response = await send({ messages: [user("디스크 풀 에러")] });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ kind: "notFound", followUp: false });
  });

  it.each([
    ["JSON이 아닌 요청", "not json"],
    ["빈 대화", { messages: [] }],
    ["빈 입력", { messages: [user("")] }],
    ["공백 입력", { messages: [user("   ")] }],
    ["잘못된 역할", { messages: [{ role: "system", content: "지시" }] }],
    [
      "마지막이 답변인 대화",
      {
        messages: [
          user("질문"),
          { role: "assistant", content: "답변", kind: "clarify" },
        ],
      },
    ],
  ])("%s 는 거절한다", async (_name, body) => {
    await expectError(await send(body), 400, "INVALID_REQUEST");
  });

  it("2,000자 입력은 받는다", async () => {
    const response = await send({ messages: [user("가".repeat(2000))] });
    expect(response.status).toBe(200);
  });

  it("2,001자 입력은 거절한다", async () => {
    await expectError(
      await send({ messages: [user("가".repeat(2001))] }),
      400,
      "INPUT_TOO_LONG",
    );
  });

  it("대화 메시지 수 상한을 넘으면 거절한다", async () => {
    await expectError(
      await send({ messages: Array(21).fill(user("질문")) }),
      400,
      "CONVERSATION_TOO_LONG",
    );
  });

  it("대화 전체 글자 수 상한을 넘으면 거절한다", async () => {
    const answer = {
      role: "assistant",
      content: "가".repeat(19000),
      kind: "clarify",
    };
    await expectError(
      await send({ messages: [answer, user("가".repeat(1001))] }),
      400,
      "CONVERSATION_TOO_LONG",
    );
  });

  it("이전 대화까지 모두 가린 뒤 AI로 보낸다", async () => {
    await send({
      messages: [
        user("192.168.0.10 접속 안 됨"),
        { role: "assistant", content: "root@web01 인가요?", kind: "clarify" },
        user("password=abc123"),
      ],
    });
    expect(ask).toHaveBeenCalledWith([
      { role: "user", content: "[IP] 접속 안 됨" },
      {
        role: "assistant",
        content: "[계정]@[호스트명] 인가요?",
        kind: "clarify",
      },
      { role: "user", content: "password=[비밀번호]" },
    ]);
  });

  it("형식이 틀린 AI 답변은 오류로 처리한다", async () => {
    ask.mockResolvedValue({ kind: "clarify", question: "" });
    const response = await send({ messages: [user("질문")] });
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("AI_ERROR");
  });

  it.each([
    "project_spend_limit_exceeded",
    "credit_balance_exhausted",
    "insufficient_quota",
  ])("비용 상한 오류 %s 를 안내한다", async (code) => {
    ask.mockRejectedValue(Object.assign(new Error("한도"), { code }));
    const response = await send({ messages: [user("질문")] });
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe("QUOTA_EXCEEDED");
  });

  it("그 밖의 AI 오류는 입력을 로그에 남기지 않고 처리한다", async () => {
    ask.mockRejectedValue(new Error("비밀 입력 내용"));
    const response = await send({ messages: [user("비밀 입력 내용")] });
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("AI_ERROR");
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain(
      "비밀 입력 내용",
    );
  });
});
