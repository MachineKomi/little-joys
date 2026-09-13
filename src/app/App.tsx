import { useEffect, useRef, useState } from "react";
import { Runtime } from "../core/runtime";
import {
  defaults,
  effectiveSettings,
  loadSettings,
  saveSettings,
  validateSettings,
} from "../core/settings";
import type { SettingsV1, ToyId } from "../core/types";
import {
  applyUpdate,
  refreshPwaStatus,
  registerPwa,
} from "../pwa/registration";
import { Icon } from "./icons";
import { ParentPanel, type OfflineStatus } from "./ParentPanel";
import { Toolbar } from "./Toolbar";
import { ToyPicker, toyNames } from "./ToyPicker";

export function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [toy, setToy] = useState<ToyId>(() =>
    settings.startupToy === "last" ? settings.lastToy : settings.startupToy,
  );
  const [paused, setPaused] = useState(false);
  const [panel, setPanel] = useState<"toys" | "parents" | null>(null);
  const [soundActive, setSoundActive] = useState(false);
  const [musicActive, setMusicActive] = useState(false);
  const [musicMessage, setMusicMessage] = useState("Optional music is off.");
  const [soundMessage, setSoundMessage] = useState(
    settings.soundEnabled
      ? "Sound is waiting for your enable gesture for this visit."
      : "Silent play is ready.",
  );
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [offline, setOffline] = useState<OfflineStatus>({
    ready: false,
    message: "Checking the complete toybox cache…",
    updateAvailable: false,
  });
  const [runtimeError, setRuntimeError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const settingsRef = useRef(settings);
  const soundEpoch = useRef(0);
  const musicEpoch = useRef(0);
  const initial = useRef({
    toy,
    settings: effectiveSettings(settings, reduced),
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      runtimeRef.current = new Runtime(
        canvasRef.current,
        initial.current.toy,
        initial.current.settings,
      );
    } catch {
      setRuntimeError(true);
    }
    return () => {
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);
  useEffect(() => registerPwa(setOffline), []);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    runtimeRef.current?.setPaused(paused || panel !== null);
  }, [paused, panel]);
  useEffect(() => {
    if (panel === "parents") {
      void refreshPwaStatus();
      const status = runtimeRef.current?.status();
      if (status && !status.musicEnabled) {
        setMusicActive(false);
        if (settingsRef.current.musicEnabled)
          setMusicMessage(
            "Music is currently silent. Enable it again for this visit.",
          );
      }
    }
  }, [panel]);
  useEffect(() => {
    runtimeRef.current?.configure(effectiveSettings(settings, reduced));
  }, [settings, reduced]);
  // Use the visual viewport without disabling browser zoom in the adult panel.
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () =>
      document.documentElement.style.setProperty(
        "--visible-height",
        `${viewport?.height ?? window.innerHeight}px`,
      );
    resize();
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);
  function changeSettings(next: SettingsV1) {
    const validated = validateSettings(next);
    settingsRef.current = validated;
    setSettings(validated);
    setStorageAvailable(saveSettings(validated));
  }
  function mute() {
    soundEpoch.current++;
    musicEpoch.current++;
    runtimeRef.current?.mute();
    setSoundActive(false);
    setMusicActive(false);
    setSoundMessage("Silent play is ready.");
    setMusicMessage("Music is off.");
    changeSettings({
      ...settingsRef.current,
      soundEnabled: false,
      musicEnabled: false,
    });
  }
  function disableSound() {
    soundEpoch.current++;
    runtimeRef.current?.disableAudio();
    setSoundActive(false);
    setSoundMessage("Toy sounds are off.");
    changeSettings({ ...settingsRef.current, soundEnabled: false });
  }
  function disableMusic() {
    musicEpoch.current++;
    runtimeRef.current?.disableMusic();
    setMusicActive(false);
    setMusicMessage("Music is off.");
    changeSettings({ ...settingsRef.current, musicEnabled: false });
  }
  async function enableSound() {
    const ticket = ++soundEpoch.current;
    const next = { ...settingsRef.current, soundEnabled: true };
    runtimeRef.current?.configure(effectiveSettings(next, reduced));
    let enabled = false;
    try {
      enabled = (await runtimeRef.current?.enableAudio()) ?? false;
    } catch {
      /* Silent play remains usable. */
    }
    if (ticket !== soundEpoch.current) return;
    setSoundActive(enabled);
    setSoundMessage(
      enabled
        ? "Toy sounds are enabled. Nothing plays while paused."
        : "Sound is unavailable in this browser session. Silent play still works.",
    );
    changeSettings({ ...settingsRef.current, soundEnabled: enabled });
  }
  async function enableMusic() {
    const ticket = ++musicEpoch.current;
    let enabled = false;
    try {
      enabled = (await runtimeRef.current?.enableMusic()) ?? false;
    } catch {
      /* Music is optional. */
    }
    if (ticket !== musicEpoch.current) return;
    setMusicActive(enabled);
    setMusicMessage(
      enabled
        ? "Music is ready. It starts when you return to play and pauses whenever you leave."
        : "Music could not start. Play still works without it.",
    );
    changeSettings({ ...settingsRef.current, musicEnabled: enabled });
  }
  function selectToy(next: ToyId) {
    runtimeRef.current?.setToy(next);
    setToy(next);
    changeSettings({ ...settings, lastToy: next });
    setPanel(null);
    setPaused(false);
  }
  return (
    <div className="app-shell" data-toy={toy}>
      <Toolbar
        paused={paused}
        soundActive={soundActive || musicActive}
        onToybox={() => setPanel("toys")}
        onPause={() => setPaused((value) => !value)}
        onMute={mute}
        onSettings={() => setPanel("parents")}
      />
      <main className={`play-region play-${toy}`} aria-label={toyNames[toy]}>
        <canvas
          ref={canvasRef}
          data-testid="play-canvas"
          aria-label={`${toyNames[toy]} touch play area`}
          role="img"
        >
          A direct-touch toy. Use Toybox to choose a toy, or the controls above
          to pause.
        </canvas>
        {paused && panel === null && (
          <div className="pause-overlay">
            <div className="pause-card">
              <span className="pause-eyebrow">A little pause</span>
              <button
                type="button"
                className="resume-button"
                onClick={() => setPaused(false)}
              >
                <Icon name="play" />
                <span>Resume</span>
              </button>
            </div>
          </div>
        )}
        {runtimeError && (
          <div className="runtime-error" role="alert">
            <p>The play surface could not start.</p>
            <button
              className="quiet-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}
        <div className="toy-caption" aria-hidden="true">
          <span />
          {toyNames[toy]}
          <span />
        </div>
      </main>
      {panel === "toys" && (
        <ToyPicker
          selected={toy}
          onSelect={selectToy}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "parents" && (
        <ParentPanel
          settings={settings}
          reducedMotion={reduced}
          soundActive={soundActive}
          soundMessage={soundMessage}
          musicActive={musicActive}
          musicMessage={musicMessage}
          storageAvailable={storageAvailable}
          offline={offline}
          onChange={changeSettings}
          onEnableSound={enableSound}
          onMute={disableSound}
          onEnableMusic={enableMusic}
          onMuteMusic={disableMusic}
          onReset={() => {
            mute();
            changeSettings({ ...defaults });
          }}
          onClose={() => setPanel(null)}
          onCheckUpdate={applyUpdate}
          getStatus={() =>
            runtimeRef.current?.status() ?? { runtime: "unavailable" }
          }
        />
      )}
    </div>
  );
}
