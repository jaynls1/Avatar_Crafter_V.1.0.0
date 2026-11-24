import { expect, test, type Page } from "@playwright/test";

const SYNTHETIC_OFFICE_SLUG = "nova";
const SYNTHETIC_DESTINATION = "https://synthetic.next.test/destinations/track-a";
const SYNTHETIC_FRAME_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Track A only: these records are intentionally synthetic and do not represent
 * a Command Core office or product assignment. They exercise the renderer
 * contract at the browser boundary without reading any external service.
 */
const SYNTHETIC_OFFICE_PRODUCTS = {
  contractVersion: 1,
  officeSlug: SYNTHETIC_OFFICE_SLUG,
  presentation: "framed-wall-art",
  framedWallArt: [
    {
      id: SYNTHETIC_FRAME_ID,
      type: "framed-product-art",
      mediaUrl: "https://synthetic.next.test/assets/nova-track-a.svg",
      accessibleName: "[SYNTHETIC] Nova Track A tool",
      shortDescription: "[SYNTHETIC] Renderer-only Track A frame; not a Command Core assignment.",
      destinationUrl: SYNTHETIC_DESTINATION,
      launchBehavior: "new-tab",
      accessLevel: "member",
      placement: {
        surface: "north-wall",
        position: { x: 0, y: 2.7, z: -5.82 },
        scale: 0.72,
        orientation: { x: 0, y: 0, z: 0 },
        displayOrder: 0,
      },
      frame: { style: "cinematic-next", interaction: "focus-or-activate" },
      mobileFallback: { style: "framed-wall-art", preciseSelectionRequired: false },
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      type: "framed-product-art",
      mediaUrl: "https://synthetic.next.test/assets/unsafe-destination.svg",
      accessibleName: "[SYNTHETIC] Unsafe destination",
      shortDescription: "[SYNTHETIC] Must be rejected by HTTPS validation.",
      destinationUrl: "javascript:alert(1)",
      launchBehavior: "same-tab",
      accessLevel: "member",
      placement: {
        surface: "north-wall",
        position: { x: -2, y: 2.7, z: -5.82 },
        scale: 0.72,
        orientation: { x: 0, y: 0, z: 0 },
        displayOrder: 1,
      },
      frame: { style: "cinematic-next", interaction: "focus-or-activate" },
      mobileFallback: { style: "framed-wall-art", preciseSelectionRequired: false },
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      type: "framed-product-art",
      mediaUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      accessibleName: "[SYNTHETIC] Invalid media",
      shortDescription: "[SYNTHETIC] Must be rejected because the media URL is not HTTPS.",
      destinationUrl: "https://synthetic.next.test/destinations/invalid-media",
      launchBehavior: "new-tab",
      accessLevel: "member",
      placement: {
        surface: "north-wall",
        position: { x: 2, y: 2.7, z: -5.82 },
        scale: 0.72,
        orientation: { x: 0, y: 0, z: 0 },
        displayOrder: 2,
      },
      frame: { style: "cinematic-next", interaction: "focus-or-activate" },
      mobileFallback: { style: "framed-wall-art", preciseSelectionRequired: false },
    },
    {
      id: "00000000-0000-4000-8000-000000000004",
      type: "framed-product-art",
      mediaUrl: "https://synthetic.next.test/assets/blocked-launch.svg",
      accessibleName: "[SYNTHETIC] Unsupported launch behavior",
      shortDescription: "[SYNTHETIC] Must remain inert because the launch mode is unsupported.",
      destinationUrl: "https://synthetic.next.test/destinations/blocked",
      launchBehavior: "blocked",
      accessLevel: "member",
      placement: {
        surface: "north-wall",
        position: { x: 4, y: 2.7, z: -5.82 },
        scale: 0.72,
        orientation: { x: 0, y: 0, z: 0 },
        displayOrder: 3,
      },
      frame: { style: "cinematic-next", interaction: "focus-or-activate" },
      mobileFallback: { style: "framed-wall-art", preciseSelectionRequired: false },
    },
  ],
};

async function mockSyntheticNovaProducts(page: Page) {
  await page.route("**/api/office-products/nova", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(SYNTHETIC_OFFICE_PRODUCTS),
    });
  });

  await page.route("https://synthetic.next.test/assets/**", async (route) => {
    const label = route.request().url().split("/").at(-1)?.replace(".svg", "") ?? "track-a";
    await route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="100%" height="100%" fill="#07111f"/><rect x="18" y="18" width="604" height="384" rx="18" fill="none" stroke="#4a9eff" stroke-width="12"/><text x="320" y="195" fill="#fff" font-family="sans-serif" font-size="36" text-anchor="middle">[SYNTHETIC]</text><text x="320" y="245" fill="#8bd4ff" font-family="sans-serif" font-size="24" text-anchor="middle">${label}</text></svg>`,
    });
  });

  await page.addInitScript(() => {
    (window as typeof window & { __syntheticOpenedUrls?: unknown[][] }).__syntheticOpenedUrls = [];
    Object.defineProperty(window, "open", {
      configurable: true,
      value: (...args: unknown[]) => {
        (window as typeof window & { __syntheticOpenedUrls: unknown[][] }).__syntheticOpenedUrls.push(args);
        return null;
      },
    });
  });
}

async function expectOnlyValidSyntheticFrame(page: Page) {
  await expect(page.getByTestId(/^product-frame-/)).toHaveCount(1);
  await expect(page.getByTestId(`product-frame-${SYNTHETIC_FRAME_ID}`)).toBeVisible();
  await expect(page.getByTestId("product-frame-00000000-0000-4000-8000-000000000002")).toHaveCount(0);
  await expect(page.getByTestId("product-frame-00000000-0000-4000-8000-000000000003")).toHaveCount(0);
  await expect(page.getByTestId("product-frame-00000000-0000-4000-8000-000000000004")).toHaveCount(0);
}

test.describe("Track A — synthetic Nova framed-tool renderer", () => {
  test.skip(({ isMobile }) => isMobile);

  test("renders the valid synthetic frame and supports keyboard/new-tab activation", async ({ page }, testInfo) => {
    await mockSyntheticNovaProducts(page);
    await page.goto("/office/nova");

    await expectOnlyValidSyntheticFrame(page);
    const frame = page.getByTestId(`product-frame-${SYNTHETIC_FRAME_ID}`);
    await expect(frame).toHaveAttribute("data-frame-style", "cinematic-next");
    await expect(frame).toHaveAttribute("data-mobile-fallback", "framed-wall-art");
    await expect(frame).toHaveAttribute("data-surface", "north-wall");
    await expect(frame).toHaveAttribute("data-position", "0,2.7,-5.82");
    await expect(frame).toHaveAttribute("data-scale", "0.72");
    await expect(frame).toHaveAttribute("data-orientation", "0,0,0");
    await expect(frame).toHaveAttribute("data-launch-behavior", "new-tab");

    await frame.focus();
    await expect(page.getByTestId(`product-frame-description-${SYNTHETIC_FRAME_ID}`)).toContainText("[SYNTHETIC]");
    await frame.press("Enter");
    await expect.poll(() => page.evaluate(() => (window as typeof window & { __syntheticOpenedUrls: unknown[][] }).__syntheticOpenedUrls)).toEqual([
      [SYNTHETIC_DESTINATION, "_blank", "noopener,noreferrer"],
    ]);

    await page.screenshot({ path: testInfo.outputPath("nova-track-a-synthetic-desktop.png"), fullPage: true });
  });
});

test.describe("Track A — synthetic Nova touch fallback", () => {
  test.skip(({ isMobile }) => !isMobile);

  test("keeps the valid frame touchable and launches only the permitted destination", async ({ page }, testInfo) => {
    await mockSyntheticNovaProducts(page);
    await page.goto("/office/nova");

    await expectOnlyValidSyntheticFrame(page);
    const frame = page.getByTestId(`product-frame-${SYNTHETIC_FRAME_ID}`);
    await expect(frame).toHaveAttribute("data-mobile-fallback", "framed-wall-art");
    await expect(frame).toHaveAttribute("data-launch-behavior", "new-tab");

    await frame.tap();
    await expect.poll(() => page.evaluate(() => (window as typeof window & { __syntheticOpenedUrls: unknown[][] }).__syntheticOpenedUrls)).toEqual([
      [SYNTHETIC_DESTINATION, "_blank", "noopener,noreferrer"],
    ]);

    await page.screenshot({ path: testInfo.outputPath("nova-track-a-synthetic-mobile.png"), fullPage: true });
  });
});
