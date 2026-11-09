import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
test.use({ storageState: { cookies: [], origins: [{ origin: 'http://127.0.0.1:3000', localStorage: [{ name: 'local-map-locale', value: 'ko' }] }] } });

test('390px layout has no horizontal overflow and mobile actions stay reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.recommend-trigger')).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    main: document.querySelector('main')?.scrollWidth,
    header: document.querySelector('header')?.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
  expect(widths.main).toBeLessThanOrEqual(widths.viewport);
  expect(widths.header).toBeLessThanOrEqual(widths.viewport);

  const undersizedControls = await page.locator('button:visible, a:visible, input:visible, select:visible, summary:visible').evaluateAll(elements =>
    elements.flatMap(element => {
      const { width, height } = element.getBoundingClientRect();
      return width < 44 || height < 44
        ? [{ tag: element.tagName, label: (element.textContent || element.getAttribute('aria-label') || '').trim(), width, height }]
        : [];
    }),
  );
  expect(undersizedControls, JSON.stringify(undersizedControls)).toEqual([]);

  const trigger = page.locator('.recommend-trigger');
  await expect(trigger).toHaveCSS('min-height', '48px');
  const mapControls = await page.locator('.map-overview, .recommend-trigger').evaluateAll(elements =>
    elements.map(element => ({
      className: (element as HTMLElement).className,
      zIndex: Number(getComputedStyle(element).zIndex),
      height: element.getBoundingClientRect().height,
    })),
  );
  expect(mapControls.every(control => control.zIndex > 21 && control.height >= 44)).toBeTruthy();
  const positionedControls = await page.locator('.map-share-actions, .map-overview, .recommend-trigger').evaluateAll(elements =>
    elements.map(element => {
      const { x, y, right, bottom } = element.getBoundingClientRect();
      return { x, y, right, bottom };
    }),
  );
  for (let left = 0; left < positionedControls.length; left += 1) {
    for (let right = left + 1; right < positionedControls.length; right += 1) {
      const a = positionedControls[left];
      const b = positionedControls[right];
      expect(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y).toBeTruthy();
    }
  }

  await page.getByRole('button', { name: '전체 지도 QR' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.share-qr')).toBeVisible();
  await page.getByRole('button', { name: 'QR 코드 닫기' }).click();

  await expect(page.locator('.language-switch button').nth(1)).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.language-switch button').nth(1).click();
  await expect(page.locator('main')).toHaveAttribute('lang', 'en');
  const englishWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(englishWidths.document).toBeLessThanOrEqual(englishWidths.viewport);
  expect(englishWidths.body).toBeLessThanOrEqual(englishWidths.viewport);
  await page.locator('.language-switch button').nth(0).click();
  await expect(page.locator('main')).toHaveAttribute('lang', 'ko');

});
