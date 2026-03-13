import { test, expect } from "@playwright/test";

const stories = [
  { id: "components-errormessage--default", name: "ErrorMessage Default" },
  { id: "components-errormessage--long-message", name: "ErrorMessage LongMessage" },
  { id: "components-fileuploader--default", name: "FileUploader Default" },
  { id: "components-fileuploader--disabled", name: "FileUploader Disabled" },
  { id: "components-resulttable--empty", name: "ResultTable Empty" },
  { id: "components-resulttable--with-entities", name: "ResultTable WithEntities" },
  { id: "components-resulttable--single-entity", name: "ResultTable SingleEntity" },
  { id: "app--initial", name: "App Initial" },
  { id: "app--with-error", name: "App WithError" },
  { id: "app--with-results", name: "App WithResults" },
];

for (const { id, name } of stories) {
  test(`${name} matches screenshot`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`, {
      waitUntil: "networkidle",
    });
    await expect(page).toHaveScreenshot(`${id}.png`);
  });
}
