import { test, expect } from "@playwright/test";

const stories = [
  { id: "components-errormessage--default", name: "ErrorMessage Default" },
  { id: "components-errormessage--long-message", name: "ErrorMessage LongMessage" },
  { id: "components-fileuploader--default", name: "FileUploader Default" },
  { id: "components-fileuploader--disabled", name: "FileUploader Disabled" },
  { id: "components-filepreviewtile--image", name: "FilePreviewTile Image" },
  { id: "components-filepreviewtile--pdf", name: "FilePreviewTile Pdf" },
  { id: "components-filepreviewtile--long-file-name", name: "FilePreviewTile LongFileName" },
  { id: "components-filepreviewlist--default", name: "FilePreviewList Default" },
  { id: "components-filepreviewlist--single-image", name: "FilePreviewList SingleImage" },
  { id: "components-filepreviewlist--long-file-name", name: "FilePreviewList LongFileName" },
  { id: "components-imagepreviewdialog--default", name: "ImagePreviewDialog Default" },
  { id: "components-imagepreviewdialog--long-file-name", name: "ImagePreviewDialog LongFileName" },
  { id: "components-resulttable--empty", name: "ResultTable Empty" },
  { id: "components-resulttable--with-receipt", name: "ResultTable WithReceipt" },
  { id: "components-resulttable--without-registration", name: "ResultTable WithoutRegistration" },
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
