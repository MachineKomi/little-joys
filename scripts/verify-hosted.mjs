import { chromium, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const project = new URL('../', import.meta.url);
const dist = new URL('dist/', project);
const check = (condition, code) => { if (!condition) throw new Error(code); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const toys = [
  { name: 'Squishy Friend', id: 'squishy' },
  { name: 'Bubble Pond', id: 'bubbles' },
  { name: 'Roll & Nest', id: 'nest' },
  { name: 'Penguin Bounce', id: 'bounce' },
];

async function workerStatus(page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const worker = navigator.serviceWorker.controller || registration?.active;
    if (!worker || worker.state !== 'activated') return null;
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => { channel.port1.close(); channel.port2.close(); resolve(null); }, 3000);
      channel.port1.onmessage = event => {
        clearTimeout(timeout); channel.port1.close(); channel.port2.close();
        const value = event.data;
        resolve(value?.type === 'CACHE_STATUS' ? { ready: value.ready, buildId: value.buildId, version: value.version } : null);
      };
      worker.postMessage({ type: 'VERIFY_CACHE' }, [channel.port2]);
    });
  });
}
async function parents(page) {
  await page.getByRole('button', { name: 'Open parent settings', exact: true }).press('Enter');
  await expect(page.getByRole('dialog', { name: 'Parent settings', exact: true })).toBeVisible();
}
async function inspectParentStatus(page, expectedBuild) {
  await parents(page);
  await expect(page.getByRole('switch', { name: 'Toy sounds', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('switch', { name: 'Background music', exact: true })).toHaveAttribute('aria-checked', 'false');
  for (const label of ['Motion', 'Bubbles', 'Balls', 'Ball control', 'Bouncing balls', 'Open with']) await expect(page.getByRole('combobox', { name: label, exact: true })).toBeVisible();
  await expect(page.getByRole('slider', { name: /Sound effect level/ })).toBeVisible();
  await expect(page.getByRole('slider', { name: /Music level/ })).toBeVisible();
  await expect(page.getByText('Offline ready', { exact: true })).toBeVisible({ timeout: 20_000 });
  await page.getByText('Technical status', { exact: true }).click();
  const status = JSON.parse(await page.locator('.runtime-status').innerText());
  check(status.buildId === expectedBuild, 'RUNTIME_BUILD_LABEL_MISMATCH');
  check(status.residentImages === 6, 'RUNTIME_ART_INCOMPLETE');
  check(status.pointers === 0 && status.voices === 0, 'RUNTIME_RESOURCES_NOT_IDLE');
  check(status.audioEnabled === false && status.musicEnabled === false && status.musicElements === 0, 'FRESH_SESSION_NOT_SILENT');
  check(status.canvasPixels > 0 && status.canvasPixels <= 2_000_000, 'CANVAS_BUDGET_EXCEEDED');
  await page.getByRole('button', { name: 'Close parent settings', exact: true }).click();
}
async function useEveryToy(page) {
  for (const toy of toys) {
    await page.getByRole('button', { name: 'Toybox', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Toybox', exact: true })).toBeVisible();
    await page.getByRole('button', { name: toy.name, exact: true }).click();
    const canvas = page.getByTestId('play-canvas');
    await expect(canvas).toHaveAttribute('data-toy', toy.id);
    await expect(canvas).toHaveAttribute('data-art', '6');
    const bounds = await canvas.boundingBox(); check(bounds, 'CANVAS_BOUNDS_UNAVAILABLE');
    // Real mouse pointer handlers exercise each toy; synthetic multi-touch and
    // physical iPad behavior are covered separately, never inferred here.
    await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5);
    await page.mouse.down();
    await expect(canvas).toHaveAttribute('data-pointers', '1');
    await page.mouse.move(bounds.x + bounds.width * .58, bounds.y + bounds.height * .48, { steps: 3 });
    await page.mouse.up();
    await expect(canvas).toHaveAttribute('data-pointers', '0');
    await expect(page.getByRole('button', { name: 'Sound is muted', exact: true })).toBeVisible();
  }
}

async function main() {
  check(process.argv.length === 3, 'USAGE: node .local/verify-hosted.mjs https://public-deployment.example/');
  let url;
  try { url = new URL(process.argv[2]); } catch { throw new Error('INVALID_PUBLIC_URL'); }
  check(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'REQUIRE_PUBLIC_HTTPS_ROOT_URL_WITHOUT_CREDENTIALS_OR_QUERY');
  check(!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'PUBLIC_HOST_REQUIRED');
  const label = JSON.parse(await readFile(new URL('build-label.json', dist), 'utf8'));
  const localManifest = JSON.parse(await readFile(new URL('precache-manifest.json', dist), 'utf8'));
  check(typeof label.buildId === 'string' && label.buildId === localManifest.buildId, 'LOCAL_DIST_LABEL_INVALID');

  // These unauthenticated reads refuse redirects: deployment protection, an
  // account login, or a different final host is a failure, never bypassed.
  async function fetchPublic(path) {
    return fetch(new URL(path, url), { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  }
  const shellResponse = await fetchPublic('/');
  check(shellResponse.status === 200, 'PUBLIC_SHELL_NOT_200');
  check((shellResponse.headers.get('content-type') || '').includes('text/html'), 'PUBLIC_SHELL_MIME_INVALID');
  const csp = shellResponse.headers.get('content-security-policy') || '';
  for (const directive of ["default-src 'self'", "script-src 'self'", "connect-src 'self'", "media-src 'self'"]) check(csp.includes(directive), 'HOSTED_CSP_MISSING_REQUIRED_DIRECTIVE');
  const remoteLabelResponse = await fetchPublic('/build-label.json');
  check(remoteLabelResponse.status === 200, 'HOSTED_BUILD_LABEL_UNAVAILABLE');
  const remoteLabel = await remoteLabelResponse.json();
  check(remoteLabel.buildId === label.buildId, 'HOSTED_BUILD_LABEL_MISMATCH');
  const remoteManifestResponse = await fetchPublic('/precache-manifest.json');
  check(remoteManifestResponse.status === 200, 'HOSTED_PRECACHE_MANIFEST_UNAVAILABLE');
  const remoteManifest = await remoteManifestResponse.json();
  check(JSON.stringify(remoteManifest) === JSON.stringify(localManifest), 'HOSTED_PRECACHE_MANIFEST_MISMATCH');
  for (const entry of localManifest.entries) {
    check(typeof entry.url === 'string' && entry.url.startsWith('/') && !entry.url.startsWith('//'), 'INVALID_LOCAL_ASSET_URL');
    const response = await fetchPublic(entry.url);
    check(response.status === 200, `HOSTED_ASSET_NOT_200:${entry.url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    check(bytes.length === entry.bytes && sha256(bytes) === entry.sha256, `HOSTED_ASSET_BYTES_MISMATCH:${entry.url}`);
  }
  const missing = await fetchPublic('/assets/little-joys-hosted-check-missing-asset.png');
  check(missing.status === 404, 'MISSING_ASSET_MUST_BE_404');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 810, height: 1080 }, serviceWorkers: 'allow' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const pageErrors = [], externalRequests = [];
  let runtimeRequests = 0;
  context.on('request', request => {
    runtimeRequests++;
    const requestUrl = new URL(request.url());
    if (['http:', 'https:'].includes(requestUrl.protocol) && requestUrl.origin !== url.origin) externalRequests.push(requestUrl.origin);
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.hostedPolicyViolations = [];
    document.addEventListener('securitypolicyviolation', event => window.hostedPolicyViolations.push(event.violatedDirective));
  });
  try {
    const response = await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    check(response?.status() === 200 && page.url() === url.href, 'PUBLIC_BROWSER_LAUNCH_FAILED');
    await expect(page.getByTestId('play-canvas')).toHaveAttribute('data-toy', 'squishy');
    await expect(page.getByTestId('play-canvas')).toHaveAttribute('data-art', '6');
    await expect(page.getByRole('button', { name: 'Sound is muted', exact: true })).toBeVisible();
    await expect.poll(async () => (await workerStatus(page))?.ready, { timeout: 30_000 }).toBe(true);
    const onlineStatus = await workerStatus(page);
    check(onlineStatus?.buildId === label.buildId && onlineStatus?.version === localManifest.version, 'ACTIVE_WORKER_VERSION_MISMATCH');
    await useEveryToy(page);
    await inspectParentStatus(page, label.buildId);
    check((await page.evaluate(() => window.hostedPolicyViolations)).length === 0, 'ONLINE_CSP_VIOLATION');

    // Navigate under the verified worker before disconnecting all networking
    // for the browser context. This is an actual Chromium offline reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('play-canvas')).toHaveAttribute('data-art', '6');
    await expect.poll(async () => (await workerStatus(page))?.ready).toBe(true);
    const music = localManifest.entries.find(entry => entry.url === '/assets/music.mp3');
    check(music, 'LOCAL_OFFLINE_MUSIC_MISSING');
    const range = await page.evaluate(async () => {
      const response = await fetch('/assets/music.mp3', { headers: { Range: 'bytes=0-31' } });
      return { status: response.status, bytes: (await response.arrayBuffer()).byteLength, contentRange: response.headers.get('content-range') };
    });
    check(range.status === 206 && range.bytes === 32 && range.contentRange === `bytes 0-31/${music.bytes}`, 'OFFLINE_MUSIC_RANGE_FAILED');
    await useEveryToy(page);
    await inspectParentStatus(page, label.buildId);
    check((await page.evaluate(() => window.hostedPolicyViolations)).length === 0, 'OFFLINE_CSP_VIOLATION');
    check(pageErrors.length === 0, 'BROWSER_PAGE_ERRORS');
    check(externalRequests.length === 0, 'THIRD_PARTY_RUNTIME_REQUESTS');
  } finally {
    try { await context.close(); } finally { await browser.close(); }
  }

  const report = {
    status: 'passed', url: url.href, buildId: label.buildId, checkedAt: new Date().toISOString(),
    browser: 'Playwright Chromium desktop',
    summary: {
      remoteBuildMatchesLocal: true, verifiedStaticFiles: localManifest.entries.length,
      allFourToysOnline: true, allFourToysAfterOfflineReload: true,
      freshSessionSilent: true, runtimeImages: 6, parentControlsChecked: true,
      currentServiceWorkerCacheVerified: true, cachedMusicRangeStatus: 206,
      actualHttpsCspChecked: true, missingAssetStatus: 404,
      thirdPartyRuntimeRequests: 0, pageErrors: 0, runtimeRequestCount: runtimeRequests,
      physicalIpadValidated: false,
    },
  };
  const evidenceDirectory = new URL('docs/evidence/', project);
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(new URL('hosted-check.json', evidenceDirectory), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, url: report.url, buildId: report.buildId, files: report.summary.verifiedStaticFiles, offlineToys: 4, evidence: 'docs/evidence/hosted-check.json' }));
}

main().catch(error => {
  console.error(error?.stack || error);
  // Failure never overwrites a prior evidence record or saves browser/account
  // metadata, storage contents, source paths, traces, or private screenshots.
  console.error(JSON.stringify({ status: 'failed', error: String(error?.message || 'UNKNOWN_ERROR').split('\n')[0].slice(0, 240) }));
  process.exitCode = 1;
});
