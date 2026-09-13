# Offline browser test method

Build inspected: `preview-38b71f30f900`, 13 September 2026, with Playwright 1.63.0 on Windows. This is desktop browser automation, not a physical iPad result.

## Windows WebKit comparison

The original T28 used Playwright's `context.setOffline(true)` immediately after the complete production cache verified. Windows WebKit rejected the next navigation with `WebKit encountered an internal error`. The cache remained complete; the app did not return an HTTP 503.

Four isolated comparisons used the same unchanged production build:

| Starting page                                    | Network denial                | Observed result                                                                                                          |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Initial page, no controller yet                  | Playwright offline override   | Cached-document fetch and reload failed with the internal error                                                          |
| Page reloaded online, active controller verified | Playwright offline override   | Cached-document fetch and reload failed with the same internal error                                                     |
| Initial page, no controller yet                  | Origin server actually closed | First offline navigation returned 200 from the service worker; all three toys, settings and a 32-byte music range worked |
| Page reloaded online, active controller verified | Origin server actually closed | Cached fetch and navigation worked; all three toys, settings and the music range worked                                  |

This isolates the reproduced failure to the local automation offline-override path rather than a missing service-worker controller or an unavailable current-version cache. It does not establish behavior on other WebKit builds or on physical Safari.

The failed comparisons and their exact observations are retained locally in `.local/pwa-webkit-diagnostic.log`. The diagnostic test and configuration are `.local/pwa-webkit-comparison.spec.ts` and `.local/pwa-diagnostic.config.ts`. These diagnostics are separate from the normal test suite and are not counted as successful offline product tests.

## Normal T28

T28 now starts a dedicated instance of the exact production static server, including the same headers as `vercel.json`. It verifies the complete cache and that the first page is still uncontrolled, then closes that server. An independent Node fetch must fail, establishing that the application's only permitted network origin is unavailable. No online reload is inserted before the first offline navigation.

The first offline navigation must come from the service worker. The test then exercises every toy and adult settings, checks persistence, verifies a cached music byte-range response, and asserts no CSP violations or third-party runtime requests. Chromium also retains Playwright's offline override. Windows WebKit uses the physically closed origin; `navigator.onLine` remains true there, so this automated case does not validate the browser's offline event or a physical radio transition.

The revised Windows WebKit PWA suite passed all four tests in 7.8 seconds on the inspected build, including eviction status, missing-file 404s, and failed/waiting multi-window updates. No application code, activation behavior, readiness rule, or production build was changed to obtain this result. No retry or skip replaces an assertion.

Physical iPad Safari and Home Screen checks still need real offline relaunches, storage behavior, media playback, and device lock/background transitions.
