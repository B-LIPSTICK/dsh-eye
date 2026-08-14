// 本地 mock OpenAI 兼容服务：/v1/chat/completions + /v1/images/generations
import { createServer } from "node:http";

/** 1x1 透明 PNG。 */
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

export function createMockServer(port = 3999) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);

    if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const parsed = JSON.parse(body);
        const content = parsed.messages?.[0]?.content ?? [];
        const text = content.find?.((p) => p.type === "text")?.text ?? "";
        const hasImage = content.some?.((p) => p.type === "image_url") ?? false;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: `MOCK_VISION_OK model=${parsed.model} hasImage=${hasImage} prompt=${text.slice(0, 40)}`,
                },
              },
            ],
          })
        );
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/images/generations") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const parsed = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            data: [{ b64_json: PNG_1PX.toString("base64") }],
            _echo: { model: parsed.model, size: parsed.size },
          })
        );
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
