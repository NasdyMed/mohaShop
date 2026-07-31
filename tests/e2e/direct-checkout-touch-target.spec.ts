import { join } from "node:path";
import { expect, test } from "@playwright/test";

const viewportWidths = [1440, 900, 760, 640, 390, 360, 320];

test("keeps the direct checkout button touch-safe at responsive widths", async ({ page }) => {
  await page.setContent('<div class="add-to-cart"><button type="button">Commander maintenant</button></div>');
  await page.addStyleTag({ path: join(process.cwd(), "app/globals.css") });

  const button = page.getByRole("button", { name: "Commander maintenant" });
  for (const width of viewportWidths) {
    await page.setViewportSize({ width, height: 900 });
    const box = await button.boundingBox();

    expect(box, `button should be rendered at ${width}px`).not.toBeNull();
    expect(box?.height ?? 0, `button height at ${width}px`).toBeGreaterThanOrEqual(44);
  }
});
