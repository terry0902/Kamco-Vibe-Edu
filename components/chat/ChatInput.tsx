import type { KeyboardEvent } from "react";
import { isInputTooLong, MAX_INPUT_LENGTH } from "@/lib/chat/types";

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
  const tooLong = isInputTooLong(value);

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
      <p className="text-xs font-medium text-red-300">
        {INPUT_NOTICE}
      </p>
      <div className="flex items-end gap-2">
        {/* maxLength를 쓰면 붙여 넣은 글이 조용히 잘리므로, 안내로 줄이게 한다. */}
        <textarea
          aria-label="증상이나 에러 메시지"
          aria-invalid={tooLong}
          placeholder="증상이나 에러 메시지를 입력하세요"
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className={`min-w-0 flex-1 resize-none rounded-xl border bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted sm:text-sm ${
            tooLong
              ? "border-red-400 focus:border-red-400"
              : "border-line focus:border-accent"
          }`}
        />
        <button
          type="submit"
          disabled={disabled || tooLong || value.trim() === ""}
          className="h-10 shrink-0 rounded-full px-5 text-sm bg-white font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-40"
        >
          보내기
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <p role="alert" className="font-medium text-red-300">
          {tooLong && "에러 부분만 넣어 주세요"}
        </p>
        <p
          className={
            tooLong
              ? "shrink-0 font-medium text-red-300"
              : "shrink-0 text-muted"
          }
        >
          {value.length.toLocaleString("ko-KR")} /{" "}
          {MAX_INPUT_LENGTH.toLocaleString("ko-KR")}자
        </p>
      </div>
    </form>
  );
}
