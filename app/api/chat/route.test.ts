import { beforeEach, describe, expect, it, vi } from "vitest";
import { askAssistant } from "@/lib/chat/ai";
import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/chat/ai", () => ({ askAssistant: vi.fn() }));

const ask = vi.mocked(askAssistant);
const API_KEY = "sk-test-key-0000000000000000";

function send(body: unknown, headers: HeadersInit = { "x-openai-api-key": API_KEY }) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers,
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

  it.each([
    ["헤더 없음", {}],
    ["빈 키", { "x-openai-api-key": "   " }],
    ["너무 짧은 키", { "x-openai-api-key": "short" }],
    ["공백이 든 키", { "x-openai-api-key": "sk-test key 000000000000000" }],
  ])("%s 이면 AI를 호출하지 않고 키를 요구한다", async (_name, headers) => {
    await expectError(
      await send({ messages: [user("질문")] }, headers),
      401,
      "API_KEY_REQUIRED",
    );
  });

  it("OpenAI가 키를 거절하면 키 확인을 안내하고 로그에 키를 남기지 않는다", async () => {
    ask.mockRejectedValue(
      Object.assign(new Error(`Incorrect API key: ${API_KEY}`), { status: 401 }),
    );
    const response = await send({ messages: [user("질문")] });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("API_KEY_INVALID");
    expect(JSON.stringify(body)).not.toContain(API_KEY);
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain(API_KEY);
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
    expect(ask).toHaveBeenCalledWith(
      [
      { role: "user", content: "[IP] 접속 안 됨" },
      {
        role: "assistant",
        content: "[계정]@[호스트명] 인가요?",
        kind: "clarify",
      },
      { role: "user", content: "password=[비밀번호]" },
    ],
      API_KEY,
      "sample",
    );
  });

  it("폴더를 지정하지 않으면 기본 폴더로 묻는다", async () => {
    await send({ messages: [user("질문")] });
    expect(ask.mock.calls[0][2]).toBe("sample");
  });

  it("허용한 폴더는 그대로 넘긴다", async () => {
    await send({ messages: [user("질문")], folder: "demo" });
    expect(ask.mock.calls[0][2]).toBe("demo");
  });

  describe("내 폴더(custom)", () => {
    const doc = (text: string, file = "점검.md") => ({ file, text, modified: "2026-05-01" });

    it("문서를 가려서 목록으로 AI에 넘긴다", async () => {
      await send({
        messages: [user("질문")],
        folder: "custom",
        customDocs: [doc("서버 10.0.0.5 에서 `systemctl restart app`을 실행한다")],
      });
      const source = ask.mock.calls[0][2];
      expect(Array.isArray(source)).toBe(true);
      expect(source).toEqual([
        {
          name: "점검",
          date: "2026-05-01",
          body: "서버 [IP] 에서 `systemctl restart app`을 실행한다",
        },
      ]);
    });

    it.each([
      ["문서 없음", undefined],
      ["빈 목록", []],
      ["문서 31개", Array(31).fill(doc("내용"))],
      ["문서 하나가 5,001자", [doc("가".repeat(5001))]],
      ["전체 30,001자", Array(7).fill(doc("가".repeat(4286)))],
      ["잘못된 날짜", [{ file: "a.md", text: "내용", modified: "어제" }]],
    ])("거절한다: %s", async (_name, customDocs) => {
      await expectError(
        await send({ messages: [user("질문")], folder: "custom", customDocs }),
        400,
        "INVALID_REQUEST",
      );
    });

    it("내 폴더가 아니면 보낸 문서를 쓰지 않는다", async () => {
      await send({
        messages: [user("질문")],
        folder: "demo",
        customDocs: [doc("내용")],
      });
      expect(ask.mock.calls[0][2]).toBe("demo");
    });
  });

  it.each(["../secrets", "manuals", "", 1])(
    "목록에 없는 폴더는 거절한다: %s",
    async (folder) => {
      await expectError(
        await send({ messages: [user("질문")], folder }),
        400,
        "INVALID_REQUEST",
      );
    },
  );

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
