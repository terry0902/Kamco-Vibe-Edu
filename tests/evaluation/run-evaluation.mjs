// Design Ref: §6 정답률 채점 기준 — 실행 중인 앱에 테스트 질문을 보내 채점한다. 실제 OpenAI 비용이 든다.
// 사용법: npm run dev 실행 후 npm run eval -- [결과 파일 경로]. .env의 OPENAI_API_KEY를 쓴다.
// 데모 폴더는 EVAL_FOLDER=demo EVAL_QUESTIONS=questions-demo.json 으로 측정한다.
import { readFileSync, writeFileSync } from "node:fs";
import { API_KEY_HEADER, toHistoryMessage } from "../../lib/chat/types.ts";

const API_URL = process.env.EVAL_API_URL ?? "http://localhost:3000/api/chat";
const TARGET_RATE = 0.9;
const FOLDER = process.env.EVAL_FOLDER ?? "sample";
const questions = JSON.parse(
  readFileSync(
    new URL(`./${process.env.EVAL_QUESTIONS ?? "questions.json"}`, import.meta.url),
    "utf8",
  ),
);

async function post(messages) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { [API_KEY_HEADER]: process.env.OPENAI_API_KEY ?? "" },
    body: JSON.stringify({ messages, folder: FOLDER }),
  });
  return response.json();
}

function stepsOf(answer) {
  return [
    ...(answer.steps ?? []),
    ...(answer.versions ?? []).flatMap((version) => version.steps),
  ];
}

function sourcesOf(answer) {
  return [...(answer.sources ?? []), ...(answer.versions ?? [])];
}

function grade(expect, answer, firstAnswer) {
  const problems = [];
  const text = stepsOf(answer)
    .map((step) => step.text)
    .join("\n");

  if (expect.clarifyFirst && firstAnswer.kind !== "clarify") {
    problems.push(`처음에 되묻지 않음(${firstAnswer.kind ?? firstAnswer.error?.code})`);
  }
  if (expect.notInManual) {
    if (!["web", "notFound"].includes(answer.kind)) {
      problems.push(`"매뉴얼에 없음"으로 판단하지 않음(${answer.kind ?? answer.error?.code})`);
    }
    return problems;
  }
  if (answer.kind !== expect.kind) {
    problems.push(`답변 종류가 다름(${answer.kind ?? answer.error?.code})`);
    return problems;
  }

  const names = sourcesOf(answer).map((source) => source.name);
  for (const source of expect.sources ?? (expect.source ? [expect.source] : [])) {
    if (!names.includes(source)) {
      problems.push(`근거 문서 없음(${source})`);
    }
  }
  for (const key of expect.keys ?? []) {
    if (!text.includes(key)) {
      problems.push(`핵심 조치 없음(${key})`);
    }
  }
  if (expect.outdated && !sourcesOf(answer).some((source) => source.outdated)) {
    problems.push('"오래된 문서" 표시 없음');
  }
  if (expect.cautionOn) {
    const pattern = new RegExp(expect.cautionOn, "i");
    const targets = stepsOf(answer).filter((step) => pattern.test(step.text));
    if (targets.length === 0) {
      problems.push("위험 조치 단계 없음");
    } else if (targets.some((step) => !step.caution)) {
      problems.push('"주의" 표시 빠짐');
    }
  }
  return problems;
}

function describeAnswer(answer) {
  const lines = [`종류: ${answer.kind ?? answer.error?.code}`];
  if (answer.question) {
    lines.push(`질문: ${answer.question}`);
  }
  for (const version of answer.versions ?? []) {
    lines.push(`문서: ${version.name} (${version.date})`);
    lines.push(
      ...version.steps.map((step, index) => `  ${index + 1}. ${step.caution ? "[주의] " : ""}${step.text}`),
    );
  }
  lines.push(
    ...(answer.steps ?? []).map(
      (step, index) => `${index + 1}. ${step.caution ? "[주의] " : ""}${step.text}`,
    ),
  );
  for (const source of answer.sources ?? []) {
    lines.push(`근거: ${source.name} (${source.date})${source.outdated ? " 오래된 문서" : ""}`);
  }
  for (const link of answer.links ?? []) {
    lines.push(`출처: ${link.url}`);
  }
  return lines.join("\n");
}

const rows = [];
const details = [];
for (const item of questions) {
  const started = Date.now();
  const userMessage = { role: "user", content: item.question };
  const firstAnswer = await post([userMessage]);
  let answer = firstAnswer;

  if (item.followUp && firstAnswer.kind === "clarify") {
    answer = await post([
      userMessage,
      toHistoryMessage(firstAnswer),
      { role: "user", content: item.followUp },
    ]);
  }

  const problems = grade(item.expect, answer, firstAnswer);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const passed = problems.length === 0;
  console.log(`${passed ? "정답" : "오답"} ${item.id} ${seconds}초 ${answer.kind ?? answer.error?.code} ${problems.join(", ")}`);
  rows.push({ ...item, passed, problems, seconds, kind: answer.kind ?? answer.error?.code });
  details.push(
    `### ${item.id}. ${item.question}\n\n\`\`\`text\n${item.followUp ? `후속 입력: ${item.followUp}\n` : ""}${describeAnswer(answer)}\n\`\`\``,
  );
}

const correct = rows.filter((row) => row.passed).length;
const passedTarget = correct / rows.length >= TARGET_RATE;
const summary = `정답 ${correct}/${rows.length} (${Math.round((correct / rows.length) * 100)}%), 목표 90% ${passedTarget ? "달성" : "미달"}`;
console.log(summary);

const resultPath = process.argv[2];
if (resultPath) {
  const table = rows
    .map(
      (row) =>
        `| ${row.id} | ${row.type} | ${row.passed ? "정답" : "오답"} | ${row.kind} | ${row.seconds}초 | ${row.problems.join(", ")} |`,
    )
    .join("\n");
  writeFileSync(
    resultPath,
    `# 정답률 측정 결과\n\n${summary}\n\n자동 채점 결과이며, 사람이 아래 답변 전문을 함께 검토한다.\n\n| 번호 | 유형 | 판정 | 답변 종류 | 시간 | 문제 |\n|---|---|---|---|---:|---|\n${table}\n\n## 답변 전문\n\n${details.join("\n\n")}\n`,
  );
}
process.exit(passedTarget ? 0 : 1);
