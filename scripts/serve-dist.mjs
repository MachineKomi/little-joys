import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
};

/** Static-only production harness: uses the exact shared headers from vercel.json. */
export async function startServer({
  directory = resolve("dist"),
  port = 4173,
  host = "127.0.0.1",
  transform,
} = {}) {
  const config = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${host}:${port}`);
      const pathname = decodeURIComponent(url.pathname);
      for (const rule of config.headers) {
        if (rule.source === "/(.*)" || rule.source === pathname)
          for (const header of rule.headers)
            response.setHeader(header.key, header.value);
      }
      if (transform && (await transform({ request, response, pathname })))
        return;
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405);
        response.end();
        return;
      }
      const path = resolve(
        directory,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!path.startsWith(directory + sep) || !(await stat(path)).isFile())
        throw new Error("Not found");
      response.setHeader(
        "Content-Type",
        types[extname(path)] || "application/octet-stream",
      );
      const content = await readFile(path);
      if (request.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        let start = match?.[1] ? Number(match[1]) : 0;
        let end = match?.[2] ? Number(match[2]) : content.length - 1;
        if (match && !match[1] && match[2]) {
          start = Math.max(0, content.length - Number(match[2]));
          end = content.length - 1;
        }
        if (
          !match ||
          (!match[1] && !match[2]) ||
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start >= content.length ||
          end < start
        ) {
          response.writeHead(416, {
            "Content-Range": `bytes */${content.length}`,
          });
          response.end();
          return;
        }
        end = Math.min(end, content.length - 1);
        response.setHeader(
          "Content-Range",
          `bytes ${start}-${end}/${content.length}`,
        );
        response.setHeader("Content-Length", end - start + 1);
        response.setHeader("Accept-Ranges", "bytes");
        response.writeHead(206);
        response.end(
          request.method === "HEAD"
            ? undefined
            : content.subarray(start, end + 1),
        );
        return;
      }
      response.setHeader("Content-Length", content.length);
      response.writeHead(200);
      response.end(request.method === "HEAD" ? undefined : content);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolveListen);
  });
  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const port = Number(process.env.PORT || process.argv[2] || 4173);
  await startServer({ port });
  console.log(
    `Little Joys production files with Vercel headers: http://127.0.0.1:${port}`,
  );
}
