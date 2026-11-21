import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:3000';
const shot = (page, name) => page.screenshot({ path: `/downloads/${name}.png`, fullPage: true });

async function clickButton(page, text) {
  const ok = await page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }, text);
  if (!ok) throw new Error(`button not found: ${text}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function type(page, selector, value) {
  await page.waitForSelector(selector, { visible: true, timeout: 8000 });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, value);
}

async function register(page, name, email) {
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle0' });
  await type(page, '#name', name);
  await type(page, '#email', email);
  await type(page, '#password', 'password123');
  await clickButton(page, 'Create account');
  await page.waitForFunction(() => location.pathname === '/projects', { timeout: 10000 });
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
});

try {
  const ctxA = await browser.createBrowserContext();
  const ctxB = await browser.createBrowserContext();
  const alice = await ctxA.newPage();
  const bob = await ctxB.newPage();
  await alice.setViewport({ width: 1440, height: 900 });
  await bob.setViewport({ width: 1440, height: 900 });

  console.log('1. register Bob');
  await register(bob, 'Bob', 'bob@example.com');
  console.log('2. register Alice');
  await register(alice, 'Alice', 'alice@example.com');
  await shot(alice, 'pp-ui-empty-projects');

  console.log('3. Alice creates project via UI');
  await clickButton(alice, '+ New project');
  await type(alice, 'input[placeholder="Product Launch"]', 'Product Launch');
  await type(alice, 'textarea', 'Launch the new product line with the whole team.');
  await clickButton(alice, 'Create project');
  await alice.waitForFunction(() => /\/projects\/.+/.test(location.pathname), { timeout: 10000 });
  await sleep(1200);
  const projectUrl = alice.url();
  const projectId = projectUrl.split('/projects/')[1].split('/')[0];
  console.log('   project', projectId);

  console.log('4. Alice adds Bob via Members tab');
  await alice.goto(`${BASE}/projects/${projectId}/members`, { waitUntil: 'networkidle0' });
  await type(alice, 'input[placeholder="teammate@example.com"]', 'bob@example.com');
  await clickButton(alice, 'Add');
  await alice.waitForFunction(() => document.body.innerText.includes('Bob added to the project'), { timeout: 8000 });

  console.log('5. Alice creates task via UI');
  await alice.goto(`${BASE}/projects/${projectId}`, { waitUntil: 'networkidle0' });
  await clickButton(alice, '+ Add task');
  await type(alice, 'input[placeholder="Short task name"]', 'Develop Landing Page');
  await type(alice, 'textarea[placeholder*="Details"]', 'Build the marketing landing page with the new hero.');
  await alice.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    const [prio, assignee] = dlg.querySelectorAll('select');
    const setVal = (sel, pred) => {
      const opt = [...sel.options].find(pred);
      sel.value = opt.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setVal(prio, (o) => o.value === 'HIGH');
    setVal(assignee, (o) => o.textContent === 'Bob');
  });
  await clickButton(alice, 'Create task');
  await alice.waitForFunction(() => document.body.innerText.includes('Develop Landing Page'), { timeout: 8000 });
  await sleep(600);
  await shot(alice, 'pp-ui-board-desktop');

  console.log('6. Bob opens the shared board');
  await bob.goto(`${BASE}/projects/${projectId}`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  const bobSeesTodo = await bob.evaluate(() => {
    const col = document.querySelector('section[aria-label="To Do column"]');
    return col ? col.innerText.includes('Develop Landing Page') : false;
  });
  console.log('   Bob sees task in To Do:', bobSeesTodo);
  if (!bobSeesTodo) throw new Error('Bob does not see the task');

  console.log('7. REAL-TIME: Alice moves it to In Progress; Bob watches (no reload)');
  const bobNav = bob.evaluate(() => performance.getEntriesByType('navigation').length);
  await alice.evaluate(async (pid) => {
    const tasks = await (await fetch(`/api/projects/${pid}/tasks`)).json();
    const t = tasks.data[0];
    await fetch(`/api/projects/${pid}/tasks/${t.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS', position: 2048 }),
    });
  }, projectId);
  await sleep(1500);
  const bobSeesInProgress = await bob.evaluate(() => {
    const col = document.querySelector('section[aria-label="In Progress column"]');
    return col ? col.innerText.includes('Develop Landing Page') : false;
  });
  const bobNavAfter = await bob.evaluate(() => performance.getEntriesByType('navigation').length);
  console.log('   Bob sees it in In Progress:', bobSeesInProgress, '| page navigations unchanged:', bobNav === bobNavAfter);
  if (!bobSeesInProgress) throw new Error('real-time update did not reach Bob');
  await shot(bob, 'pp-ui-realtime-bob');

  console.log('8. Bob comments on the task');
  await bob.evaluate(() => {
    const card = [...document.querySelectorAll('section[aria-label="In Progress column"] [role="button"]')]
      .find((c) => c.innerText.includes('Develop Landing Page'));
    card.click();
  });
  await sleep(1200);
  await type(bob, 'input[placeholder="Write a comment…"]', 'Started working on the hero section.');
  await clickButton(bob, 'Send');
  await bob.waitForFunction(() => document.body.innerText.includes('Started working on the hero section.'), { timeout: 8000 });
  await shot(bob, 'pp-ui-task-modal');

  console.log('9. Activity tab shows history');
  await clickButton(bob, 'Activity');
  await sleep(800);
  await shot(bob, 'pp-ui-activity');
  await bob.keyboard.press('Escape');

  console.log('10. Dashboard');
  await alice.goto(`${BASE}/projects/${projectId}/dashboard`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await shot(alice, 'pp-ui-dashboard');

  console.log('11. Members page');
  await alice.goto(`${BASE}/projects/${projectId}/members`, { waitUntil: 'networkidle0' });
  await sleep(600);
  await shot(alice, 'pp-ui-members');

  console.log('12. Mobile board (390px)');
  await alice.setViewport({ width: 390, height: 844 });
  await alice.goto(`${BASE}/projects/${projectId}`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await shot(alice, 'pp-ui-board-mobile');

  console.log('13. Login page visual');
  const anon = await browser.newPage();
  await anon.setViewport({ width: 1440, height: 900 });
  await anon.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await shot(anon, 'pp-ui-login');

  console.log('UI E2E PASSED');
} finally {
  await browser.close();
}
