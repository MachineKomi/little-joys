export interface RollingBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  fixed?: boolean;
}

const EDGE_INSET = 24;
const DRAG = 3.2;
const EDGE_RESTITUTION = 0.58;
const BODY_RESTITUTION = 0.55;
const MAX_SPEED = 700;
const SLEEP_SPEED = 7;
const MAX_DT = 1 / 30;
const SUBSTEP = 1 / 120;
const MAX_SUBSTEPS = 4;
const TWO_PI = Math.PI * 2;

const ZERO_DISTANCE_NORMALS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function finiteNumber(value: unknown): value is number {
  return Number.isFinite(value as number);
}

function isValidBody(body: RollingBody): boolean {
  if (
    !finiteNumber(body.x) ||
    !finiteNumber(body.y) ||
    !finiteNumber(body.vx) ||
    !finiteNumber(body.vy) ||
    !finiteNumber(body.angle)
  ) {
    return false;
  }
  return true;
}

function sanitizeBody(body: RollingBody): void {
  body.x = 0;
  body.y = 0;
  body.vx = 0;
  body.vy = 0;
  body.angle = 0;
}

function applyFriction(velocity: number, dt: number): number {
  return velocity * Math.exp(-DRAG * dt);
}

function clampSpeedScale(vx: number, vy: number): number {
  const speed = Math.hypot(vx, vy);
  return speed > MAX_SPEED ? MAX_SPEED / speed : 1;
}

function boundaryFor(value: number, margin: number, limit: number): number {
  return clamp(value, margin, Math.max(limit - margin, margin));
}

function shouldSleep(vx: number, vy: number): boolean {
  return Math.hypot(vx, vy) < SLEEP_SPEED;
}

function normalizeAngle(angle: number): number {
  return angle % TWO_PI;
}

export function rollStep(
  bodies: RollingBody[],
  view: { width: number; height: number },
  radius: number,
  dt: number,
): boolean {
  if (
    !Array.isArray(bodies) ||
    bodies.length < 1 ||
    !finiteNumber(view?.width) ||
    !finiteNumber(view?.height) ||
    !finiteNumber(radius) ||
    !finiteNumber(dt) ||
    dt <= 0
  ) {
    return false;
  }

  const safeRadius = Math.max(0, radius);
  const safeViewWidth = view.width;
  const safeViewHeight = view.height;
  const marginX = Math.min(safeRadius + EDGE_INSET, safeViewWidth / 2);
  const marginY = Math.min(safeRadius + EDGE_INSET, safeViewHeight / 2);
  const collapsedX = safeViewWidth <= marginX * 2;
  const collapsedY = safeViewHeight <= marginY * 2;
  const centerX = safeViewWidth / 2;
  const centerY = safeViewHeight / 2;

  const stepDt = Math.min(dt, MAX_DT);
  const substeps = Math.min(
    MAX_SUBSTEPS,
    Math.max(1, Math.ceil(stepDt / SUBSTEP)),
  );
  const fixedStepDt = stepDt / substeps;

  const count = Math.min(2, bodies.length);
  const validBody = new Array<boolean>(count);

  for (let i = 0; i < count; i++) {
    const body = bodies[i];
    if (!body) continue;
    const valid = isValidBody(body);
    const isFixed = body.fixed === true;
    if (!valid && !isFixed) sanitizeBody(body);

    validBody[i] = valid || !isFixed;
    if (!valid) {
      continue;
    }
  }

  for (let sub = 0; sub < substeps; sub++) {
    for (let i = 0; i < count; i++) {
      const body = bodies[i];
      if (!body || body.fixed || !validBody[i]) continue;

      body.vx = applyFriction(body.vx, fixedStepDt);
      body.vy = applyFriction(body.vy, fixedStepDt);
      const speedScale = clampSpeedScale(body.vx, body.vy);
      body.vx *= speedScale;
      body.vy *= speedScale;
      const dx = body.vx * fixedStepDt;
      const dy = body.vy * fixedStepDt;
      const oldX = body.x;
      body.x += dx;
      body.y += dy;

      if (collapsedX) {
        body.x = centerX;
        body.vx = 0;
      } else if (body.x < marginX) {
        body.x = marginX;
        body.vx = Math.abs(body.vx) * EDGE_RESTITUTION;
      } else if (body.x > safeViewWidth - marginX) {
        body.x = safeViewWidth - marginX;
        body.vx = -Math.abs(body.vx) * EDGE_RESTITUTION;
      }

      if (collapsedY) {
        body.y = centerY;
        body.vy = 0;
      } else if (body.y < marginY) {
        body.y = marginY;
        body.vy = Math.abs(body.vy) * EDGE_RESTITUTION;
      } else if (body.y > safeViewHeight - marginY) {
        body.y = safeViewHeight - marginY;
        body.vy = -Math.abs(body.vy) * EDGE_RESTITUTION;
      }

      if (shouldSleep(body.vx, body.vy)) {
        body.vx = 0;
        body.vy = 0;
      } else if (colliderSpeedExceeds(body.vx, body.vy)) {
        const scale = clampSpeedScale(body.vx, body.vy);
        body.vx *= scale;
        body.vy *= scale;
      }
      if (safeRadius > 0)
        body.angle = normalizeAngle(body.angle + (body.x - oldX) / safeRadius);
    }

    if (count >= 2) {
      const a = bodies[0];
      const b = bodies[1];
      const aFixed = a?.fixed === true;
      const bFixed = b?.fixed === true;
      if (!a || !b || (aFixed && bFixed)) continue;
      if (!validBody[0] || !validBody[1]) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDistance = safeRadius * 2;
      const minDistance2 = minDistance * minDistance;
      const distance2 = dx * dx + dy * dy;
      if (!Number.isFinite(distance2) || distance2 >= minDistance2) {
        continue;
      }

      let normalX = 0;
      let normalY = 0;
      let inverseMassA = aFixed ? 0 : 1;
      let inverseMassB = bFixed ? 0 : 1;
      const inverseMassSum = inverseMassA + inverseMassB;
      if (inverseMassSum <= 0) continue;

      const overlap = minDistance - Math.sqrt(distance2);
      const share = overlap / inverseMassSum;
      const moveAX = share * inverseMassA;
      const moveBX = share * inverseMassB;

      if (distance2 <= 0) {
        const needsX = !collapsedX;
        const needsY = !collapsedY;
        for (let n = 0; n < ZERO_DISTANCE_NORMALS.length; n++) {
          const candidateX = ZERO_DISTANCE_NORMALS[n][0];
          const candidateY = ZERO_DISTANCE_NORMALS[n][1];
          if ((candidateX !== 0 && !needsX) || (candidateY !== 0 && !needsY))
            continue;

          const nextAX = a.x - candidateX * moveAX;
          const nextAY = a.y - candidateY * moveAX;
          const nextBX = b.x + candidateX * moveBX;
          const nextBY = b.y + candidateY * moveBX;
          const fitsAX = nextAX >= marginX && nextAX <= safeViewWidth - marginX;
          const fitsAY =
            nextAY >= marginY && nextAY <= safeViewHeight - marginY;
          const fitsBX = nextBX >= marginX && nextBX <= safeViewWidth - marginX;
          const fitsBY =
            nextBY >= marginY && nextBY <= safeViewHeight - marginY;

          if (fitsAX && fitsAY && fitsBX && fitsBY) {
            normalX = candidateX;
            normalY = candidateY;
            break;
          }
        }
        if (normalX === 0 && normalY === 0) continue;
      } else {
        const distance = Math.sqrt(distance2);
        normalX = dx / distance;
        normalY = dy / distance;
      }

      if (!aFixed) {
        a.x -= normalX * moveAX;
        a.y -= normalY * moveAX;
      }
      if (!bFixed) {
        b.x += normalX * moveBX;
        b.y += normalY * moveBX;
      }

      if (!aFixed && !isFinite(a.x)) {
        sanitizeBody(a);
      } else if (!bFixed && !isFinite(b.x)) {
        sanitizeBody(b);
      }

      const aVx = a.fixed ? 0 : a.vx;
      const aVy = a.fixed ? 0 : a.vy;
      const bVx = b.fixed ? 0 : b.vx;
      const bVy = b.fixed ? 0 : b.vy;
      const relativeVelocity = (bVx - aVx) * normalX + (bVy - aVy) * normalY;
      if (relativeVelocity >= 0) continue;
      const impulse =
        (-(1 + BODY_RESTITUTION) * relativeVelocity) / inverseMassSum;
      const impulseX = impulse * normalX;
      const impulseY = impulse * normalY;
      if (!aFixed) {
        a.vx -= impulseX * inverseMassA;
        a.vy -= impulseY * inverseMassA;
      }
      if (!bFixed) {
        b.vx += impulseX * inverseMassB;
        b.vy += impulseY * inverseMassB;
      }

      if (!aFixed) {
        if (shouldSleep(a.vx, a.vy)) {
          a.vx = 0;
          a.vy = 0;
        } else if (colliderSpeedExceeds(a.vx, a.vy)) {
          const scale = clampSpeedScale(a.vx, a.vy);
          a.vx *= scale;
          a.vy *= scale;
        }
      }
      if (!bFixed) {
        if (shouldSleep(b.vx, b.vy)) {
          b.vx = 0;
          b.vy = 0;
        } else if (colliderSpeedExceeds(b.vx, b.vy)) {
          const scale = clampSpeedScale(b.vx, b.vy);
          b.vx *= scale;
          b.vy *= scale;
        }
      }
    }
  }

  for (let i = 0; i < count; i++) {
    const body = bodies[i];
    if (!body || body.fixed) continue;
    if (!finiteNumber(body.angle)) {
      body.angle = 0;
    } else if (safeRadius > 0) {
      body.angle = normalizeAngle(body.angle);
    }
    if (collapsedX) {
      body.x = centerX;
      body.vx = 0;
    } else {
      body.x = boundaryFor(body.x, marginX, safeViewWidth);
    }
    if (collapsedY) {
      body.y = centerY;
      body.vy = 0;
    } else {
      body.y = boundaryFor(body.y, marginY, safeViewHeight);
    }
  }

  let anyMotion = false;
  for (let i = 0; i < count; i++) {
    const body = bodies[i];
    if (!body || body.fixed) continue;
    if (!shouldSleep(body.vx, body.vy)) {
      anyMotion = true;
      break;
    }
  }

  return anyMotion;
}

function colliderSpeedExceeds(vx: number, vy: number): boolean {
  return Math.hypot(vx, vy) > MAX_SPEED;
}
