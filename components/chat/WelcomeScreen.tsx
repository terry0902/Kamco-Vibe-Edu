const STEPS = [
  {
    title: "증상 입력",
    description: "증상이나 에러 메시지를 아래 입력창에 적습니다.",
  },
  {
    title: "조치 방법 확인",
    description:
      "매뉴얼에서 찾은 조치와 근거 문서를 봅니다. 매뉴얼에 없으면 인터넷에서 찾아 출처 링크와 함께 안내합니다.",
  },
  {
    title: "직접 조치",
    description:
      "내용을 검토한 뒤 담당자가 직접 조치합니다. 해결되지 않으면 결과를 다시 입력해 다른 방법을 찾습니다.",
  },
];

type WelcomeScreenProps = {
  needsApiKey: boolean;
  onOpenSettings: () => void;
};

export default function WelcomeScreen({
  needsApiKey,
  onOpenSettings,
}: WelcomeScreenProps) {
  return (
    <section className="my-auto flex flex-col items-center gap-6 py-4 text-center">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">어떤 장애가 발생했나요?</h2>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          증상을 알려 주시면 조치 방법과 출처를 찾아 드립니다.
        </p>
      </div>

      {needsApiKey && (
        <div className="flex w-full flex-col items-center gap-2 rounded-lg bg-amber-100 p-4 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          <p>시작하려면 본인의 OpenAI API 키가 필요합니다.</p>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
          >
            API 키 설정
          </button>
        </div>
      )}

      <ol className="grid w-full gap-3 text-left sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="font-semibold">
              {index + 1}. {step.title}
            </p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              {step.description}
            </p>
          </li>
        ))}
      </ol>

      <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-400">
        이 앱은 서버에 접속하거나 명령을 실행하지 않고, 샘플 매뉴얼을 기준으로
        안내합니다.
      </p>
    </section>
  );
}
