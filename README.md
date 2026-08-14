<div align="center">

```
   ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  █ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█
  █ ████████████████████████████████████████████ █
  █ █                                          █ █
  █ █   dsh-eye                                 █ █
  █ █   give text-only LLMs                     █ █
  █ █   an eye + a hand                         █ █
  █ █                                          █ █
  █ █   👁  vision_describe · vision_ask · OCR █ █
  █ █   ✋  image_generate                      █ █
  █ █                                          █ █
  █ ████████████████████████████████████████████ █
  █ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█
  █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█
```

<img src="dsh-eye/assets/eye.svg" width="120" alt="dsh-eye">

# dsh-eye

**给纯文本模型（如 DeepSeek）一双眼睛 + 一双手。**

零依赖、纯 Node 脚本的 Agent Skill：让没有视觉能力的模型通过任意 **OpenAI 兼容端点**
完成看图（描述 / 问答 / OCR）与画图（文字生成图片），看图与画图后端完全独立配置。

![Node](https://img.shields.io/badge/Node-%3E%3D18-37e6c8?style=flat-square&labelColor=0a0f14)
![Deps](https://img.shields.io/badge/Dependencies-zero-37e6c8?style=flat-square&labelColor=0a0f14)
![License](https://img.shields.io/badge/License-MIT-ffb454?style=flat-square&labelColor=0a0f14)
![Platform](https://img.shields.io/badge/Platform-Windows%20·%20macOS%20·%20Linux-eafffb?style=flat-square&labelColor=0a0f14)

</div>

---

## 为什么做这个

DeepSeek 很聪明，但它看不见。与其让用户"切换支持图片的模型"，不如给模型装上
眼睛和手——这是给所有纯文本模型的一件小礼物：

| | 看图（vision） | 画图（generation） |
|---|---|---|
| 工具 | `vision.mjs` | `generate.mjs` |
| 能力 | 描述 · 问答 · OCR | 文字 → 图片 |
| 端点 | OpenAI 兼容 `/chat/completions` | OpenAI 兼容 `/images/generations` |
| 预设 | `glm`（免费）· `qwen` · `openai` · `ollama` | `glm` · `qwen` · `openai` |
| 配置 | **与画图完全独立** | 可一键复用看图配置 |

## 快速开始（3 步）

```powershell
# ① 把 dsh-eye 文件夹放进你的 skills 目录（例如 $env:USERPROFILE\.agents\skills\）
# ② 运行配置向导（交互式：看图端点 → 模型 → Key → 画图，可复用看图配置）
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.agents\skills\dsh-eye\scripts\setup.ps1"

# ③ 让模型使用它 —— 分享图片路径 / URL，或要求画图
```

> 💡 `$env:USERPROFILE` 是 PowerShell 写法；在 cmd 里用 `%USERPROFILE%`，效果相同。

> ⚠️ **新手必读 · 第 1 条**：使用 DeepSeek 等纯文本模型时，**不要直接在对话框里粘贴图片**
> ——系统会拒绝图片内容。请发送图片的**文件路径或网址**（如 `看看这张图 C:\Users\你\Pictures\test.png`），
> 模型会通过本 skill 自动"看"图。
>
> 💡 **配置即时生效**：脚本会自动读取你的用户级配置（Windows 注册表），
> 向导写完后**无需重启任何程序**，新的一次调用立即使用新配置。

> 手动配置同样简单：`$env:DASHEYE_API_KEY = "sk-xxx"` 即可起步
> （默认走智谱 `glm-4v-flash` 免费模型，画图默认 `cogview-3-flash`）。

## 用法

```bash
# 看图：描述
node dsh-eye/scripts/vision.mjs "C:\Users\me\Pictures\test.png"

# 看图：针对图片提问
node dsh-eye/scripts/vision.mjs "https://example.com/a.png" "图里有多少只猫？" --mode ask

# 看图：OCR 提取文字
node dsh-eye/scripts/vision.mjs "C:\x\scan.png" --mode ocr

# 画图：生成图片（保存到 %DSH_HOME%\storages\dsh-eye\）
node dsh-eye/scripts/generate.mjs "一只赛博朋克风格的猫，霓虹灯，雨夜"
```

图片来源支持 **本地路径** / **http(s) URL** / **data URI** 三种格式；
所有配置均可由命令行参数临时覆盖（`--base-url` / `--model` / `--api-key`）。

## 配置

| 变量 | 用途 | 回退顺序 |
|---|---|---|
| `DASHEYE_BASE_URL` · `DASHEYE_MODEL` · `DASHEYE_API_KEY` | 看图 | 参数 > 环境变量 > 预设 |
| `DASHEYE_GEN_BASE_URL` · `DASHEYE_GEN_MODEL` · `DASHEYE_GEN_API_KEY` | 画图 | 参数 > 环境变量 > 看图 |
| `DASHEYE_GEN_OUT` | 画图输出目录 | 默认 storages / tmp |
| `DASHEYE_PRESET` | 看图预设：`openai` · `glm` · `qwen` · `ollama` | — |
| `OPENAI_API_KEY` | 通用兜底 Key | — |

## 目录结构

```
dsh-eye/
├── SKILL.md              # skill 清单：触发规则 + 使用指南
├── scripts/
│   ├── vision.mjs         # 看图：描述 / 问答 / OCR（多后端，零依赖）
│   ├── generate.mjs       # 画图：文字 → 图片（自动保存 + 格式识别）
│   └── setup.ps1         # 一键配置向导（写用户级环境变量，不碰任何文件）
└── assets/
    └── eye.svg           # logo
```

## 设计说明

- **零依赖**：两个脚本只用 Node 内置模块（`fetch` / `fs` / `path`），复制即用
- **配置分离**：看图与画图端点、模型、Key 互不干扰，也可一键复用
- **友好错误**：缺 Key、格式无法识别、API 报错都有中文提示，而不是裸堆栈
- **适配纯文本模型**：SKILL.md 明确要求模型"有工具就用，不要拒绝"，从根上解决
  "模型不支持图片"的尴尬

## License

MIT © dsh-eye
