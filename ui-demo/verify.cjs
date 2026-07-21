const { chromium } = require('playwright');
const baseUrl = process.env.SIEVOX_DEMO_URL || 'http://127.0.0.1:4175/ui-demo/';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const errors = [];

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on('pageerror', (error) => errors.push(`desktop: ${error.message}`));
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
  assert(await desktop.locator('.login-view').isVisible(), 'Desktop login is not visible');
  assert(await desktop.locator('.institution-mark img').evaluate((image) => image.complete && image.naturalWidth > 0), 'Login logo failed to load');
  await desktop.locator('.login-panel [data-action="toggle-theme-panel"]').click();
  await desktop.locator('[data-theme-color="purple"]').click();
  await desktop.locator('html[data-color="purple"]').waitFor();
  await desktop.reload({ waitUntil: 'networkidle' });
  assert(await desktop.locator('html[data-color="purple"]').count() === 1, 'Palette preference was not persisted');
  await desktop.locator('.login-panel [data-action="toggle-theme-panel"]').click();
  await desktop.waitForTimeout(250);
  await desktop.locator('[data-theme-mode="dark"]').click();
  await desktop.waitForTimeout(250);
  await desktop.locator('html[data-theme="dark"]').waitFor();
  await desktop.screenshot({ path: 'ui-demo/login-dark-demo.png', fullPage: true });
  await desktop.locator('[data-theme-mode="light"]').click();
  await desktop.locator('[data-theme-color="blue"]').click();
  await desktop.waitForTimeout(250);
  await desktop.screenshot({ path: 'ui-demo/login-palette-demo.png', fullPage: true });
  await desktop.locator('[data-action="close-theme-panel"]').click();
  await desktop.waitForTimeout(250);
  assert(!(await desktop.locator('.theme-panel').isVisible()), 'Theme panel failed to close');
  await desktop.screenshot({ path: 'ui-demo/login-demo.png', fullPage: true });
  await desktop.locator('#demo-login-form').getByRole('button', { name: '进入权益反馈系统' }).click();
  await desktop.locator('body:not(.auth-active)').waitFor();
  assert(await desktop.locator('.desktop-shell').isVisible(), 'Desktop shell is not visible');
  assert(await desktop.locator('.brand-lockup img').evaluate((image) => image.complete && image.naturalWidth > 0), 'Desktop logo failed to load');
  assert(await desktop.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Desktop page has horizontal overflow');
  await desktop.locator('body:not(.app-entering)').waitFor();
  assert(await desktop.locator('[data-student-page="dashboard"] .page-heading').evaluate((element) => getComputedStyle(element).opacity === '1'), 'Student content remained transparent after entrance');
  await desktop.screenshot({ path: 'ui-demo/desktop-demo.png', fullPage: true });

  await desktop.getByRole('button', { name: '管理端' }).click();
  assert(await desktop.getByRole('heading', { name: '权益事务处理台' }).isVisible(), 'Admin role switch failed');
  await desktop.locator('body:not(.app-entering)').waitFor();
  await desktop.screenshot({ path: 'ui-demo/admin-demo.png', fullPage: true });

  await desktop.getByRole('button', { name: '学生端' }).click();
  await desktop.getByRole('button', { name: '发起新反馈' }).click();
  assert(await desktop.locator('.compose-drawer.is-open').isVisible(), 'Desktop compose drawer failed to open');
  await desktop.locator('.compose-drawer [data-action="close-overlays"]').first().click();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  mobile.on('pageerror', (error) => errors.push(`mobile: ${error.message}`));
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  assert(await mobile.locator('.login-view').isVisible(), 'Mobile login is not visible');
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Mobile login has horizontal overflow');
  await mobile.screenshot({ path: 'ui-demo/mobile-login-demo.png', fullPage: true });
  await mobile.locator('#demo-login-form').getByRole('button', { name: '进入权益反馈系统' }).click();
  await mobile.locator('body:not(.auth-active)').waitFor();
  assert(await mobile.locator('.mobile-shell').isVisible(), 'Mobile shell is not visible');
  assert(await mobile.locator('.mobile-brand img').evaluate((image) => image.complete && image.naturalWidth > 0), 'Mobile logo failed to load');
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Mobile page has horizontal overflow');
  await mobile.waitForTimeout(1450);
  await mobile.screenshot({ path: 'ui-demo/mobile-demo.png', fullPage: true });

  await mobile.locator('[data-action="open-mobile-compose"]').click();
  await mobile.waitForTimeout(450);
  const sheetState = await mobile.locator('.mobile-sheet').evaluate((sheet) => ({
    className: sheet.className,
    display: getComputedStyle(sheet).display,
    visibility: getComputedStyle(sheet).visibility,
    top: sheet.getBoundingClientRect().top,
    height: sheet.getBoundingClientRect().height
  }));
  assert(sheetState.className.includes('is-open') && sheetState.visibility === 'visible' && sheetState.top < 844, `Mobile compose sheet failed to open: ${JSON.stringify(sheetState)}`);
  await mobile.screenshot({ path: 'ui-demo/mobile-compose-demo.png', fullPage: true });

  const reduced = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  reduced.on('pageerror', (error) => errors.push(`reduced-motion: ${error.message}`));
  await reduced.goto(baseUrl, { waitUntil: 'networkidle' });
  await reduced.locator('.login-panel [data-action="toggle-theme-panel"]').click();
  await reduced.locator('[data-theme-color="teal"]').click();
  await reduced.locator('html[data-color="teal"]').waitFor();
  await reduced.locator('[data-action="close-theme-panel"]').click();
  await reduced.locator('#demo-login-form').getByRole('button', { name: '进入权益反馈系统' }).click();
  await reduced.locator('body:not(.auth-active)').waitFor();
  assert(await reduced.locator('.desktop-shell').isVisible(), 'Reduced-motion login flow failed');

  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  await browser.close();
  console.log('SIEVOX demo verification passed: desktop, admin, mobile, and compose flows.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
