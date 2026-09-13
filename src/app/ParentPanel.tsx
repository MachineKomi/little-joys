import { useState } from "react";
import type { SettingsV1 } from "../core/types";
import { Modal } from "./Modal";

export interface OfflineStatus {
  ready: boolean;
  message: string;
  updateAvailable: boolean;
  buildId?: string;
}
interface Props {
  settings: SettingsV1;
  reducedMotion: boolean;
  soundActive: boolean;
  soundMessage: string;
  musicActive: boolean;
  musicMessage: string;
  storageAvailable: boolean;
  offline: OfflineStatus;
  onChange: (settings: SettingsV1) => void;
  onEnableSound: () => Promise<void>;
  onMute: () => void;
  onEnableMusic: () => Promise<void>;
  onMuteMusic: () => void;
  onReset: () => void;
  onClose: () => void;
  onCheckUpdate: () => Promise<void>;
  getStatus: () => Record<string, unknown>;
}
export function ParentPanel(props: Props) {
  const { settings, onChange, offline } = props;
  const [confirmReset, setConfirmReset] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState(() => props.getStatus());
  const [checking, setChecking] = useState(false);
  const [enablePending, setEnablePending] = useState(false);
  const [musicPending, setMusicPending] = useState(false);
  function change<K extends keyof SettingsV1>(key: K, value: SettingsV1[K]) {
    onChange({ ...settings, [key]: value });
  }
  async function enable() {
    setEnablePending(true);
    try {
      await props.onEnableSound();
    } finally {
      setEnablePending(false);
    }
  }
  return (
    <Modal
      title="Parent settings"
      onClose={props.onClose}
      className="parent-dialog"
    >
      <p className="panel-intro">
        Make room for their kind of play. The toy is paused while you’re here.
      </p>
      {!props.storageAvailable && (
        <p className="status-note" role="status">
          Browser storage is unavailable. These settings work for this visit.
        </p>
      )}
      <section className="settings-section" aria-labelledby="sound-heading">
        <h2 id="sound-heading">Sound & movement</h2>
        <div className="setting-row">
          <div>
            <span className="setting-label" id="sound-label">
              Toy sounds
            </span>
            <p>Always optional. The play screen can only mute.</p>
          </div>
          <button
            type="button"
            className={`switch ${props.soundActive ? "switch-on" : ""}`}
            role="switch"
            aria-checked={props.soundActive}
            aria-labelledby="sound-label"
            disabled={enablePending}
            onClick={() => {
              if (props.soundActive) props.onMute();
              else void enable();
            }}
          >
            <span />
            {props.soundActive ? "On" : "Off"}
          </button>
        </div>
        {props.soundMessage && (
          <p className="field-note" role="status">
            {props.soundMessage}
          </p>
        )}
        <label className="range-setting" htmlFor="sfx-level">
          <span>
            Sound effect level{" "}
            <output>{Math.round(settings.sfxGain * 100)}%</output>
          </span>
          <input
            id="sfx-level"
            type="range"
            min="0"
            max="0.30"
            step="0.01"
            value={settings.sfxGain}
            onChange={(event) => change("sfxGain", Number(event.target.value))}
          />
        </label>
        <p className="field-note">
          Device volume also controls loudness. Toy sounds contain no voices.
        </p>
        <div className="setting-row">
          <div>
            <span className="setting-label" id="music-label">
              Background music
            </span>
            <p>One optional track, independent of toy sounds.</p>
          </div>
          <button
            type="button"
            className={`switch ${props.musicActive ? "switch-on" : ""}`}
            role="switch"
            aria-checked={props.musicActive}
            aria-labelledby="music-label"
            disabled={musicPending}
            onClick={async () => {
              if (props.musicActive) props.onMuteMusic();
              else {
                setMusicPending(true);
                try {
                  await props.onEnableMusic();
                } finally {
                  setMusicPending(false);
                }
              }
            }}
          >
            <span />
            {props.musicActive ? "On" : "Off"}
          </button>
        </div>
        <p className="field-note" role="status">
          {props.musicMessage}
        </p>
        <label className="range-setting" htmlFor="music-level">
          <span>
            Music level <output>{Math.round(settings.musicGain * 100)}%</output>
          </span>
          <input
            id="music-level"
            type="range"
            min="0"
            max="0.20"
            step="0.01"
            value={settings.musicGain}
            onChange={(event) =>
              change("musicGain", Number(event.target.value))
            }
          />
        </label>
        <p className="field-note">
          Sleepy Afternoon with Friends, from the owner’s original soundtrack.
          The play-screen Mute stops music and toy sounds together.
        </p>
        <label className="setting-row">
          <span className="setting-label">Motion</span>
          <select
            aria-label="Motion"
            value={settings.motion}
            onChange={(event) =>
              change("motion", event.target.value as SettingsV1["motion"])
            }
          >
            <option value="gentle">Gentle</option>
            <option value="playful">Playful</option>
          </select>
        </label>
        <p className="field-note">
          {props.reducedMotion
            ? "Your device requests reduced motion, so Gentle is in use even if Playful is selected."
            : "Gentle returns objects smoothly. Playful adds a little movement after a touch."}
        </p>
      </section>
      <section className="settings-section" aria-labelledby="toys-heading">
        <h2 id="toys-heading">Toys</h2>
        <label className="setting-row">
          <span className="setting-label">Bubbles</span>
          <select
            aria-label="Bubbles"
            value={settings.bubbleCount}
            onChange={(event) =>
              change("bubbleCount", Number(event.target.value) as 3 | 6)
            }
          >
            <option value="3">Three</option>
            <option value="6">Six</option>
          </select>
        </label>
        <p className="field-note">
          Six bubbles are shown when there is room for large, separate targets.
          Smaller play areas use three.
        </p>
        <label className="setting-row">
          <span className="setting-label">Balls</span>
          <select
            aria-label="Balls"
            value={settings.ballCount}
            onChange={(event) =>
              change("ballCount", Number(event.target.value) as 1 | 2)
            }
          >
            <option value="1">One</option>
            <option value="2">Two</option>
          </select>
        </label>
        <label className="setting-row">
          <span className="setting-label">Ball control</span>
          <select
            aria-label="Ball control"
            value={settings.ballControl}
            onChange={(event) =>
              change(
                "ballControl",
                event.target.value as SettingsV1["ballControl"],
              )
            }
          >
            <option value="drag">Drag</option>
            <option value="tap-place">Tap to place</option>
          </select>
        </label>
        <p className="field-note">
          Tap to place: tap a ball, then its destination. Tap the selected ball
          again to cancel.
        </p>
        <label className="setting-row">
          <span className="setting-label">Bouncing balls</span>
          <select
            aria-label="Bouncing balls"
            value={settings.bounceBallCount}
            onChange={(event) =>
              change(
                "bounceBallCount",
                Number(event.target.value) as 8 | 16 | 24,
              )
            }
          >
            <option value="8">Up to eight</option>
            <option value="16">Up to sixteen</option>
            <option value="24">Up to twenty-four</option>
          </select>
        </label>
        <p className="field-note">
          Tap open space to add or reuse a ball. Holding still does not add
          more.
        </p>
        <label className="setting-row">
          <span className="setting-label">Open with</span>
          <select
            aria-label="Open with"
            value={settings.startupToy}
            onChange={(event) =>
              change(
                "startupToy",
                event.target.value as SettingsV1["startupToy"],
              )
            }
          >
            <option value="last">Last toy used</option>
            <option value="squishy">Squishy Friend</option>
            <option value="bubbles">Bubble Pond</option>
            <option value="nest">Roll & Nest</option>
            <option value="bounce">Penguin Bounce</option>
          </select>
        </label>
      </section>
      <section className="settings-section" aria-labelledby="offline-heading">
        <h2 id="offline-heading">Ready for another visit</h2>
        <p
          className={`offline-status ${offline.ready ? "offline-ready" : ""}`}
          role="status"
        >
          <span className="status-dot" />
          {offline.ready ? "Offline ready" : "Offline not yet verified"}
        </p>
        <p className="field-note">{offline.message}</p>
        {offline.updateAvailable && (
          <p className="status-note">
            An update is waiting. Close every Little Joys tab and Home Screen
            window, then reopen online to apply it.
          </p>
        )}
        <p>
          On iPad, open Little Joys in Safari and use Share → Add to Home
          Screen. Load online first and wait for “Offline ready”. Browser
          storage can be cleared or evicted later.
        </p>
        <button
          type="button"
          className="quiet-button"
          disabled={checking}
          onClick={async () => {
            setChecking(true);
            try {
              await props.onCheckUpdate();
            } finally {
              setChecking(false);
            }
          }}
        >
          {checking ? "Checking…" : "Check for update"}
        </button>
      </section>
      <details
        className="technical-details"
        onToggle={(event) => {
          if (event.currentTarget.open) setRuntimeStatus(props.getStatus());
        }}
      >
        <summary>Technical status</summary>
        <dl className="technical-list">
          <div>
            <dt>Build</dt>
            <dd>{__BUILD_ID__}</dd>
          </div>
          <div>
            <dt>Browser</dt>
            <dd>{navigator.userAgent}</dd>
          </div>
          <div>
            <dt>Diagnostic capture</dt>
            <dd>{settings.diagnosticsEnabled ? "On — local only" : "Off"}</dd>
          </div>
        </dl>
        <label className="checkbox-setting">
          <input
            type="checkbox"
            checked={settings.diagnosticsEnabled}
            onChange={(event) =>
              change("diagnosticsEnabled", event.target.checked)
            }
          />
          <span>Capture bounded technical diagnostics locally</span>
        </label>
        <p className="field-note">
          Frame timings and resource counts only. No touch paths, profiles, or
          network export.
        </p>
        <button
          type="button"
          className="quiet-button"
          onClick={() => setRuntimeStatus(props.getStatus())}
        >
          Refresh technical status
        </button>
        <pre className="runtime-status">
          {JSON.stringify(runtimeStatus, null, 2)}
        </pre>
      </details>
      <section className="reset-section">
        {confirmReset ? (
          <>
            <p>Reset all preferences to their defaults? Sound will be off.</p>
            <div className="button-row">
              <button
                type="button"
                className="quiet-button"
                onClick={() => {
                  props.onReset();
                  setConfirmReset(false);
                }}
              >
                Reset settings
              </button>
              <button
                type="button"
                className="quiet-button"
                onClick={() => setConfirmReset(false)}
              >
                Keep settings
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="text-button"
            onClick={() => setConfirmReset(true)}
          >
            Reset settings…
          </button>
        )}
      </section>
      <button type="button" className="done-button" onClick={props.onClose}>
        Back to the toy
      </button>
    </Modal>
  );
}
