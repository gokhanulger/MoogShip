import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';

puppeteer.use(StealthPlugin());

const EMAIL = 'info@moogship.com';
const PASSWORD = 'Sr07cn02ak88!';

async function main() {
  console.log('Opening browser - please solve CAPTCHA and login...');
  console.log('After login, navigate to the price calculator.');
  console.log('Then press ENTER in this terminal to capture the form.\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Go to login
  await page.goto('https://ship.navlungo.com/ship/priceCalculator', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Fill login form if on login page
  try {
    await page.waitForSelector('#login-email', { timeout: 5000 });
    await page.type('#login-email', EMAIL, { delay: 50 });
    await page.type('#login-password', PASSWORD, { delay: 50 });
    console.log('Login form filled. Please solve CAPTCHA and click login button.\n');
  } catch (e) {
    console.log('Not on login page or already logged in.\n');
  }

  // Wait for user to press enter
  console.log('>>> Press ENTER when you are on the price calculator page... <<<\n');
  await new Promise<void>(resolve => {
    process.stdin.once('data', () => resolve());
  });

  console.log('Capturing form structure...');

  // Screenshot
  await page.screenshot({ path: '/tmp/navlungo-calc.png', fullPage: true });
  console.log('Screenshot saved: /tmp/navlungo-calc.png');

  // Current URL
  console.log('Current URL:', page.url());

  // Get ALL elements that could be form inputs
  const formInfo = await page.evaluate(() => {
    const selectors = [
      'input',
      'select',
      'button',
      'textarea',
      '[role="combobox"]',
      '[role="listbox"]',
      '[role="button"]',
      '[class*="MuiAutocomplete"]',
      '[class*="MuiSelect"]',
      '[class*="MuiTextField"]',
      '[class*="select"]',
      '[class*="input"]',
      '[class*="dropdown"]',
      '[data-testid]',
      '[aria-label]'
    ];

    const elements = document.querySelectorAll(selectors.join(', '));
    const seen = new Set();

    return Array.from(elements)
      .filter(el => {
        const key = el.outerHTML.slice(0, 100);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(el => ({
        tag: el.tagName,
        type: (el as HTMLInputElement).type || '',
        name: (el as HTMLInputElement).name || '',
        id: el.id || '',
        class: el.className?.toString() || '',
        placeholder: (el as HTMLInputElement).placeholder || el.getAttribute('placeholder') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        role: el.getAttribute('role') || '',
        dataTestId: el.getAttribute('data-testid') || '',
        text: el.textContent?.trim().slice(0, 100) || '',
        outerHTML: el.outerHTML.slice(0, 200)
      }));
  });

  console.log('\n=== FORM ELEMENTS (' + formInfo.length + ') ===\n');
  formInfo.forEach((el, i) => {
    if (el.ariaLabel || el.placeholder || el.dataTestId || el.name ||
        el.text.toLowerCase().includes('country') ||
        el.text.toLowerCase().includes('weight') ||
        el.text.toLowerCase().includes('ülke') ||
        el.text.toLowerCase().includes('ağırlık') ||
        el.class.toLowerCase().includes('country') ||
        el.class.toLowerCase().includes('weight')) {
      console.log(i + ':', JSON.stringify(el, null, 2));
      console.log('---');
    }
  });

  // Save HTML
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('/tmp/navlungo-calc.html', html);
  console.log('\nFull HTML saved: /tmp/navlungo-calc.html');

  console.log('\nDone! Closing browser...');
  await browser.close();
}

main().catch(console.error);
