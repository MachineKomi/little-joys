import { useState } from "react";
import type { ToyId } from "../core/types";
import { Icon } from "./icons";
import { Modal } from "./Modal";

export const toyNames: Record<ToyId, string> = {
  squishy: "Squishy Friend",
  bubbles: "Bubble Pond",
  nest: "Roll & Nest",
};
const toys: ToyId[] = ["squishy", "bubbles", "nest"];
function Preview({ toy }: { toy: ToyId }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className={`preview-fallback preview-${toy}`} aria-hidden="true">
      {toy === "squishy" && (
        <div className="tiny-friend">
          <i />
          <i />
          <b />
        </div>
      )}
      {toy === "bubbles" && (
        <>
          <i />
          <i />
          <i />
        </>
      )}
      {toy === "nest" && (
        <>
          <i />
          <b />
        </>
      )}
    </div>
  ) : (
    <img
      src={`/assets/toy-${toy}.png`}
      alt=""
      width="384"
      height="288"
      onError={() => setFailed(true)}
    />
  );
}
export function ToyPicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: ToyId;
  onSelect: (toy: ToyId) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Toybox" onClose={onClose} className="toybox-dialog">
      <div className="toy-grid">
        {toys.map((toy) => (
          <button
            key={toy}
            type="button"
            className={`toy-tile tile-${toy}`}
            aria-pressed={selected === toy}
            onClick={() => onSelect(toy)}
          >
            <div className="toy-picture">
              <Preview toy={toy} />
              {selected === toy && (
                <span className="selected-toy">
                  <Icon name="check" />
                </span>
              )}
            </div>
            <span>{toyNames[toy]}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
