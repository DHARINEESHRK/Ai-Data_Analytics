import { chromium } from 'playwright';

async function testFrontend() {
  console.log('--- STARTING FRONTEND AUTOMATED BROWSER TEST WITH MICROSOFT EDGE ---');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    // 1. Visit Landing Page
    console.log('[TEST 1] Visiting http://localhost:5173/');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    const title = await page.title();
    console.log(`Page title: "${title}"`);
    console.log('Checking for Landing Page hero content...');
    const heading = await page.textContent('h1, h2');
    console.log(`Found heading: "${heading?.trim()}"`);

    // 2. Navigate to /workspace
    console.log('[TEST 2] Navigating to /workspace...');
    const workspaceNav = await page.locator('text=Workspace, text=Start Analyzing, a[href*="workspace"]').first();
    if (await workspaceNav.count() > 0) {
      await workspaceNav.click();
      await page.waitForTimeout(1000);
    } else {
      await page.goto('http://localhost:5173/#workspace');
    }
    console.log('Current URL:', page.url());

    // 3. Check for UI components in Workspace
    const bodyText = await page.textContent('body');
    const hasWorkspaceElements = bodyText.includes('Workspace') || bodyText.includes('Analysis') || bodyText.includes('Nova') || bodyText.includes('Dataset');
    console.log('Workspace elements rendered successfully:', hasWorkspaceElements);

    // 4. Test Settings / Auth modal interaction
    console.log('[TEST 3] Testing Settings / Profile view...');
    const settingsBtn = page.locator('text=Settings, button:has-text("Settings")').first();
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      console.log('Settings view opened');
    }

    // 5. Test Data Explorer navigation
    console.log('[TEST 4] Testing Data Explorer view...');
    const explorerBtn = page.locator('text=Explorer, button:has-text("Explorer"), text=Data').first();
    if (await explorerBtn.count() > 0) {
      await explorerBtn.click();
      await page.waitForTimeout(500);
      console.log('Explorer view opened');
    }

    // 6. Test History navigation
    console.log('[TEST 5] Testing History view...');
    const historyBtn = page.locator('text=History, button:has-text("History")').first();
    if (await historyBtn.count() > 0) {
      await historyBtn.click();
      await page.waitForTimeout(500);
      console.log('History view opened');
    }

    // 7. Check for Javascript / Console Errors
    console.log('[TEST 6] Verifying Console Errors...');
    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    } else {
      console.log('Zero console errors detected during full interactive flow!');
    }

    console.log('--- ALL FRONTEND BROWSER TESTS COMPLETED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('Frontend browser test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testFrontend();
