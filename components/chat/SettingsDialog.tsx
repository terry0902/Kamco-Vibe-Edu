import { useEffect, useRef, useState, type FormEvent } from "react";
import { isApiKeyFormatValid } from "@/lib/chat/types";

type SettingsDialogProps = {
  apiKey: string;
  keyRemembered: boolean;
  conversationCount: number;
  onSaveApiKey: (apiKey: string, remember: boolean) => void;
  onClearConversations: () => void;
  onClose: () => void;
};

export default function SettingsDialog({
  apiKey,
  keyRemembered,
  conversationCount,
  onSaveApiKey,
  onClearConversations,
  onClose,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(apiKey);
  const [remember, setRemember] = useState(keyRemembered);
  const [status, setStatus] = useState("");

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!isApiKeyFormatValid(trimmed)) {
      setStatus("API 키 형식이 올바르지 않습니다. 복사한 키를 확인해 주세요.");
      return;
    }
    onSaveApiKey(trimmed, remember);
    onClose();
  }

  function handleDeleteKey() {
    setDraft("");
    setRemember(false);
    onSaveApiKey("", false);
    setStatus("API 키를 이 브라우저에서 삭제했습니다.");
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="settings-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-white/15 bg-[#16161a] p-5 text-foreground shadow-2xl backdrop:bg-black/70"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="settings-title" className="text-base font-semibold">
          설정
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="설정 닫기"
          className="rounded px-2 py-1 text-sm hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
        <label htmlFor="api-key" className="text-sm font-medium">
          OpenAI API 키
        </label>
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setStatus("");
          }}
          placeholder="sk-로 시작하는 키"
          className="glass-field px-3 py-2 text-base text-zinc-100 outline-none placeholder:text-zinc-500 sm:text-sm"
        />
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="mt-1"
          />
          <span>
            이 브라우저에 계속 저장
            <span className="block text-xs text-zinc-400">
              끄면 이 탭에서만 기억하고, 탭을 닫으면 지워집니다.
            </span>
          </span>
        </label>
        {status && (
          <p role="status" className="text-xs font-medium">
            {status}
          </p>
        )}
        <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-zinc-400">
          <li>키는 암호화 없이 브라우저에 보관됩니다. 공용 PC에서는 계속 저장을 켜지 마세요.</li>
          <li>
            답변을 만들 때 이 앱의 서버를 거쳐 OpenAI로 전달되며, 서버에 저장하지
            않습니다.
          </li>
          <li>
            사용 요금은 이 키의 OpenAI 계정으로 청구됩니다. OpenAI 설정에서 월
            사용 상한을 정해 두세요.
          </li>
        </ul>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleDeleteKey}
            disabled={!apiKey}
            className="glass-button px-3 py-2 text-sm disabled:opacity-40"
          >
            키 삭제
          </button>
          <button
            type="submit"
            className="glass-primary px-4 py-2 text-sm font-medium"
          >
            저장
          </button>
        </div>
      </form>

      <div className="mt-5 border-t border-white/10 pt-4">
        <h3 className="text-sm font-medium">대화 기록</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-400">
          입력한 내용을 포함해 이 브라우저에만 저장됩니다. 지금 {conversationCount}
          개가 있으며, 50개를 넘으면 오래된 대화부터 지워집니다.
        </p>
        <button
          type="button"
          onClick={onClearConversations}
          disabled={conversationCount === 0}
          className="mt-2 rounded-lg border border-red-400/50 px-3 py-2 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-40"
        >
          대화 전체 삭제
        </button>
      </div>
    </dialog>
  );
}
