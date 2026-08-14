<#
.SYNOPSIS
  dsh-eye 一键安装：自动把 skill 复制到你的 skills 目录，并启动配置向导。

.DESCRIPTION
  新手不需要理解 skills 目录、路径、环境变量——本脚本全部代劳：
    1. 把 dsh-eye 文件夹安装到 $env:USERPROFILE\.agents\skills\dsh-eye
    2. 启动配置向导：除了 API Key 必填，其余直接回车用免费默认（智谱）
    3. 提示下一步怎么用

.PARAMETER SkipSetup
  只安装不启动配置向导

.PARAMETER Force
  已存在旧版时直接覆盖，不询问

.EXAMPLE
  .\install.ps1                 # 安装 + 配置向导
  .\install.ps1 -SkipSetup      # 只安装
#>
[CmdletBinding()]
param(
  [switch]$SkipSetup,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$src = Join-Path $PSScriptRoot "dsh-eye"
$dst = Join-Path $env:USERPROFILE ".agents\skills\dsh-eye"

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   dsh-eye 一键安装" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan

# 0. 检查
if (-not (Test-Path $src)) {
  Write-Host "错误：找不到 $src" -ForegroundColor Red
  Write-Host "install.ps1 应放在仓库根目录（与 dsh-eye 文件夹同级）运行。" -ForegroundColor Red
  exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "未检测到 Node.js，请先安装：https://nodejs.org" -ForegroundColor Red
  exit 1
}
Write-Host "   [OK] 环境检查通过（Node.js）"

# 1. 安装到 skills 目录
Write-Host "`n==> 安装到 $dst"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
if (Test-Path $dst) {
  if (-not $Force) {
    $ans = Read-Host "已存在旧版，覆盖？[y/N]"
    if ($ans -notmatch "^(y|yes|是)$") {
      Write-Host "已取消。"
      exit 0
    }
  }
  Remove-Item -Recurse -Force $dst
}
Copy-Item -Recurse $src $dst
Write-Host "   [OK] 已安装到 $dst"

# 2. 配置向导
if (-not $SkipSetup) {
  Write-Host "`n==> 启动配置向导"
  Write-Host "   （API Key 必填；其余直接回车使用免费默认：智谱 glm-4v-flash + cogview-3-flash）"
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dst "scripts\setup.ps1")
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "向导未正常完成，可稍后重跑：powershell -File $dst\scripts\setup.ps1" -ForegroundColor Yellow
  }
}

# 3. 完成
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "   安装完成！" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  下一步："
Write-Host "   1. 重启你的会话 / 新开一个 DSH 会话"
Write-Host "   2. 直接说：看看这张图 C:\Users\你\Pictures\test.png"
Write-Host "      或：帮我画一只赛博朋克风格的猫"
Write-Host ""
Write-Host "  重新安装：重新 clone 后在仓库根再跑一次本脚本即可。"
Write-Host ""
