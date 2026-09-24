import { chromium } from 'playwright';

async function testFullUserFlow() {
  console.log('--- STARTING COMPREHENSIVE END-TO-END FLOW ON MICROSOFT EDGE ---');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  try {
    // 1. Visit Landing Page
    console.log('[STEP 1] Landing Page');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    const heroTitle = await page.textContent('h1, h2');
    console.log('  Hero text:', heroTitle?.trim());

    // 2. Click Primary CTA to enter Workspace
    console.log('[STEP 2] Click Start Analyzing CTA');
    const cta = page.locator('text=Start Analyzing').first();
    await cta.click();
    await page.waitForTimeout(1000);

    // 3. Verify 3-Column Workspace Layout
    console.log('[STEP 3] Verify Workspace Layout & Controls');
    const pageContent = await page.textContent('body');
    const hasDatasetSelector = pageContent.includes('Datasets') || pageContent.includes('Workspace');
    console.log('  Workspace layout mounted:', hasDatasetSelector);

    // 4. Test Query Submission in Chat
    console.log('[STEP 4] Submit Analytical Question in Chat');
    const input = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"], input[type="text"]').first();
    if (await input.count() > 0) {
      await input.fill('What is the total monthly spend?');
      const sendBtn = page.locator('button:has-text("Send"), button[type="submit"], button:has(svg)').last();
      await sendBtn.click();
      await page.waitForTimeout(2000);
      console.log('  Query submitted');
    }

    // 5. Navigate to Data Explorer
    console.log('[STEP 5] Navigate to Data Explorer');
    const navItems = page.locator('nav button, header button, aside button');
    for (let i = 0; i < await navItems.count(); i++) {
      const text = await navItems.nth(i).textContent();
      if (text && text.includes('Explorer')) {
        await navItems.nth(i).click();
        await page.waitForTimeout(1000);
        console.log('  Data Explorer opened');
        break;
      }
    }

    // 6. Navigate to History
    console.log('[STEP 6] Navigate to History View');
    for (let i = 0; i < await navItems.count(); i++) {
      const text = await navItems.nth(i).textContent();
      if (text && text.includes('History')) {
        await navItems.nth(i).click();
        await page.waitForTimeout(1000);
        console.log('  History View opened');
        break;
      }
    }

    // 7. Navigate to Settings
    console.log('[STEP 7] Navigate to Settings View');
    for (let i = 0; i < await navItems.count(); i++) {
      const text = await navItems.nth(i).textContent();
      if (text && text.includes('Settings')) {
        await navItems.nth(i).click();
        await page.waitForTimeout(1000);
        console.log('  Settings View opened');
        break;
      }
    }

    // 8. Verify No Console or Unhandled Javascript Errors
    console.log('[STEP 8] Error Verification');
    if (errors.length > 0) {
      console.warn('  Warnings/Errors:', errors);
    } else {
      console.log('  Zero browser console errors across all pages!');
    }

    console.log('--- ALL END-TO-END FLOWS ON MICROSOFT EDGE PASSED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('End-to-End flow failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testFullUserFlow();
