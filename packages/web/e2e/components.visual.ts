import { test, expect } from "@playwright/test";

const stories = [
  { id: "errormessage--default", name: "ErrorMessage Default" },
  { id: "errormessage--long-message", name: "ErrorMessage LongMessage" },
  { id: "fileuploader--default", name: "FileUploader Default" },
  { id: "fileuploader--disabled", name: "FileUploader Disabled" },
  { id: "resulttable--empty", name: "ResultTable Empty" },
  { id: "resulttable--with-entities", name: "ResultTable WithEntities" },
  { id: "resulttable--single-entity", name: "ResultTable SingleEntity" },
  { id: "appview--initial", name: "App Initial" },
  { id: "appview--with-error", name: "App WithError" },
  { id: "appview--with-results", name: "App WithResults" },
];

for (const { id, name } of stories) {
  test(`${name} matches screenshot`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`, {
      waitUntil: "networkidle",
    });
    await expect(page).toHaveScreenshot(`${id}.png`);
  });
}
