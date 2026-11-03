import type { Conversation } from "@/lib/chat/conversations";

type SidebarProps = {
  conversations: Conversation[];
  activeId: string | null;
  open: boolean;
  disabled: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
};

function formatDate(time: number): string {
  return new Date(time).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Sidebar({
  conversations,
  activeId,
  open,
  disabled,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
  onOpenSettings,
}: SidebarProps) {
  return (
    <>
      {/* 휴대폰 폭에서는 메뉴를 누를 때만 위에 겹쳐 보여 준다. */}
      {open && (
        <button
          type="button"
          aria-label="대화 목록 닫기"
          onClick={onClose}
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
        />
      )}
      <aside
        aria-label="대화 목록"
        className={`fixed inset-y-0 left-0 z-20 w-64 max-w-[85%] flex-col border-r border-line bg-surface md:static md:z-auto md:flex md:shrink-0 ${
          open ? "flex" : "hidden"
        }`}
      >
        <div className="p-3">
          <button
            type="button"
            onClick={onNewChat}
            disabled={disabled}
            className="w-full rounded-full px-3 py-2 text-sm bg-white font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-40"
          >
            새 대화
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-xs leading-5 text-muted">
              아직 대화가 없습니다. 대화는 이 브라우저에만 저장됩니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {conversations.map((conversation) => (
                <li
                  key={conversation.id}
                  className={`flex items-center rounded-md ${
                    conversation.id === activeId
                      ? "bg-white/10"
                      : "hover:bg-white/5"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    disabled={disabled}
                    aria-current={conversation.id === activeId ? "true" : undefined}
                    className="min-w-0 flex-1 px-2 py-2 text-left disabled:opacity-40"
                  >
                    <span className="block truncate text-sm">
                      {conversation.title}
                    </span>
                    <span className="block text-xs text-muted">
                      {formatDate(conversation.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(conversation.id)}
                    disabled={disabled}
                    aria-label={`${conversation.title} 대화 삭제`}
                    title="대화 삭제"
                    className="mr-1 shrink-0 rounded px-2 py-1 text-sm text-muted hover:bg-white/10 disabled:opacity-40"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full rounded-full px-3 py-2 text-left text-sm text-muted hover:bg-white/5 hover:text-foreground"
          >
            ⚙ 설정
          </button>
        </div>
      </aside>
    </>
  );
}
