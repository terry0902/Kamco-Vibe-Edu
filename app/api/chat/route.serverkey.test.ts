import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askAssistant } from "@/lib/chat/ai";
import { MAX_REQUESTS_PER_WINDOW, resetRateLimit } from "@/lib/chat/rateLimit";
import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/chat/ai", () => ({ askAssistant: vi.fn() }));

const ask = vi.mocked(askAssistant);
const SERVER_KEY = "sk-server-key-000000000000000";
const USER_KEY = "sk-user-key-00000000000000000";

function send(headers: HeadersInit = {}) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: [{ role: "user", content: "질문" }] }),
    }),
  );
}

describe("POST /api/chat: 발표용 서버 키 모드", () => {
  beforeEach(() => {
    ask.mockReset();
    ask.mockResolvedValue({ kind: "notFound", followUp: false });
    vi.spyOn(console, "error").mockImplementation(() => {});
    resetRateLimit();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("켜져 있으면 사용자 키 없이 서버 키로 답한다", async () => {
    vi.stubEnv("SERVER_KEY_MODE", "true");
    vi.stubEnv("OPENAI_API_KEY", SERVER_KEY);

    const response = await send();

    expect(response.status).toBe(200);
    expect(ask.mock.calls[0][1]).toBe(SERVER_KEY);
  });

  it("켜져 있으면 사용자가 보낸 키는 쓰지 않는다", async () => {
    vi.stubEnv("SERVER_KEY_MODE", "true");
    vi.stubEnv("OPENAI_API_KEY", SERVER_KEY);

    await send({ "x-openai-api-key": USER_KEY });

    expect(ask.mock.calls[0][1]).toBe(SERVER_KEY);
  });

  it("서버 키가 없거나 형식이 틀리면 키 값을 말하지 않고 오류로 끝낸다", async () => {
    vi.stubEnv("SERVER_KEY_MODE", "true");
    vi.stubEnv("OPENAI_API_KEY", "짧음");

    const response = await send();
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(text).not.toContain("짧음");
    expect(ask).not.toHaveBeenCalled();
  });

  it("같은 곳에서 너무 자주 부르면 429로 막는다", async () => {
    vi.stubEnv("SERVER_KEY_MODE", "true");
    vi.stubEnv("OPENAI_API_KEY", SERVER_KEY);
    const headers = { "x-forwarded-for": "203.0.113.7, 10.0.0.1" };

    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i += 1) {
      expect((await send(headers)).status).toBe(200);
    }
    const blocked = await send(headers);

    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe("RATE_LIMITED");
  });

  it("꺼져 있으면 서버 키가 있어도 사용자 키가 필요하다", async () => {
    vi.stubEnv("OPENAI_API_KEY", SERVER_KEY);

    const response = await send();

    expect(response.status).toBe(401);
    expect(ask).not.toHaveBeenCalled();
  });

  it("꺼져 있으면 사용자 키로 답하고 횟수를 제한하지 않는다", async () => {
    vi.stubEnv("OPENAI_API_KEY", SERVER_KEY);

    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW + 5; i += 1) {
      expect((await send({ "x-openai-api-key": USER_KEY })).status).toBe(200);
    }
    expect(ask.mock.calls[0][1]).toBe(USER_KEY);
  });
});
