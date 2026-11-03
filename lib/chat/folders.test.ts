import { describe, expect, it } from "vitest";
import {
  DEFAULT_MANUAL_FOLDER,
  BUILT_IN_FOLDER_IDS,
  isManualFolderId,
  MANUAL_FOLDER_IDS,
  manualFolderLabel,
} from "./folders";

describe("folders", () => {
  it("기본 폴더는 목록 안에 있다", () => {
    expect(MANUAL_FOLDER_IDS).toContain(DEFAULT_MANUAL_FOLDER);
  });

  it("내 폴더는 허용 목록에 있지만 기본 제공 폴더는 아니다", () => {
    expect(MANUAL_FOLDER_IDS).toContain("custom");
    expect(BUILT_IN_FOLDER_IDS).not.toContain("custom");
  });

  it.each(["sample", "demo", "custom"])("%s는 허용한다", (id) => {
    expect(isManualFolderId(id)).toBe(true);
  });

  it.each(["../manuals", "SAMPLE", "", null, undefined, 3])(
    "목록에 없는 값은 허용하지 않는다: %s",
    (value) => {
      expect(isManualFolderId(value)).toBe(false);
    },
  );

  it("화면에 보일 이름을 돌려준다", () => {
    expect(manualFolderLabel("demo")).toBe("데모 매뉴얼 (가상)");
  });
});
