import { clamp } from "../../core/coordinates";
import type { View } from "../../core/types";

export interface Point {
  x: number;
  y: number;
}
export interface NestLayout {
  radius: number;
  opening: Point & { rx: number; ry: number };
  slots: Point[];
  initial: Point[];
}
export const EDGE_MARGIN = 24;
export const GRAB_MARGIN = 20;
export const DROP_TOLERANCE = 24;
export function nestLayout(view: View, count: 1 | 2): NestLayout {
  const radius = Math.max(
    8,
    Math.min(
      80,
      (view.width - EDGE_MARGIN * 2) / 5.2,
      (view.height - EDGE_MARGIN * 2) / 4.5,
    ),
  );
  const opening = {
    x: view.width / 2,
    y: view.height * 0.61,
    rx: radius * 2.5,
    ry: radius * 0.32,
  };
  const slots =
    count === 2
      ? [
          { x: opening.x - radius * 1.1, y: opening.y - radius * 0.42 },
          { x: opening.x + radius * 1.1, y: opening.y - radius * 0.42 },
        ]
      : [{ x: opening.x, y: opening.y - radius * 0.42 }];
  const initial =
    count === 2
      ? [
          { x: opening.x - radius * 1.2, y: opening.y - radius * 2.45 },
          { x: opening.x + radius * 1.2, y: opening.y - radius * 2.45 },
        ]
      : [{ x: opening.x - radius * 1.25, y: opening.y - radius * 2.45 }];
  return {
    radius,
    opening,
    slots,
    initial: initial.map((point) => clampBall(point, radius, view)),
  };
}
export function clampBall(point: Point, radius: number, view: View): Point {
  const xMargin = Math.min(radius + EDGE_MARGIN, view.width / 2);
  const yMargin = Math.min(radius + EDGE_MARGIN, view.height / 2);
  return {
    x: clamp(point.x, xMargin, view.width - xMargin),
    y: clamp(point.y, yMargin, view.height - yMargin),
  };
}
/** Drop tests the ball centre against the visible elliptical opening expanded by 24 CSS px. */
export function acceptsDrop(
  point: Point,
  opening: NestLayout["opening"],
): boolean {
  return (
    ((point.x - opening.x) / (opening.rx + DROP_TOLERANCE)) ** 2 +
      ((point.y - opening.y) / (opening.ry + DROP_TOLERANCE)) ** 2 <=
    1
  );
}
/** Only the just-released ball moves. Held or already-resting neighbours never move. */
export function separateReleased(
  point: Point,
  other: Point,
  radius: number,
  view: View,
): Point {
  const distance = radius * 2 + 10;
  if (Math.hypot(point.x - other.x, point.y - other.y) >= distance)
    return point;
  const angle = Math.atan2(point.y - other.y, point.x - other.x);
  const candidates = [
    angle,
    0,
    Math.PI,
    -Math.PI / 2,
    Math.PI / 2,
    Math.PI / 4,
    Math.PI * 0.75,
    -Math.PI * 0.25,
    -Math.PI * 0.75,
  ]
    .map((a) =>
      clampBall(
        {
          x: other.x + Math.cos(a) * distance,
          y: other.y + Math.sin(a) * distance,
        },
        radius,
        view,
      ),
    )
    .filter(
      (candidate) =>
        Math.hypot(candidate.x - other.x, candidate.y - other.y) >=
        distance - 0.001,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - point.x, a.y - point.y) -
        Math.hypot(b.x - point.x, b.y - point.y),
    );
  return candidates[0] ?? point;
}
