import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

export function Toolbar({
  paused,
  soundActive,
  onToybox,
  onPause,
  onMute,
  onSettings,
}: {
  paused: boolean;
  soundActive: boolean;
  onToybox: () => void;
  onPause: () => void;
  onMute: () => void;
  onSettings: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [holding, setHolding] = useState(false);
  const clearHold = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const cancel = () => clearHold();
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
    };
  }, []);
  return (
    <header className="toolbar">
      <div className="wordmark" aria-label="Little Joys">
        <span className="wordmark-mark" aria-hidden="true">
          ⌣
        </span>
        <span>
          little joys
          <span className="wordmark-caption">a little room to play</span>
        </span>
      </div>
      <nav className="child-controls" aria-label="Play controls">
        <button
          type="button"
          className="child-button toybox-button"
          onClick={onToybox}
        >
          <Icon name="toybox" />
          <span>Toybox</span>
        </button>
        <button
          type="button"
          className="child-button"
          onClick={onPause}
          aria-label={paused ? "Resume play" : "Pause play"}
        >
          <Icon name={paused ? "play" : "pause"} />
          <span>{paused ? "Resume" : "Pause"}</span>
        </button>
        <button
          type="button"
          className={`child-button ${soundActive ? "" : "is-muted"}`}
          onClick={onMute}
          aria-label={soundActive ? "Mute sound" : "Sound is muted"}
        >
          <Icon name={soundActive ? "sound" : "muted"} />
          <span>{soundActive ? "Mute" : "Muted"}</span>
        </button>
      </nav>
      <button
        type="button"
        className={`parent-button ${holding ? "is-holding" : ""}`}
        aria-label="Open parent settings"
        aria-describedby="parent-access-hint"
        title="Hold for 2 seconds. Keyboard: press Enter or Space."
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          clearHold();
          setHolding(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          timer.current = setTimeout(() => {
            clearHold();
            onSettings();
          }, 2000);
        }}
        onPointerUp={clearHold}
        onPointerCancel={clearHold}
        onLostPointerCapture={clearHold}
        onPointerLeave={clearHold}
        onClick={(event) => {
          if (event.detail === 0) {
            clearHold();
            onSettings();
          }
        }}
      >
        <Icon name="settings" />
        <span>
          Parents<small aria-hidden="true">Hold 2s</small>
        </span>
      </button>
      <span className="sr-only" id="parent-access-hint">
        Hold for two seconds, or activate with a keyboard or assistive
        technology to open settings.
      </span>
    </header>
  );
}
