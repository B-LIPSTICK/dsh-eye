#!/usr/bin/env node
/**
 * dsh-eye · generate 画图脚本
 * ---------------------------------------------------------------
 * 给纯文本模型一双手：通过任意 OpenAI 兼容 images/generations 端点
 * 根据文字描述生成图片并保存到本地。零依赖，仅需 Node 18+。
 *
 * 用法：
 *   node generate.mjs "<描述>" [--size 1024x1024] [--out <目录>]
 *   node generate.mjs "一只赛博朋克风格的猫" --size 512x512
 *
 * 配置（命令行参数 > 环境变量 > 预设；画图与看图完全独立）：
 *   --base-url  | DASHEYE_GEN_BASE_URL  | DASHEYE_GEN_PRESET (openai|glm|qwen)
 *   --model     | DASHEYE_GEN_MODEL
 *   --api-key   | DASHEYE_GEN_API_KEY | DASHEYE_API_KEY | OPENAI_API_KEY
 *   --out       | DASHEYE_GEN_OUT（默认 %DSH_HOME%/storages/dsh-eye 或系统临时目录）
 * ---------------------------------------------------------------
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const NAME = "dsh-eye";

const GEN_PRESETS = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-image-1" },
  glm: { baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "cogview-3-flash" },
  qwen: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "wanx2.1-t2i-flash" },
};

function usage() {
  console.log(`用法：node generate.mjs "<图片描述>" [--size 1024x1024] [--out <目录>] [--base-url URL] [--model MODEL] [--api-key KEY]`);
  console.log(`示例：`);
  console.log(`  node generate.mjs "一只赛博朋克风格的猫"`);
  console.log(`  node generate.mjs "水墨风格的雪山" --size 512x512 --out D:\\pictures`);
  process.exit(0);
}

function parseArgs(argv) {
  const args = { positionals: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--size") args.size = String(argv[++i] ?? "");
    else if (a === "--out") args.out = String(argv[++i] ?? "");
    else if (a === "--model") args.model = String(argv[++i] ?? "");
    else if (a === "--base-url") args.baseUrl = String(argv[++i] ?? "");
    else if (a === "--api-key") args.apiKey = String(argv[++i] ?? "");
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
  const preset = process.env.DASHEYE_GEN_PRESET || env.DASHEYE_GEN_PRESET || "openai";
  const p = GEN_PRESETS[preset] ?? GEN_PRESETS.openai;
  const visionKey = process.env.DASHEYE_API_KEY || env.DASHEYE_API_KEY || process.env.OPENAI_API_KEY || "";
  return {
    baseUrl: (args.baseUrl || process.env.DASHEYE_GEN_BASE_URL || env.DASHEYE_GEN_BASE_URL || p.baseUrl).replace(/\/+$/, ""),
    model: args.model || process.env.DASHEYE_GEN_MODEL || env.DASHEYE_GEN_MODEL || p.model,
    apiKey: args.apiKey || process.env.DASHEYE_GEN_API_KEY || env.DASHEYE_GEN_API_KEY || visionKey,
    size: args.size || "1024x1024",
    out: args.out || process.env.DASHEYE_GEN_OUT || env.DASHEYE_GEN_OUT || defaultOutDir(),
  };
}

function defaultOutDir() {
  if (process.env.DSH_HOME) return join(process.env.DSH_HOME, "storages", "dsh-eye");
  return join(tmpdir(), "dsh-eye");
}

/** 根据魔数识别图片格式。 */
function sniffMediaType(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "webp";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "gif";
  throw new Error(`${NAME}: 生成的图片格式无法识别（仅支持 PNG/JPEG/WebP/GIF）`);
}

async function generate(config, prompt, signal) {
  if (!config.apiKey) {
    throw new Error(
      `${NAME}: 未配置画图 API Key。已检查：命令行参数、环境变量、~/.dsh-eye.json、用户注册表，均未找到。` +
        `请运行 scripts\\setup.ps1 完成配置（或设置环境变量 DASHEYE_GEN_API_KEY / DASHEYE_API_KEY / OPENAI_API_KEY）后重试。`
    );
  }
  const response = await fetch(`${config.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      prompt,
      n: 1,
      size: config.size,
    }),
    signal,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${NAME}: 绘图 API ${response.status} ${response.statusText}：${body.slice(0, 400)}`);
  }
  const data = await response.json();
  const item = data?.data?.[0];
  if (!item) throw new Error(`${NAME}: 绘图 API 返回为空`);

  let bytes;
  if (item.b64_json) {
    bytes = Uint8Array.from(Buffer.from(item.b64_json, "base64"));
  } else if (item.url) {
    const imgResp = await fetch(item.url, { signal });
    if (!imgResp.ok) throw new Error(`${NAME}: 下载生成图片失败 ${imgResp.status}`);
    bytes = new Uint8Array(await imgResp.arrayBuffer());
  } else {
    throw new Error(`${NAME}: 绘图 API 响应缺少 url / b64_json`);
  }
  const ext = sniffMediaType(bytes);
  return { bytes, ext };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.positionals.length === 0) usage();
  const prompt = args.positionals[0];
  const config = resolveConfig(args);

  const { bytes, ext } = await generate(config, prompt, AbortSignal.timeout(180_000));

  const dir = resolve(config.out);
  await mkdir(dir, { recursive: true });
  const file = join(dir, `dsh-eye-${Date.now()}.${ext}`);
  await writeFile(file, bytes);

  process.stdout.write(`${file}\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
