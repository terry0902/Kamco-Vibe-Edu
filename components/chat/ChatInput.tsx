import type { KeyboardEvent } from "react";

const INPUT_NOTICE =
  "실제 IP 주소, 호스트명, 계정, 비밀번호, 개인정보를 입력하지 마세요";

type ChatInputProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export default function ChatInput({
  value,
  disabled,
  onChange,
  onSubmit,
}: ChatInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // 한글 조합 중의 Enter는 글자 확정이므로 전송하지 않는다.
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p className="text-xs font-medium text-red-700 dark:text-red-400">
        {INPUT_NOTICE}
      </p>
      <div className="flex items-end gap-2">
        <textarea
          aria-label="증상이나 에러 메시지"
          placeholder="증상이나 에러 메시지를 입력하세요"
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={disabled || value.trim() === ""}
          className="h-10 shrink-0 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:opacity-40"
        >
          보내기
        </button>
      </div>
    </form>
  );
}
