export async function openImagePickerViaUI(page, trigger) {
  await trigger.click();
  const picker = page.locator("#file-picker");
  await picker.waitFor({ state: "visible" });
  return picker;
}

export async function selectFileViaUI(page, picker, path) {
  await picker.locator('input[name="file"]').fill(path);
  await picker.locator('button[type="submit"]').click();
  await picker.waitFor({ state: "detached" });
}
