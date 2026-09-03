import { expect, test, type Page } from "@playwright/test";

type LaunchBehavior = "same-tab" | "new-tab" | "embedded";

const art = (office: "atlas" | "meme", id: string, launchBehavior: LaunchBehavior, x: number) => ({
  id,
  type: "framed-product-art",
  mediaUrl: `https://assets.test/${office}-${id}.svg`,
  accessibleName: `${office === "atlas" ? "Atlas" : "Meme"} ${id}`,
  shortDescription: `${launchBehavior} product assignment`,
  destinationUrl: `https://safe.test/${launchBehavior}`,
  launchBehavior,
  accessLevel: "member",
  placement: {
    surface: "north-wall",
    position: { x, y: office === "atlas" ? 2.8 : 2.55, z: office === "atlas" ? -5.82 : -4.82 },
    scale: office === "atlas" ? 0.72 : 0.64,
    orientation: { x: 0, y: 0, z: 0 },
    displayOrder: ["same-tab", "new-tab", "embedded"].indexOf(launchBehavior),
  },
  frame: { style: "cinematic-next", interaction: "focus-or-activate" },
  mobileFallback: { style: "framed-wall-art", preciseSelectionRequired: false },
});

const assignments = {
  atlas: [
    art("atlas", "strategy", "same-tab", -2.3),
    art("atlas", "studio", "new-tab", 0),
    art("atlas", "vault", "embedded", 2.3),
  ],
  meme: [
    art("meme", "campaign", "same-tab", -2.2),
    art("meme", "creative", "new-tab", 0),
    art("meme", "library", "embedded", 2.2),
  ],
};

async function mockOfficeProducts(page: Page, mobileFallback = false) {
  await page.route("**/api/rooms/**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "{}" });
  });
  await page.route("https://assets.test/**", async (route) => {
    const label = route.request().url().split("/").at(-1)?.replace(".svg", "") ?? "product";
    await route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="100%" height="100%" fill="#111827"/><rect x="18" y="18" width="604" height="384" rx="18" fill="none" stroke="#e0b65b" stroke-width="12"/><text x="320" y="220" fill="#fff" font-family="sans-serif" font-size="42" text-anchor="middle">${label}</text></svg>`,
    });
  });
  await page.route("**/api/office-products/*", async (route) => {
    const officeSlug = route.request().url().split("/").at(-1) as keyof typeof assignments;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        contractVersion: 1,
        officeSlug,
        presentation: "framed-wall-art",
        framedWallArt: mobileFallback && officeSlug === "meme"
          ? [assignments.meme[0]]
          : assignments[officeSlug] ?? [],
      }),
    });
  });
}

async function expectPlacementContract(page: Page, office: keyof typeof assignments) {
  const buttons = page.getByTestId(/^product-frame-[^-]+$/);
  await expect(buttons).toHaveCount(3);
  for (const item of assignments[office]) {
    const frame = page.getByTestId(`product-frame-${item.id}`);
    await expect(frame).toHaveAttribute("data-frame-style", "cinematic-next");
    await expect(frame).toHaveAttribute("data-mobile-fallback", "framed-wall-art");
    await expect(frame).toHaveAttribute("data-surface", item.placement.surface);
    await expect(frame).toHaveAttribute("data-position", `${item.placement.position.x},${item.placement.position.y},${item.placement.position.z}`);
    await expect(frame).toHaveAttribute("data-scale", String(item.placement.scale));
    await expect(frame).toHaveAttribute("data-orientation", "0,0,0");
    await expect(frame).toHaveAttribute("data-launch-behavior", item.launchBehavior);
  }
}

test.describe("desktop product frame regression", () => {
  test.skip(({ isMobile }) => isMobile);

  test("renders Atlas placement, styling, focus copy, and safe activation modes", async ({ page, context }) => {
    await mockOfficeProducts(page);
    await page.addInitScript(() => {
      (window as typeof window & { __openedProductUrls?: unknown[][] }).__openedProductUrls = [];
      window.open = (...args) => {
        (window as typeof window & { __openedProductUrls: unknown[][] }).__openedProductUrls.push(args);
        return null;
      };
    });
    await page.goto("http://127.0.0.1:4173/atlas");
    await expectPlacementContract(page, "atlas");

    const strategy = page.getByTestId("product-frame-strategy");
    await strategy.focus();
    await expect(page.getByTestId("product-frame-description-strategy")).toContainText("same-tab product assignment");
    await expect(page).toHaveScreenshot("atlas-product-frames.png");

    await context.route("https://safe.test/**", (route) => route.fulfill({ contentType: "text/html", body: "<title>Safe test destination</title>" }));
    await page.getByTestId("product-frame-studio").click({ force: true });
    await expect.poll(() => page.evaluate(() => (window as typeof window & { __openedProductUrls: unknown[][] }).__openedProductUrls)).toEqual([
      ["https://safe.test/new-tab", "_blank", "noopener,noreferrer"],
    ]);

    await page.getByTestId("product-frame-vault").evaluate((button: HTMLButtonElement) => button.click());
    const dialog = page.getByRole("dialog", { name: "Atlas vault" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("iframe")).toHaveAttribute("src", "https://safe.test/embedded");
    await dialog.getByRole("button", { name: "Close" }).click();

    await strategy.evaluate((button: HTMLButtonElement) => button.click());
    await expect(page).toHaveURL("https://safe.test/same-tab");
  });

  test("renders representative frames in Meme's themed office", async ({ page }) => {
    await mockOfficeProducts(page);
    await page.goto("/office/meme");
    await expectPlacementContract(page, "meme");
    await page.getByTestId("product-frame-creative").focus();
    await expect(page.getByTestId("product-frame-description-creative")).toContainText("new-tab product assignment");
    await expect(page).toHaveScreenshot("meme-product-frames.png");
  });
});

test.describe("mobile product frame fallback", () => {
  test.skip(({ isMobile }) => !isMobile);

  test("keeps themed-office frames touchable without precise 3D selection", async ({ page }) => {
    await mockOfficeProducts(page, true);
    await page.goto("/office/meme");
    const frame = page.getByTestId("product-frame-campaign");
    await expect(frame).toHaveAttribute("data-mobile-fallback", "framed-wall-art", { timeout: 15_000 });
    await expect(frame).toHaveAttribute("data-position", "-2.2,2.55,-4.82");
    await expect(frame).toHaveAttribute("data-scale", "0.64");
    const box = await frame.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(48);
    expect(box?.height).toBeGreaterThanOrEqual(48);
    await frame.focus();
    await expect(page.getByTestId("product-frame-description-campaign")).toBeVisible();
    await expect(page).toHaveScreenshot("meme-product-frames-mobile.png");
  });
});