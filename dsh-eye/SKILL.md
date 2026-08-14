---
name: dsh-eye
description: >-
  让纯文本模型（如 DeepSeek）获得看图与画图能力：图片描述、视觉问答、OCR 文字提取、
  图像生成。当用户分享图片路径（本地或网络 URL）、消息中出现图片附件、或要求
  分析/描述/识别图片内容、截图分析、UI 设计评审、提取图中文字时，务必使用本 skill
  调用 vision.mjs 完成看图——即使当前模型本身不支持图片，也不要拒绝用户，用本 skill
  就能"看见"。当用户要求画图、生成图片、绘图、插图、海报、头像时，使用本 skill
  调用 generate.mjs 完成画图。模型能原生直接查看图片时（多模态模型）无需使用本 skill。
---

# dsh-eye · 给纯文本模型一双眼睛 + 一双手

通过任意 OpenAI 兼容的视觉 / 绘图端点，让不支持图片的模型（如 DeepSeek）完成
**看图**（描述 / 问答 / OCR）与**画图**（文字生成图片）任务。零依赖，纯 Node 脚本。

## 何时使用

| 用户意图 | 动作 |
|---|---|
| 给出图片路径 / URL，要求"看看这张图、描述一下、分析、识别、截图、UI 评审" | `vision.mjs`（默认描述模式） |
| 针对图片提问（"图里有多少只猫？""这报错是什么意思？"） | `vision.mjs --mode ask` |
| 提取图片中的文字（OCR） | `vision.mjs --mode ocr` |
| 要求画图 / 生成图片 / 绘图 / 插图 / 海报 / 头像 | `generate.mjs` |

**关键认知**：如果当前模型是纯文本模型（DeepSeek 等），用户给图片时必须通过
`vision.mjs` 完成看图，**不要**回复"模型不支持图片""请粘贴图片""请切换模型"——
脚本会替模型完成视觉部分，这是本 skill 存在的全部意义。

## 前提

- Node.js 18+（`node --version` 确认）
- 已配置 API Key。首次使用优先让用户运行仓库根的 `install.ps1`（一键安装 + 配置向导，
  除 API Key 外全程回车用免费默认）；已装好 skill 的则直接运行配置向导：

```powershell
# 交互式配置（看图 + 画图，除 Key 外可全部回车用免费默认）
powershell -ExecutionPolicy Bypass -File <skill路径>\scripts\setup.ps1

# 或手动设置环境变量（PowerShell）
$env:DASHEYE_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"   # 看图端点
$env:DASHEYE_MODEL    = "glm-4v-flash"                            # 看图模型（免费）
$env:DASHEYE_API_KEY  = "<看图 Key>"
$env:DASHEYE_GEN_BASE_URL = "https://open.bigmodel.cn/api/paas/v4" # 画图端点（可与看图不同）
$env:DASHEYE_GEN_MODEL    = "cogview-3-flash"                      # 画图模型
$env:DASHEYE_GEN_API_KEY  = "<画图 Key>"
```

常用端点速查（也可设 `DASHEYE_PRESET` = `openai` / `glm` / `qwen` / `ollama` 一键切换）：

| 预设 | 看图端点 | 看图模型 | 画图模型 |
|---|---|---|---|
| `glm` | `open.bigmodel.cn/api/paas/v4` | `glm-4v-flash`（免费） | `cogview-3-flash` |
| `qwen` | `dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-vl-max` | `wanx2.1-t2i-flash` |
| `openai` | `api.openai.com/v1` | `gpt-4o` | `gpt-image-1` |
| `ollama` | `localhost:11434/v1`（本地） | `llava` | — |

## 使用方式

脚本位于 `<skill路径>\scripts\`，通过 `node` 执行。图片来源支持
**本地路径** / **http(s) URL** / **data URI** 三种格式。

### 看图：描述

```bash
node <skill路径>\scripts\vision.mjs "C:\Users\me\Pictures\test.png"
node <skill路径>\scripts\vision.mjs "https://example.com/screenshot.png"
```

输出图片的详细描述（场景、元素、颜色、文字、问题）。**把输出直接作为你的回答内容**
呈现给用户，不要丢弃；可在开头补一句简短的话，但主体就是脚本输出。

### 看图：针对图片提问

```bash
node <skill路径>\scripts\vision.mjs "C:\x\a.png" "图里有多少只猫？" --mode ask
```

### 看图：OCR 提取文字

```bash
node <skill路径>\scripts\vision.mjs "C:\x\scan.png" --mode ocr
```

### 画图：生成图片

```bash
node <skill路径>\scripts\generate.mjs "一只赛博朋克风格的猫，霓虹灯，雨夜"
node <skill路径>\scripts\generate.mjs "水墨雪山" --size 512x512
```

脚本会调用绘图 API 并把图片保存到 `%DSH_HOME%\storages\dsh-eye\`（未设置 DSH_HOME
时保存到系统临时目录），**输出保存的文件路径**。把路径告诉用户，并如实说明图片已生成
（如当前环境能展示附件，再附加该文件）。

### 覆盖配置（临时指定，不改环境变量）

```bash
node vision.mjs "C:\x\a.png" --base-url https://api.openai.com/v1 --model gpt-4o --api-key sk-xxx
```

## 环境变量速查

| 变量 | 用途 | 回退顺序 |
|---|---|---|
| `DASHEYE_BASE_URL` / `DASHEYE_MODEL` / `DASHEYE_API_KEY` | 看图 | 参数 > 环境变量 > 预设 |
| `DASHEYE_GEN_BASE_URL` / `DASHEYE_GEN_MODEL` / `DASHEYE_GEN_API_KEY` | 画图 | 参数 > 环境变量 > 看图配置 |
| `DASHEYE_GEN_OUT` | 生成图片输出目录 | 默认 storages/tmp |
| `OPENAI_API_KEY` | 通用兜底 Key | — |

## 常见问题

- **环境变量里看不到 `DASHEYE_API_KEY`（但 BASE_URL/MODEL 在）**：这是正常的——安全沙箱会
  **隐藏密钥类环境变量**。不要因此放弃：直接运行 `vision.mjs` 即可，脚本会自动从用户级
  配置（Windows 注册表）读取 Key。也不要花时间翻找配置文件，先运行脚本。
- **报"未配置 API Key"**：运行 `setup.ps1` 配置，或设置 `DASHEYE_API_KEY`（画图用
  `DASHEYE_GEN_API_KEY`），然后重试。
- **图片是粘贴进对话的（不是路径/URL）**：纯文本模型无法获得图片字节。礼貌地请用户
  提供图片的文件路径或 URL，说明这样模型才能"看"到它（不要暴露"模型不支持图片"的
  底层细节，用"路径方式更清晰"的说法即可）。
- **画图报错 4xx**：确认画图端点支持 `/images/generations` 且模型名正确；免费模型
  如智谱 `cogview-3-flash` 部分尺寸不支持，可加 `--size 1024x1024`。
- **中文描述效果不佳**：生成图片时可在描述后追加英文关键词，效果通常更好。
