<div align="center">

[简体中文](README.md) | **English**

<img src="dsh-eye/assets/icon-logo.png" width="120" alt="dsh-eye">

# dsh-eye

> Turn every text-only LLM into an agent that can see and draw.

**dsh-eye is a zero-dependency Agent Skill** that lets image-blind models like
DeepSeek see (describe / VQA / OCR) and draw through any **OpenAI-compatible
endpoint**. Vision and generation backends are configured independently — a
one-click wizard, and changes take effect instantly.

![Node](https://img.shields.io/badge/Node-%3E%3D18-37e6c8?style=flat-square&labelColor=0a0f14)
![Deps](https://img.shields.io/badge/Dependencies-zero-37e6c8?style=flat-square&labelColor=0a0f14)
![License](https://img.shields.io/badge/License-MIT-ffb454?style=flat-square&labelColor=0a0f14)
![Platform](https://img.shields.io/badge/Platform-Windows%20·%20macOS%20·%20Linux-eafffb?style=flat-square&labelColor=0a0f14)

</div>

---

<details open>
<summary><b>📑 Table of Contents</b></summary>

- [Quick Start (2 steps, 5 minutes)](#quick-start-2-steps-5-minutes)
- [Usage](#usage)
- [Features](#features)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Privacy](#privacy)
- [Costs](#costs)
- [FAQ](#faq)
- [Development & Testing](#development--testing)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Credits](#credits)
- [License](#license)

</details>

---

## Quick Start (2 steps, 5 minutes)

```powershell
# ① Download and install in one shot (copies the skill into your skills dir
#    and launches the config wizard)
git clone https://github.com/B-LIPSTICK/dsh-eye.git
cd dsh-eye
.\install.cmd

# ② In the wizard, only the API key is required — press Enter everywhere else
#    to use the free defaults (Zhipu). Then restart your session and share an
#    image path / URL to see it.
```

> ⚠️ In PowerShell, run current-directory commands with a `.\` prefix (in cmd
> just type `install.cmd`, or double-click the file).

> ⚠️ **New to this?** With text-only models like DeepSeek, **don't paste images
> directly into the chat** — the system rejects image content. Send the image's
> **file path or URL** instead (e.g. `look at C:\Users\you\Pictures\test.png`).
>
> 💡 No git? Use the **Download ZIP** button and run `install.cmd` inside the
> extracted folder. Prefer manual setup? One command is enough to start (free
> Zhipu defaults): PowerShell `$env:DASHEYE_API_KEY = "sk-xxx"` or
> cmd `set DASHEYE_API_KEY=sk-xxx`. Config takes effect instantly — the scripts
> read `~/.dsh-eye.json` and the Windows registry, no restarts needed.

## Usage

**In a conversation (the common case)**

```
Look at C:\Users\you\Pictures\test.png
What text is in this image? https://example.com/a.png
Draw a cyberpunk cat
```

**On the command line (direct calls)**

```bash
node dsh-eye/scripts/vision.mjs "C:\Users\me\Pictures\test.png"                    # describe
node dsh-eye/scripts/vision.mjs "a.png" "How many cats?" --mode ask                # VQA
node dsh-eye/scripts/vision.mjs "scan.png" --mode ocr                              # OCR
node dsh-eye/scripts/generate.mjs "a cyberpunk cat, neon, rainy night"             # generate
node dsh-eye/scripts/vision.mjs "a.png" --base-url ... --model ... --api-key ...   # temporary overrides
```

## Features

| | Vision | Generation |
|---|---|---|
| Script | `vision.mjs` | `generate.mjs` |
| Capability | Describe · VQA · OCR | Text → image |
| Endpoint | OpenAI-compatible `/chat/completions` | OpenAI-compatible `/images/generations` |
| Presets | `glm` (free) · `qwen` · `openai` · `ollama` | `glm` · `qwen` · `openai` |
| Config | **Fully independent from generation** | Can reuse vision config in one click |

- **Zero dependencies** — only Node built-ins (`fetch` / `fs` / `path`); copy and use
- **Instant config** — scripts read user-level config (`~/.dsh-eye.json` + Windows
  registry), so changes apply immediately, even inside sandboxed environments
- **Friendly errors** — every failure (missing key, bad format, API errors) has a
  clear message listing every config source that was checked
- **Never refuses** — SKILL.md instructs the model to use the tools instead of
  replying "this model doesn't support images"
- **Three source formats** — local paths, http(s) URLs, and data URIs all work

## Configuration

Priority: **CLI args > environment variables > `~/.dsh-eye.json` > Windows registry > presets > built-in defaults**.

| Variable | Purpose | Fallback order |
|---|---|---|
| `DASHEYE_BASE_URL` · `DASHEYE_MODEL` · `DASHEYE_API_KEY` | Vision | args > env > file/registry > preset |
| `DASHEYE_GEN_BASE_URL` · `DASHEYE_GEN_MODEL` · `DASHEYE_GEN_API_KEY` | Generation | args > env > file/registry > vision config |
| `DASHEYE_GEN_OUT` | Generation output dir | default storages / tmp |
| `DASHEYE_PRESET` / `DASHEYE_GEN_PRESET` | Vision / generation presets | — |
| `OPENAI_API_KEY` | Universal fallback key | — |

Common endpoint presets:

| Preset | Vision endpoint | Vision model | Generation model |
|---|---|---|---|
| `glm` | `open.bigmodel.cn/api/paas/v4` | `glm-4v-flash` (free) | `cogview-3-flash` |
| `qwen` | `dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-vl-max` | `wanx2.1-t2i-flash` |
| `openai` | `api.openai.com/v1` | `gpt-4o` | `gpt-image-1` |
| `ollama` | `localhost:11434/v1` (local) | `llava` | — |

## How It Works

```text
Agent session (DeepSeek or another text-only model)
   │  User: "look at C:\x\a.png"
   ▼
dsh-eye skill (triggered via SKILL.md)
   │  node scripts\vision.mjs "C:\x\a.png"
   ▼
vision.mjs
   │  ① resolve config: args > env > ~/.dsh-eye.json > registry > preset
   │  ② read image bytes → base64 data URI
   │  ③ POST {baseUrl}/chat/completions (image_url content part)
   ▼
OpenAI-compatible vision endpoint (Zhipu / Qwen / OpenAI / Ollama …)
   │  returns a text description
   ▼
The model turns the result into its answer
```

Generation works the same way: `generate.mjs` calls `/images/generations`, saves
the image to `%DSH_HOME%\storages\dsh-eye\` (or the system temp dir when
`DSH_HOME` is unset), and prints the file path.

## Privacy

- **Where images go**: only to the vision/generation endpoint you configured
  (`DASHEYE_*_BASE_URL`); the scripts never relay, log, or store them
- **Where the API key lives**: only on your machine (`~/.dsh-eye.json` and the
  user-level registry) — never shipped with the repo, never uploaded
- **No telemetry**: no analytics, no beacon, no network callbacks; fully offline
  capable (local Ollama is completely offline)
- With a **custom** endpoint, images and keys go directly to the address you
  entered, governed by that provider's policy

## Costs

Billed at whatever your chosen model charges. Zero-cost starting combos:

- Zhipu `glm-4v-flash` (vision) and `cogview-3-flash` (generation) are free
- Local Ollama + `llava` is fully offline and free

## FAQ

- **`DASHEYE_API_KEY` is missing from the environment (but BASE_URL/MODEL are there)**:
  that's expected — secure sandboxes **hide secret-looking env vars**. Just run the
  script; it reads the key from `~/.dsh-eye.json` / the registry automatically.
- **"No API key configured"**: run `setup.ps1` (writes both the config file and the
  registry), or set `DASHEYE_API_KEY` manually (`DASHEYE_GEN_API_KEY` for drawing).
- **The image was pasted into the chat (no path/URL)**: text-only models can't get
  the image bytes — ask for a file path or URL.
- **Generation returns 4xx**: make sure the endpoint supports `/images/generations`
  and the model name is correct; some free models only accept specific sizes,
  try `--size 1024x1024`.
- **Chinese prompts give weak results**: append English keywords to generation
  prompts for better output.

## Development & Testing

```bash
node test/run-tests.mjs   # e2e tests against a mock OpenAI-compatible API, no real key (12 assertions)
powershell -ExecutionPolicy Bypass -File dsh-eye/scripts/setup.ps1 -DryRun  # wizard preview
```

Test isolation: `DASHEYE_IGNORE_USER_ENV=1` makes the scripts ignore local
user-level config for deterministic tests.

## Project Structure

```
dsh-eye/
├── SKILL.md              # skill manifest: trigger rules + usage guide
├── scripts/
│   ├── vision.mjs        # vision: describe / VQA / OCR (multi-backend, zero-dep)
│   ├── generate.mjs      # generation: text → image (auto-save + format sniffing)
│   ├── setup.ps1         # one-click config wizard (registry + config file)
│   └── setup.cmd         # cmd entry for the wizard (cmd / PowerShell / double-click)
└── assets/
    ├── icon-logo.png     # main icon (README hero)
    ├── icon-logo-500.png # GitHub repository picture (circular-safe)
    ├── icon-editorial.png# editorial-style alternative
    ├── icon-zine.png     # paper zine alternative
    └── eye.svg           # original vector logo

repo root:
├── install.ps1           # one-click installer (PowerShell)
└── install.cmd           # one-click installer (cmd / PowerShell / double-click)
```

## Roadmap

- [ ] macOS / Linux config wizard (scripts are cross-platform; the wizard is Windows-first)
- [ ] More presets (Gemini, local vLLM templates)
- [ ] Image preprocessing (auto-downscale large images to save tokens)
- [ ] Result caching (repeated lookups don't re-bill)
- [ ] Generated images returned as attachments

## Credits

- [dsh-plugin-deepeye](https://www.npmjs.com/package/dsh-plugin-deepeye): reference
  implementation for the original plugin form
- This project shipped early as a DSH plugin (since unpublished), then was rebuilt
  as a Skill for simpler distribution
- DeepSeek Harness ecosystem: the skill mechanism that carries it

## License

[MIT](LICENSE)
