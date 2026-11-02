// Design Ref: §2 샘플 매뉴얼 형식 — manuals 폴더의 문서를 읽고 오래된 문서를 계산한다.
import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ManualSource } from "./types";

const MANUALS_DIR = path.join(process.cwd(), "manuals");
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

let cachedManuals: Manual[] | undefined;

export function loadManuals(): Manual[] {
  cachedManuals ??= readdirSync(MANUALS_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => parseManual(readFileSync(path.join(MANUALS_DIR, file), "utf8")));
  return cachedManuals;
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
