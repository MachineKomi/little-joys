import { expect, test, type Page } from './fixtures';

interface Probe {
  media: HTMLAudioElement[]; contexts: AudioContext[]; musicGains: GainNode[];
  sources: number; decodeCalls: number; starts: number[]; voices: number; peakVoices: number; peakGain: number;
}
type ProbedWindow = Window & typeof globalThis & { audioProbe: Probe };
// Test-only observation around real browser APIs. No production diagnostic/test
// hooks, substituted sound engine, or audible-listening claims are involved.
async function observeAudio(page: Page) {
  await page.addInitScript(() => {
    const target = window as ProbedWindow;
    const probe: Probe = { media: [], contexts: [], musicGains: [], sources: 0, decodeCalls: 0, starts: [], voices: 0, peakVoices: 0, peakGain: 0 };
    target.audioProbe = probe;
    target.Audio = new Proxy(window.Audio, {
      construct(Constructor, args) { const element = Reflect.construct(Constructor, args) as HTMLAudioElement; probe.media.push(element); return element; },
    });
    const NativeContext = window.AudioContext;
    if (typeof NativeContext !== 'function') return;
    target.AudioContext = new Proxy(NativeContext, {
      construct(Constructor, args) {
        const context = Reflect.construct(Constructor, args) as AudioContext; probe.contexts.push(context);
        const createGain = context.createGain.bind(context);
        context.createGain = () => {
          const gain = createGain(); const ramp = gain.gain.linearRampToValueAtTime.bind(gain.gain);
          gain.gain.linearRampToValueAtTime = (value, time) => { probe.peakGain = Math.max(probe.peakGain, value); return ramp(value, time); };
          return gain;
        };
        const createSource = context.createMediaElementSource.bind(context);
        context.createMediaElementSource = element => {
          probe.sources++; const source = createSource(element); const connect = source.connect.bind(source);
          source.connect = ((destination: AudioNode, output?: number, input?: number) => {
            if (destination instanceof GainNode) probe.musicGains.push(destination);
            return connect(destination, output, input);
          }) as typeof source.connect;
          return source;
        };
        const createOscillator = context.createOscillator.bind(context);
        context.createOscillator = () => {
          const oscillator = createOscillator(); const start = oscillator.start.bind(oscillator);
          oscillator.start = when => { probe.starts.push(context.currentTime); probe.voices++; probe.peakVoices = Math.max(probe.peakVoices, probe.voices); start(when); };
          oscillator.addEventListener('ended', () => { probe.voices--; });
          return oscillator;
        };
        const decode = context.decodeAudioData.bind(context);
        context.decodeAudioData = ((...parameters: Parameters<typeof decode>) => { probe.decodeCalls++; return decode(...parameters); }) as typeof decode;
        return context;
      },
    });
  });
}
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const probe = (window as ProbedWindow).audioProbe;
    return { elements: probe.media.length, contexts: probe.contexts.length, sources: probe.sources, decodeCalls: probe.decodeCalls, allMediaPaused: probe.media.every(media => media.paused), musicGains: probe.musicGains.map(gain => gain.gain.value), starts: [...probe.starts], voices: probe.voices, peakVoices: probe.peakVoices, peakGain: probe.peakGain };
  });
}
async function launch(page: Page) {
  await observeAudio(page);
  await page.goto(process.env.LITTLE_JOYS_AUDIO_TEST_URL || '/');
  await expect(page.getByTestId('play-canvas')).toBeVisible();
}
async function parents(page: Page) {
  await page.getByRole('button', { name: 'Open parent settings', exact: true }).press('Enter');
  await expect(page.getByRole('dialog', { name: 'Parent settings', exact: true })).toBeVisible();
}
async function closeParents(page: Page) { await page.getByRole('button', { name: 'Close parent settings', exact: true }).click(); }
async function requireAudio(page: Page) {
  const supported = await page.evaluate(() => typeof AudioContext === 'function' && typeof AudioContext.prototype.createMediaElementSource === 'function');
  test.skip(!supported, 'This browser build does not expose AudioContext/media-element audio routing. Silent controls remain covered; this is not an iPad result.');
}
async function enableMusic(page: Page) {
  await parents(page);
  await page.getByRole('switch', { name: 'Background music', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Background music', exact: true })).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });
}
async function playing(page: Page) {
  await expect.poll(async () => (await snapshot(page)).allMediaPaused).toBe(false);
  await expect.poll(async () => (await snapshot(page)).musicGains[0]).toBeGreaterThan(0);
}
async function stopped(page: Page) {
  await expect.poll(async () => (await snapshot(page)).allMediaPaused).toBe(true);
  await expect.poll(async () => (await snapshot(page)).musicGains.every(gain => gain === 0)).toBe(true);
  await expect.poll(async () => (await snapshot(page)).voices).toBe(0);
}

test('T01/T21: fresh and explicitly muted return visits never create sound services through play', async ({ page }) => {
  await launch(page);
  await page.getByTestId('play-canvas').click();
  expect(await snapshot(page)).toMatchObject({ elements: 0, contexts: 0, sources: 0, starts: [] });
  await parents(page);
  await expect(page.getByRole('switch', { name: 'Toy sounds', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('switch', { name: 'Background music', exact: true })).toHaveAttribute('aria-checked', 'false');
  await closeParents(page);
  await page.getByRole('button', { name: 'Sound is muted', exact: true }).click();
  await page.reload(); await page.getByTestId('play-canvas').click();
  expect(await snapshot(page)).toMatchObject({ elements: 0, contexts: 0, sources: 0, starts: [] });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('little-joys-settings-v1')!))).toMatchObject({ soundEnabled: false, musicEnabled: false });
});

test('T22: optional music streams through one bounded gain without enabling SFX or a full-track decode', async ({ page }) => {
  await launch(page); await requireAudio(page); await enableMusic(page);
  await stopped(page);
  await expect(page.getByRole('switch', { name: 'Toy sounds', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('slider', { name: /Music level/ })).toHaveAttribute('max', '0.20');
  await closeParents(page); await playing(page);
  expect(await snapshot(page)).toMatchObject({ elements: 1, contexts: 1, sources: 1, decodeCalls: 0, starts: [] });
  expect((await snapshot(page)).musicGains[0]).toBeCloseTo(.08, 5);
  await parents(page); await stopped(page); await page.getByRole('slider', { name: /Music level/ }).press('End');
  await closeParents(page); await playing(page); expect((await snapshot(page)).musicGains[0]).toBeCloseTo(.2, 5);
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click(); await stopped(page);
  await parents(page);
  await expect(page.getByRole('switch', { name: 'Background music', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('switch', { name: 'Toy sounds', exact: true })).toHaveAttribute('aria-checked', 'false');
});

test('T22/T23: SFX share the context, respect voice/rate/gain caps, and do not queue across pause', async ({ page }) => {
  await launch(page); await requireAudio(page); await enableMusic(page);
  await page.getByRole('switch', { name: 'Toy sounds', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Toy sounds', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('slider', { name: /Sound effect level/ }).press('End');
  await closeParents(page); await playing(page);
  await page.getByTestId('play-canvas').evaluate(async canvas => {
    const rect = canvas.getBoundingClientRect();
    for (let n = 0; n < 20; n++) {
      for (let i = 0; i < 5; i++) {
        const init = { bubbles: true, pointerId: n * 10 + i, pointerType: 'touch', button: 0, clientX: rect.left + rect.width * .5, clientY: rect.top + rect.height * .5 };
        canvas.dispatchEvent(new PointerEvent('pointerdown', init)); canvas.dispatchEvent(new PointerEvent('pointerup', init));
      }
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  });
  const state = await snapshot(page);
  expect(state.contexts).toBe(1); expect(state.starts.length).toBeGreaterThan(2); expect(state.peakVoices).toBeLessThanOrEqual(2); expect(state.peakGain).toBeLessThanOrEqual(.300001);
  for (let i = 1; i < state.starts.length; i++) expect(state.starts[i] - state.starts[i - 1]).toBeGreaterThanOrEqual(.149);
  await page.getByRole('button', { name: 'Pause play', exact: true }).click(); await stopped(page);
  const beforeResume = (await snapshot(page)).starts.length;
  await page.getByRole('button', { name: 'Resume play', exact: true }).click(); await playing(page);
  expect((await snapshot(page)).starts.length).toBe(beforeResume);
});

for (const reason of ['blur', 'hidden'] as const) {
  test(`T23: ${reason} stops music; focus alone remains silent until a fresh play contact`, async ({ page }) => {
    await launch(page); await requireAudio(page); await enableMusic(page);
    await page.getByRole('switch', { name: 'Toy sounds', exact: true }).click();
    await expect(page.getByRole('switch', { name: 'Toy sounds', exact: true })).toHaveAttribute('aria-checked', 'true');
    await closeParents(page); await playing(page); await page.getByTestId('play-canvas').click();
    expect((await snapshot(page)).starts.length).toBeGreaterThan(0);
    await page.evaluate(reason => {
      if (reason === 'blur') window.dispatchEvent(new Event('blur'));
      else { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); }
    }, reason);
    await stopped(page);
    const stoppedStarts = (await snapshot(page)).starts.length;
    await page.evaluate(reason => {
      if (reason === 'blur') window.dispatchEvent(new Event('focus'));
      else { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); }
    }, reason);
    await page.waitForTimeout(180); await stopped(page);
    expect((await snapshot(page)).starts.length).toBe(stoppedStarts);
    await page.getByTestId('play-canvas').click(); await playing(page);
    expect((await snapshot(page)).starts.length).toBe(stoppedStarts + 1);
  });
}

test('T21: saved enabled preferences still require a fresh adult enable gesture after reload', async ({ page }) => {
  await launch(page); await requireAudio(page); await enableMusic(page);
  await page.getByRole('switch', { name: 'Toy sounds', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Toy sounds', exact: true })).toHaveAttribute('aria-checked', 'true');
  await closeParents(page); await playing(page); await page.reload();
  await page.getByTestId('play-canvas').click(); expect(await snapshot(page)).toMatchObject({ elements: 0, contexts: 0, sources: 0, starts: [] });
  await parents(page);
  await expect(page.getByRole('switch', { name: 'Background music', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('switch', { name: 'Toy sounds', exact: true })).toHaveAttribute('aria-checked', 'false');
});

test('T22: a browser-denied music play is reported and cannot block or repeatedly retry toy play', async ({ page }) => {
  await launch(page); await requireAudio(page);
  await page.evaluate(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Test denial', 'NotAllowedError')); });
  await parents(page); await page.getByRole('switch', { name: 'Background music', exact: true }).click();
  await expect(page.getByText('Music could not start. Play still works without it.', { exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Background music', exact: true })).toHaveAttribute('aria-checked', 'false');
  await closeParents(page); await page.getByTestId('play-canvas').click(); await stopped(page);
  await expect(page.getByRole('button', { name: 'Sound is muted', exact: true })).toBeVisible();
});
