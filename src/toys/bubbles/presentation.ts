import type { View } from "../../core/types";

interface Bubble {
  x: number;
  y: number;
  radius: number;
  state: string;
  forming: number;
}
interface Burst {
  x: number;
  y: number;
  radius: number;
  life: number;
  pop: boolean;
  seed: number;
}
const colors = ["#fff5ba", "#73eced", "#ff9fbd", "#c3aeff"];

function ring(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  width: number,
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function paintPond(
  ctx: CanvasRenderingContext2D,
  view: View,
  bubbles: readonly Bubble[],
  effects: readonly Burst[],
  playful: boolean,
  sprite?: HTMLImageElement,
) {
  const { width: w, height: h } = view;
  const water = ctx.createLinearGradient(0, 0, w * 0.3, h);
  water.addColorStop(0, "#d9f6ed");
  water.addColorStop(0.45, "#9ce3de");
  water.addColorStop(1, "#69c9d3");
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, w, h);
  // Still, broad water contours make a room for the bubbles without an idle loop.
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, h * (0.76 + i * 0.065));
    ctx.bezierCurveTo(
      w * 0.34,
      h * (0.68 + i * 0.065),
      w * 0.62,
      h * (0.93 + i * 0.04),
      w,
      h * (0.82 + i * 0.065),
    );
    ctx.strokeStyle = i === 1 ? "#d0f5ed80" : "#318fa323";
    ctx.lineWidth = i === 1 ? 3 : 14;
    ctx.stroke();
  }
  for (const b of bubbles) {
    if (b.state !== "ready") continue;
    const formed = 1 - b.forming / 0.22;
    const r = b.radius * (playful ? 0.82 + 0.18 * (1 - (1 - formed) ** 3) : 1);
    ctx.globalAlpha = 0.35 + 0.65 * formed;
    const fill = ctx.createRadialGradient(
      b.x - r * 0.28,
      b.y - r * 0.35,
      r * 0.05,
      b.x,
      b.y,
      r,
    );
    fill.addColorStop(0, "#ffffffb0");
    fill.addColorStop(0.8, "#defafa25");
    fill.addColorStop(1, "#4b91bc80");
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (sprite)
      ctx.drawImage(sprite, b.x - r - 2, b.y - r - 2, r * 2 + 4, r * 2 + 4);
    else {
      ring(ctx, b.x, b.y, r, "#5f8fb6", 2);
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 0.8, Math.PI * 1.12, Math.PI * 1.6);
      ctx.strokeStyle = "#ffffffd9";
      ctx.lineWidth = 5;
      ctx.stroke();
    }
  }
  for (const e of effects) {
    const age = Math.max(0, Math.min(1, 1 - e.life / 0.55));
    const ease = 1 - (1 - age) ** 3;
    ctx.globalAlpha = (1 - age) ** 1.4;
    if (!e.pop) {
      ring(
        ctx,
        e.x,
        e.y,
        e.radius * (1 + (playful ? ease : 0)),
        "#effff6",
        2.5,
      );
      continue;
    }
    if (sprite && age < 0.16) {
      const r = e.radius * (1 - age * 1.8);
      ctx.globalAlpha = 1 - age / 0.16;
      ctx.drawImage(sprite, e.x - r, e.y - r, r * 2, r * 2);
      ctx.globalAlpha = (1 - age) ** 1.4;
    }
    ring(
      ctx,
      e.x,
      e.y,
      e.radius * (1 + (playful ? 0.48 * ease : 0)),
      "#e8fff3",
      3 * (1 - age) + 0.5,
    );
    if (!playful) {
      // Quiet mode still shows the iridescent shell breaking, in place.
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + e.seed * 0.17;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 0.86, a, a + 0.42 * (1 - age));
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 4 * (1 - age) + 1;
        ctx.stroke();
      }
    }
    if (playful) {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + e.seed * 0.17;
        const distance = e.radius * (0.75 + ease * (0.55 + (i % 2) * 0.22));
        const x = e.x + Math.cos(a) * distance,
          y = e.y + Math.sin(a) * distance + age * age * 20;
        ctx.fillStyle = colors[(i + e.seed) % colors.length];
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          3 + (1 - age) * 3,
          2 + (1 - age) * 6,
          a + Math.PI / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
          e.x,
          e.y,
          e.radius * (0.75 + ease * 0.3),
          a,
          a + 0.25 * (1 - age),
        );
        ctx.strokeStyle = colors[(i + 1) % colors.length];
        ctx.lineWidth = 3 * (1 - age) + 1;
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}
