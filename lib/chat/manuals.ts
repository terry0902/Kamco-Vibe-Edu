// Design Ref: §2 샘플 매뉴얼 형식 — manuals 폴더의 문서를 읽고 오래된 문서를 계산한다.
import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DEFAULT_MANUAL_FOLDER, type BuiltInFolderId } from "./folders";
import { maskSensitive } from "./mask";
import type { CustomDoc, ManualSource } from "./types";

const MANUALS_ROOT = path.join(process.cwd(), "manuals");
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

const frontMatterSchema = z.object({
  name: z.string().min(1),
  date: z.iso.date(),
});

export type Manual = z.infer<typeof frontMatterSchema> & { body: string };

export function parseManual(text: string): Manual {
  const match = text.match(FRONT_MATTER);
  if (!match) {
    throw new Error("매뉴얼 머리말 형식 오류");
  }

  const fields = Object.fromEntries(
    match[1].split(/\r?\n/).map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
  );
  return { ...frontMatterSchema.parse(fields), body: match[2].trim() };
}

// 폴더 이름은 허용 목록(BuiltInFolderId)의 값만 받으므로 경로를 바꿔치기할 수 없다.
const cachedManuals = new Map<BuiltInFolderId, Manual[]>();

export function loadManuals(folder: BuiltInFolderId = DEFAULT_MANUAL_FOLDER): Manual[] {
  let manuals = cachedManuals.get(folder);
  if (!manuals) {
    const dir = path.join(MANUALS_ROOT, folder);
    manuals = readdirSync(dir)
      .filter((file) => file.endsWith(".md"))
      .sort()
      .map((file) => parseManual(readFileSync(path.join(dir, file), "utf8")));
    cachedManuals.set(folder, manuals);
  }
  return manuals;
}

const STRUCTURE_TAG = /<(\/?manuals?)/gi;
const NAME_UNSAFE = /["<>\r\n]/g;

function fileStem(file: string): string {
  const base = file.split("/").pop() ?? file;
  return base.replace(/\.[^.]+$/, "");
}

// 내 폴더의 문서는 외부 AI로 나가기 전에 서버가 다시 가리고, 프롬프트 구조를 깨는 표시를 막는다.
// 머리말(name, date)이 없는 문서는 파일 이름과 수정일을 쓴다.
export function buildCustomManuals(docs: CustomDoc[]): Manual[] {
  const used = new Set<string>();
  const manuals: Manual[] = [];

  for (const doc of docs) {
    let parsed: Manual;
    try {
      parsed = parseManual(doc.text);
    } catch {
      parsed = {
        name: fileStem(doc.file),
        date: doc.modified,
        body: doc.text.trim(),
      };
    }
    const body = maskSensitive(parsed.body)
      .replace(STRUCTURE_TAG, "＜$1")
      .trim();
    if (body === "") continue;

    const cleanName =
      maskSensitive(parsed.name).replace(NAME_UNSAFE, " ").replace(/\s+/g, " ").trim() ||
      fileStem(doc.file);
    // 이름이 겹치면 출처를 구분할 수 있도록 파일 경로를 덧붙인다.
    const name = used.has(cleanName) ? `${cleanName} (${doc.file})` : cleanName;
    used.add(name);
    manuals.push({ name, date: parsed.date, body });
  }
  return manuals;
}

export function toManualSource(manual: Manual, now: Date): ManualSource {
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  return {
    name: manual.name,
    date: manual.date,
    outdated: new Date(manual.date) < oneYearAgo,
  };
}
