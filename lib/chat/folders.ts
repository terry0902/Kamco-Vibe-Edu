// Design Ref: §2 참조 폴더 — 화면과 서버가 함께 쓰는 매뉴얼 폴더 목록. 서버는 이 목록의 폴더만 읽는다.
export const MANUAL_FOLDERS = [
  {
    id: "sample",
    label: "기본 샘플 매뉴얼",
    description: "디스크, 메모리, 네트워크, 웹 서비스, GPU 등 기본 샘플 10개",
  },
  {
    id: "demo",
    label: "데모 매뉴얼 (가상)",
    description: "백업, 인증서, DNS, 시간 동기화, SSH 등 시연용 가상 문서 10개",
  },
] as const;

export type ManualFolderId = (typeof MANUAL_FOLDERS)[number]["id"];

export const MANUAL_FOLDER_IDS = MANUAL_FOLDERS.map((folder) => folder.id) as [
  ManualFolderId,
  ...ManualFolderId[],
];
export const DEFAULT_MANUAL_FOLDER: ManualFolderId = "sample";

export function isManualFolderId(value: unknown): value is ManualFolderId {
  return MANUAL_FOLDERS.some((folder) => folder.id === value);
}

export function manualFolderLabel(id: ManualFolderId): string {
  return MANUAL_FOLDERS.find((folder) => folder.id === id)?.label ?? id;
}
