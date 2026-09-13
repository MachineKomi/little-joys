/** The painted master has almost-opaque interior alpha (251–253). Drawing
 * overlapping affine patches compounds that alpha into visible dark seams.
 * Prepare one bounded material surface: flatten only the nearly-opaque interior
 * against this scene's background, preserving its displayed RGB and soft outline.
 * This is renderer preparation; original shipped artwork is unchanged. */
export function prepareTexture(
  image: HTMLImageElement,
): HTMLCanvasElement | undefined {
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(768, image.naturalWidth);
  canvas.height = Math.min(768, image.naturalHeight);
  try {
    // Read once during preparation, then use this surface hundreds of times per
    // moving frame. Keep the normal drawing path instead of requesting a CPU
    // readback surface for an otherwise static texture.
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rgba = pixels.data;
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i + 3] < 240) continue;
      const alpha = rgba[i + 3] / 255;
      rgba[i] = Math.round(rgba[i] * alpha + 251 * (1 - alpha));
      rgba[i + 1] = Math.round(rgba[i + 1] * alpha + 247 * (1 - alpha));
      rgba[i + 2] = Math.round(rgba[i + 2] * alpha + 239 * (1 - alpha));
      rgba[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  } catch {
    canvas.width = canvas.height = 0;
    return undefined;
  }
}
