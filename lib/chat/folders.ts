// Design Ref: §2 참조 폴더 — 화면과 서버가 함께 쓰는 매뉴얼 폴더 목록. 서버는 이 목록의 폴더만 읽는다.
export const BUILT_IN_FOLDERS = [
  {
    id: "sample",
    label: "기본 샘플 매뉴얼",
    description: "디스크, 메모리, 네트워크, 웹 서비스, GPU, 방화벽 등 기본 샘플 13개",
  },
  {
    id: "demo",
    label: "데모 매뉴얼 (가상)",
    description: "백업, 인증서, DNS, 시간 동기화, SSH 등 시연용 가상 문서 10개",
  },
] as const;

// "custom"은 사용자가 브라우저에서 고른 폴더(NAS 등)다. 서버는 이 폴더에 접속하지 않고, 브라우저가 읽어 보낸 문서만 쓴다.
export const CUSTOM_FOLDER = {
  id: "custom",
  label: "내 폴더 (이 브라우저에서 선택)",
  description:
    "NAS 등 내 PC에서 열 수 있는 폴더를 직접 골라 그 안의 문서로 답합니다",
} as const;

export const MANUAL_FOLDERS = [...BUILT_IN_FOLDERS, CUSTOM_FOLDER] as const;

export type BuiltInFolderId = (typeof BUILT_IN_FOLDERS)[number]["id"];
export type ManualFolderId = BuiltInFolderId | typeof CUSTOM_FOLDER.id;

export const MANUAL_FOLDER_IDS = MANUAL_FOLDERS.map((folder) => folder.id) as [
  ManualFolderId,
  ...ManualFolderId[],
];
export const BUILT_IN_FOLDER_IDS = BUILT_IN_FOLDERS.map(
  (folder) => folder.id,
) as BuiltInFolderId[];
export const DEFAULT_MANUAL_FOLDER: BuiltInFolderId = "sample";

// 내 폴더에서 읽어 보내는 문서의 상한. 화면과 서버가 같은 값을 쓴다.
export const CUSTOM_MAX_DOCS = 30;
export const CUSTOM_MAX_DOC_CHARS = 5_000;
export const CUSTOM_MAX_TOTAL_CHARS = 30_000;

export function isManualFolderId(value: unknown): value is ManualFolderId {
  return MANUAL_FOLDERS.some((folder) => folder.id === value);
}

export function manualFolderLabel(id: ManualFolderId): string {
  return MANUAL_FOLDERS.find((folder) => folder.id === id)?.label ?? id;
}
