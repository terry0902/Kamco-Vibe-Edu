// Design Ref: §1 내 폴더 — 브라우저가 폴더를 읽어 문서 내용을 만든다. 서버는 이 폴더에 접속하지 않는다.
import {
  CUSTOM_MAX_DOC_CHARS,
  CUSTOM_MAX_DOCS,
  CUSTOM_MAX_TOTAL_CHARS,
} from "@/lib/chat/folders";
import type { CustomDoc } from "@/lib/chat/types";

const MAX_DEPTH = 2;
const TEXT_FILE = /\.(md|txt)$/i;

// 브라우저의 폴더 선택 API(Chrome, Edge)에서 쓰는 부분만 적었다.
export type FileLike = { name: string; size: number; lastModified: number; text: () => Promise<string> };
export type EntryLike =
  | { kind: "file"; name: string; getFile: () => Promise<FileLike> }
  | { kind: "directory"; name: string; values: () => AsyncIterable<EntryLike> };

export type LocalFolderResult = {
  label: string;
  docs: CustomDoc[];
  skipped: { tooLong: number; overLimit: number };
};

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" }) => Promise<EntryLike & { kind: "directory" }>;
};

export function isFolderPickerSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function toDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

async function listFiles(
  directory: EntryLike & { kind: "directory" },
  prefix: string,
  depth: number,
): Promise<{ path: string; entry: EntryLike & { kind: "file" } }[]> {
  const found: { path: string; entry: EntryLike & { kind: "file" } }[] = [];
  const children: EntryLike[] = [];
  for await (const child of directory.values()) children.push(child);
  children.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  for (const child of children) {
    // 숨김 폴더와 NAS의 관리용 폴더(@eaDir 등)는 건너뛴다.
    if (child.name.startsWith(".") || child.name.startsWith("@") || child.name.startsWith("#")) {
      continue;
    }
    if (child.kind === "file" && TEXT_FILE.test(child.name)) {
      found.push({ path: `${prefix}${child.name}`, entry: child });
    } else if (child.kind === "directory" && depth < MAX_DEPTH) {
      found.push(...(await listFiles(child, `${prefix}${child.name}/`, depth + 1)));
    }
  }
  return found;
}

export async function readFolder(
  directory: EntryLike & { kind: "directory" },
): Promise<LocalFolderResult> {
  const files = await listFiles(directory, "", 1);
  const docs: CustomDoc[] = [];
  const skipped = { tooLong: 0, overLimit: 0 };
  let total = 0;

  for (const { path, entry } of files) {
    const file = await entry.getFile();
    // 너무 긴 문서는 일부만 보내면 조치 단계가 잘릴 수 있어 통째로 제외한다.
    if (file.size > CUSTOM_MAX_DOC_CHARS * 4) {
      skipped.tooLong += 1;
      continue;
    }
    const text = (await file.text()).trim();
    if (text === "") continue;
    if (text.length > CUSTOM_MAX_DOC_CHARS) {
      skipped.tooLong += 1;
      continue;
    }
    if (docs.length >= CUSTOM_MAX_DOCS || total + text.length > CUSTOM_MAX_TOTAL_CHARS) {
      skipped.overLimit += 1;
      continue;
    }
    total += text.length;
    docs.push({ file: path, text, modified: toDate(file.lastModified) });
  }
  return { label: directory.name, docs, skipped };
}

// 사용자가 취소하면 null을 돌려준다.
export async function pickLocalFolder(): Promise<LocalFolderResult | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("UNSUPPORTED");
  try {
    return await readFolder(await picker.call(window, { mode: "read" }));
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    throw error;
  }
}
