// Design Ref: §2 샘플 매뉴얼 형식 — manuals 폴더의 문서를 읽고 오래된 문서를 계산한다.
import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DEFAULT_MANUAL_FOLDER, type ManualFolderId } from "./folders";
import type { ManualSource } from "./types";

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

// 폴더 이름은 허용 목록(ManualFolderId)의 값만 받으므로 경로를 바꿔치기할 수 없다.
const cachedManuals = new Map<ManualFolderId, Manual[]>();

export function loadManuals(folder: ManualFolderId = DEFAULT_MANUAL_FOLDER): Manual[] {
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

export function toManualSource(manual: Manual, now: Date): ManualSource {
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  return {
    name: manual.name,
    date: manual.date,
    outdated: new Date(manual.date) < oneYearAgo,
  };
}
