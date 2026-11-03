// Design Ref: §1 답변 카드 종류 — 내용은 글자로만 표시하고 HTML로 해석하지 않는다.
import type { ReactNode } from "react";
import type { ChatResponse, ManualSource, Step } from "@/lib/chat/types";

const FOLLOW_UP_NOTICE = "그래도 해결되지 않으면 질문을 재검토 해주세요.";
const WEB_NOTICE = "매뉴얼 외 정보이므로 검토 후 적용하세요";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="w-full rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children}
    </article>
  );
}

// AI가 명령을 백틱으로 감싸 보내므로, 백틱 대신 코드 글꼴로 표시한다.
function StepText({ text }: { text: string }) {
  const parts = text.split("`");
  if (parts.length % 2 === 0) {
    // 짝이 맞지 않는 백틱은 코드 구간을 알 수 없으므로 기호만 뺀다.
    return text.replaceAll("`", "");
  }
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <code
        key={index}
        className="rounded bg-zinc-100 px-1 font-mono text-[0.9em] break-all dark:bg-zinc-800"
      >
        {part}
      </code>
    ) : (
      part
    ),
  );
}

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col gap-1">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-2">
          <span className="shrink-0">{index + 1}.</span>
          <span className="min-w-0 break-words">
            {step.caution && (
              <strong className="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                ⚠ 주의
              </strong>
            )}
            <StepText text={step.text} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function SourceLabel({ source }: { source: ManualSource }) {
  return (
    <>
      {source.name} ({source.date})
      {source.outdated && (
        <span className="ml-1 rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-700">
          오래된 문서
        </span>
      )}
    </>
  );
}

function FollowUpNotice() {
  return <p className="mt-3 font-medium">{FOLLOW_UP_NOTICE}</p>;
}

function MissingLabel({ followUp }: { followUp: boolean }) {
  return (
    <p className="font-medium">
      {followUp ? "매뉴얼에 다른 방법 없음" : "매뉴얼에 없음"}
    </p>
  );
}

export function ErrorCard({ message }: { message: string }) {
  return (
    <article
      role="alert"
      className="w-full rounded-lg border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {message}
    </article>
  );
}

export default function AnswerCard({ response }: { response: ChatResponse }) {
  switch (response.kind) {
    case "manual":
      return (
        <Card title="매뉴얼 답변">
          <Steps steps={response.steps} />
          <div className="mt-3 border-t border-zinc-200 pt-2 text-xs dark:border-zinc-800">
            <p className="font-medium">근거</p>
            <ul className="mt-1 flex flex-col gap-1">
              {response.sources.map((source) => (
                <li key={source.name}>
                  <SourceLabel source={source} />
                </li>
              ))}
            </ul>
          </div>
          {response.followUp && <FollowUpNotice />}
        </Card>
      );
    case "conflict":
      return (
        <Card title="문서 충돌">
          <p className="mb-3">문서 내용이 서로 다릅니다. 담당자가 판단해 주세요.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {response.versions.map((version) => (
              <section
                key={version.name}
                className="min-w-0 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <h3 className="mb-2 text-xs font-medium">
                  <SourceLabel source={version} />
                </h3>
                <Steps steps={version.steps} />
              </section>
            ))}
          </div>
        </Card>
      );
    case "clarify":
      return (
        <Card title="추가 확인">
          <p>{response.question}</p>
        </Card>
      );
    case "escalate":
      return (
        <Card title="추가 확인 필요">
          <p>증상을 특정하지 못했습니다. 질문을 재검토 해주세요.</p>
        </Card>
      );
    case "web":
      return (
        <Card title="인터넷 답변">
          <p className="mb-2 rounded bg-amber-100 px-2 py-1 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            {WEB_NOTICE}
          </p>
          <div className="mb-2">
            <MissingLabel followUp={response.followUp} />
          </div>
          <Steps steps={response.steps} />
          <div className="mt-3 border-t border-zinc-200 pt-2 text-xs dark:border-zinc-800">
            <p className="font-medium">출처</p>
            <ul className="mt-1 flex flex-col gap-1">
              {response.links.map((link) => (
                <li key={link.url} className="break-words">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {response.followUp && <FollowUpNotice />}
        </Card>
      );
    case "notFound":
      return (
        <Card title="찾지 못함">
          <MissingLabel followUp={response.followUp} />
          <p>인터넷에서도 찾지 못했습니다. 질문을 재검토 해주세요.</p>
        </Card>
      );
  }
}
