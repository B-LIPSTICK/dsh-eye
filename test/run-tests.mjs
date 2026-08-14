// dsh-eye 端到端测试：真实执行 vision.mjs / generate.mjs，对接本地 mock API
import { createMockServer, PNG_1PX } from "./mock-server.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileP = promisify(execFile);

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SCRIPTS = join(ROOT, "dsh-eye", "scripts");
const BASE = "http://127.0.0.1:3999/v1";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    failures += 1;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** 异步执行脚本（不能同步 spawn：mock 服务器在父进程里，同步会死锁）。 */
async function runScript(script, args, env = {}) {
  try {
    const { stdout } = await execFileP(
      process.execPath,
      [join(SCRIPTS, script), ...args],
      // 隔离：忽略本机用户级注册表里的真实配置，保证测试确定性
      { encoding: "utf8", env: { DASHEYE_IGNORE_USER_ENV: "1", ...process.env, ...env } }
    );
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    return { status: err.code ?? 1, stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
  }
}

const server = await createMockServer();
const dir = await mkdtemp(join(tmpdir(), "dsh-eye-test-"));
const testImage = join(dir, "test.png");
await writeFile(testImage, PNG_1PX);

console.log("\n== 1. 看图：描述（本地路径）==");
{
  const r = await runScript("vision.mjs", [testImage, "--base-url", BASE, "--model", "mock-vision", "--api-key", "k"]);
  check("退出码 0", r.status === 0, `status=${r.status} ${r.stderr?.slice(0, 100)}`);
  check("输出包含 mock 结果", r.stdout.includes("MOCK_VISION_OK"), r.stdout.slice(0, 80));
  check("请求带上了图片", r.stdout.includes("hasImage=true"), r.stdout.slice(0, 120));
}

console.log("\n== 2. 看图：视觉问答（--mode ask）==");
{
  const r = await runScript("vision.mjs", [testImage, "图里有几只猫？", "--mode", "ask", "--base-url", BASE, "--model", "mock-vision", "--api-key", "k"]);
  check("退出码 0 且输出 mock 结果", r.status === 0 && r.stdout.includes("MOCK_VISION_OK"), r.stdout.slice(0, 80));
}

console.log("\n== 3. 看图：OCR（--mode ocr）==");
{
  const r = await runScript("vision.mjs", [testImage, "--mode", "ocr", "--base-url", BASE, "--model", "mock-vision", "--api-key", "k"]);
  check("退出码 0 且输出 mock 结果", r.status === 0 && r.stdout.includes("MOCK_VISION_OK"), r.stdout.slice(0, 80));
}

console.log("\n== 4. 看图：data URI 来源 ==");
{
  const uri = `data:image/png;base64,${PNG_1PX.toString("base64")}`;
  const r = await runScript("vision.mjs", [uri, "--base-url", BASE, "--model", "mock-vision", "--api-key", "k"]);
  check("退出码 0 且输出 mock 结果", r.status === 0 && r.stdout.includes("MOCK_VISION_OK"), r.stdout.slice(0, 80));
}

console.log("\n== 5. 画图：generate.mjs ==");
{
  const out = join(dir, "gen");
  const r = await runScript("generate.mjs", ["一只赛博朋克猫", "--base-url", BASE, "--model", "mock-gen", "--api-key", "k", "--out", out]);
  check("退出码 0", r.status === 0, `status=${r.status} ${r.stderr?.slice(0, 120)}`);
  const file = r.stdout.trim();
  check("输出了文件路径", file.endsWith(".png"), file);
  let magic = null;
  try {
    const bytes = await readFile(file);
    magic = bytes.subarray(0, 4).toString("hex");
  } catch {}
  check("文件是合法 PNG", magic === "89504e47", `magic=${magic}`);
}

console.log("\n== 6. 未配置 Key 的友好报错 ==");
{
  const r = await runScript("vision.mjs", [testImage, "--base-url", BASE, "--model", "mock-vision"]);
  check("退出码非 0", r.status !== 0, `status=${r.status}`);
  check("提示配置 Key", r.stderr.includes("DASHEYE_API_KEY"), r.stderr.slice(0, 100));
}

await server.close();
await rm(dir, { recursive: true, force: true });

console.log(`\n${failures === 0 ? "🎉 全部测试通过" : `❌ ${failures} 项失败`}`);
process.exitCode = failures === 0 ? 0 : 1;
