#!/usr/bin/env node
/**
 * dsh-eye · vision 看图脚本
 * ---------------------------------------------------------------
 * 给纯文本模型一双"眼睛"：通过任意 OpenAI 兼容视觉端点，完成
 * 图片描述 / 视觉问答 / OCR 三种任务。零依赖，仅需 Node 18+。
 *
 * 用法：
 *   node vision.mjs <image_source> [指令] [--mode describe|ask|ocr]
 *   node vision.mjs <image_source> --mode ocr
 *   node vision.mjs <image_source> "这张图里有多少只猫？" --mode ask
 *
 * 图片来源：本地文件路径 / http(s) URL / data:image/...;base64,...
 *
 * 配置（命令行参数 > 环境变量 > 预设）：
 *   --base-url  | DASHEYE_BASE_URL  | DASHEYE_PRESET (openai|glm|qwen|ollama)
 *   --model     | DASHEYE_MODEL
 *   --api-key   | DASHEYE_API_KEY | OPENAI_API_KEY
 * ---------------------------------------------------------------
 */
import { readFile } from "node:fs/promises";
import { readFileSync, rmSync } from "node:fs";
import { extname, join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";

const NAME = "dsh-eye";

const DESCRIBE_PROMPT = `请详细描述这张图片的内容。要求：
1. 整体场景与主题
2. 主要元素及其位置关系
3. 颜色、风格、氛围
4. 图片中的文字（如有，逐字列出）
5. 可能存在的问题（模糊、截断、构图等）`;

const OCR_PROMPT = `请识别这张图片中的所有文字，逐字输出，保持原始排版顺序。只输出识别到的文字，不要添加任何评论。`;

const VISION_PRESETS = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  glm: { baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4v-flash" },
  qwen: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-vl-max" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "llava" },
};

const EXT_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
};

function usage() {
  console.log(`用法：node vision.mjs <图片来源> [指令] [--mode describe|ask|ocr] [--base-url URL] [--model MODEL] [--api-key KEY]`);
  console.log(`示例：`);
  console.log(`  node vision.mjs "C:\\Users\\me\\Pictures\\test.png"`);
  console.log(`  node vision.mjs "https://example.com/a.png" --mode ocr`);
  console.log(`  node vision.mjs "C:\\x\\a.png" "图里有什么问题？" --mode ask`);
  process.exit(0);
}

function parseArgs(argv) {
  const args = { mode: "describe", positionals: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mode") args.mode = String(argv[++i] ?? "");
    else if (a === "--model") args.model = String(argv[++i] ?? "");
    else if (a === "--base-url") args.baseUrl = String(argv[++i] ?? "");
    else if (a === "--api-key") args.apiKey = String(argv[++i] ?? "");
    else if (a === "--max-tokens") args.maxTokens = Number(argv[++i] ?? 0);
    else if (a === "--help" || a === "-h") usage();
    else if (a.startsWith("--")) {
      console.error(`${NAME}: 未知参数 ${a}（用 --help 查看用法）`);
      process.exit(2);
    } else args.positionals.push(a);
  }
  return args;
}

/** 配置文件路径：~/.dsh-eye.json（setup.ps1 与注册表同步写入，沙箱内纯文件读取不受限）。 */
function configFilePath() {
  return join(homedir(), ".dsh-eye.json");
}

/** 读取 ~/.dsh-eye.json（无子进程，受限沙箱也可用）。 */
function userConfigFile() {
  try {
    const data = JSON.parse(readFileSync(configFilePath(), "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

/** 读取用户级环境变量文本。
 *  方式 1：直接捕获 reg 输出（普通终端）；
 *  方式 2：受限沙箱禁止管道捕获时，改用 cmd 重定向到临时文件再读（文件 IO 不受限）。 */
function queryRegistryText() {
  try {
    return execFileSync("reg", ["query", "HKCU\\Environment"], { encoding: "utf8", windowsHide: true, timeout: 5000 });
  } catch {
    /* 受限环境：管道捕获被禁 → 走方式 2 */
  }
  try {
    const tmp = join(tmpdir(), `dsh-eye-reg-${process.pid}.txt`);
    const r = spawnSync("cmd.exe", ["/d", "/s", "/c", `reg query HKCU\\Environment > "${tmp}" 2>&1`], {
      stdio: "ignore", windowsHide: true, timeout: 5000,
    });
    if (r.status === 0) {
      const text = readFileSync(tmp, "utf8");
      rmSync(tmp, { force: true });
      return text;
    }
    rmSync(tmp, { force: true });
  } catch {
    /* 注册表不可用时静默降级 */
  }
  return "";
}

/** 用户级配置回退（仅 Windows 需要）：进程环境缺失时依次读 ~/.dsh-eye.json → 注册表。
 *  设置 DASHEYE_IGNORE_USER_ENV=1 可禁用（沙箱/CI 等隔离环境用）。 */
let userEnvCache;
function userEnv() {
  if (userEnvCache !== undefined) return userEnvCache;
  userEnvCache = {};
  if (process.platform !== "win32" || process.env.DASHEYE_IGNORE_USER_ENV === "1") return userEnvCache;
  Object.assign(userEnvCache, userConfigFile());
  const text = queryRegistryText();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s{4}([^ \t]+)\s+REG_\w+\s+(.*)$/.exec(line);
    if (m && m[1] !== "(Default)") userEnvCache[m[1]] = m[2].trim();
  }
  return userEnvCache;
}

function resolveConfig(args) {
  const env = userEnv();
  const preset = process.env.DASHEYE_PRESET || env.DASHEYE_PRESET || "openai";
  const p = VISION_PRESETS[preset] ?? VISION_PRESETS.openai;
  return {
    baseUrl: (args.baseUrl || process.env.DASHEYE_BASE_URL || env.DASHEYE_BASE_URL || p.baseUrl).replace(/\/+$/, ""),
    model: args.model || process.env.DASHEYE_MODEL || env.DASHEYE_MODEL || p.model,
    apiKey: args.apiKey || process.env.DASHEYE_API_KEY || env.DASHEYE_API_KEY || process.env.OPENAI_API_KEY || "",
    maxTokens: args.maxTokens || 1024,
  };
}

/** 把图片来源解析为 OpenAI 兼容的 image_url 内容。 */
async function resolveImage(source) {
  if (source.startsWith("data:")) {
    const comma = source.indexOf(",");
    if (comma < 0) throw new Error("无效的 data URI：缺少逗号");
    const mime = /^data:([^;]+)/.exec(source)?.[1] ?? "application/octet-stream";
    return { type: "image_url", image_url: { url: source } };
  }
  if (/^https?:\/\//i.test(source)) {
    return { type: "image_url", image_url: { url: source } };
  }
  const data = await readFile(source);
  const mime = EXT_MIME[extname(source).toLowerCase()] ?? "application/octet-stream";
  return {
    type: "image_url",
    image_url: { url: `data:${mime};base64,${data.toString("base64")}` },
  };
}

/** 调用视觉模型，返回文字结果。 */
async function callVision(config, prompt, image, signal) {
  if (!config.apiKey) {
    throw new Error(
      `${NAME}: 未配置 API Key。已检查：命令行参数、环境变量、~/.dsh-eye.json、用户注册表，均未找到。` +
        `请运行 scripts\\setup.ps1 完成配置（或设置环境变量 DASHEYE_API_KEY / OPENAI_API_KEY）后重试。`
    );
  }
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }, image],
        },
      ],
    }),
    signal,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${NAME}: 视觉 API ${response.status} ${response.statusText}：${body.slice(0, 400)}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${NAME}: 视觉 API 返回为空`);
  return content.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.positionals.length === 0) usage();
  const source = args.positionals[0];
  const instruction = args.positionals[1] ?? "";
  const config = resolveConfig(args);

  const prompt =
    args.mode === "ocr"
      ? OCR_PROMPT
      : args.mode === "ask"
        ? `请根据这张图片回答：${instruction || "请描述这张图片"}`
        : instruction || DESCRIBE_PROMPT;

  const image = await resolveImage(source);
  const text = await callVision(config, prompt, image, AbortSignal.timeout(120_000));
  process.stdout.write(text + "\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
