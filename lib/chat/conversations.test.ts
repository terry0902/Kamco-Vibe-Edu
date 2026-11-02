import { describe, expect, it } from "vitest";
import {
  MAX_CONVERSATIONS,
  parseConversations,
  toHistory,
  toTitle,
  upsertConversation,
  type Conversation,
  type Entry,
} from "./conversations";

const conversation = (id: string): Conversation => ({
  id,
  title: "제목",
  updatedAt: 1,
  entries: [{ type: "question", text: "질문" }],
});
const clarify: Entry = {
  type: "answer",
  response: { kind: "clarify", question: "어느 장비인가요?" },
};

describe("toTitle", () => {
  it("첫 줄을 제목으로 쓴다", () => {
    expect(toTitle("  디스크 풀\n자세한 로그")).toBe("디스크 풀");
  });

  it("긴 제목은 줄인다", () => {
    expect(toTitle("가".repeat(50))).toBe(`${"가".repeat(40)}…`);
  });
});

describe("parseConversations", () => {
  it("저장한 대화를 그대로 읽는다", () => {
    const stored = [conversation("a")];
    expect(parseConversations(JSON.stringify(stored))).toEqual(stored);
  });

  it.each([
    ["값 없음", null],
    ["빈 값", ""],
    ["JSON이 아님", "not json"],
    ["배열이 아님", '{"id":"a"}'],
  ])("%s 이면 빈 목록을 돌려준다", (_name, raw) => {
    expect(parseConversations(raw)).toEqual([]);
  });

  it("깨진 대화만 빼고 나머지는 살린다", () => {
    const raw = JSON.stringify([
      conversation("a"),
      { id: "b" },
      { ...conversation("c"), entries: [{ type: "모름" }] },
    ]);
    expect(parseConversations(raw).map((item) => item.id)).toEqual(["a"]);
  });
});

describe("upsertConversation", () => {
  it("최근 대화를 맨 앞에 두고 같은 대화는 바꾼다", () => {
    const list = [conversation("a"), conversation("b")];
    const updated = { ...conversation("b"), title: "새 제목" };
    expect(upsertConversation(list, updated)).toEqual([updated, list[0]]);
  });

  it("상한을 넘으면 오래된 대화부터 지운다", () => {
    const list = Array.from({ length: MAX_CONVERSATIONS }, (_, index) =>
      conversation(String(index)),
    );
    const result = upsertConversation(list, conversation("new"));
    expect(result).toHaveLength(MAX_CONVERSATIONS);
    expect(result[0].id).toBe("new");
    expect(result.at(-1)?.id).toBe(String(MAX_CONVERSATIONS - 2));
  });
});

describe("toHistory", () => {
  it("질문과 답변을 대화 기록으로 바꾼다", () => {
    expect(toHistory([{ type: "question", text: "이상해요" }, clarify])).toEqual([
      { role: "user", content: "이상해요" },
      { role: "assistant", content: "어느 장비인가요?", kind: "clarify" },
    ]);
  });

  it("오류가 난 질문과 오류 메시지는 빼고, 다시 보낸 질문은 넣는다", () => {
    expect(
      toHistory([
        { type: "question", text: "질문" },
        { type: "error", message: "오류" },
        { type: "question", text: "질문" },
        clarify,
      ]),
    ).toEqual([
      { role: "user", content: "질문" },
      { role: "assistant", content: "어느 장비인가요?", kind: "clarify" },
    ]);
  });

  it("답을 기다리는 질문은 넣지 않는다", () => {
    expect(toHistory([{ type: "question", text: "질문" }])).toEqual([]);
  });
});
