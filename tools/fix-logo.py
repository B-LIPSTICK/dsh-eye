#!/usr/bin/env python3
"""dsh-eye 图标精修：AI 底子 + 确定性修正
1) 橙色虹膜 → 纯青 #37E6C8（色度蒙版替换 + 膨胀去锯齿）
2) 眼睛下方叠印精确 "dsh-eye" 打字机字样（错位叠印模拟 misregistration）
用法: python tools/fix-logo.py <input.png> <output.png>
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

CYAN = (55, 230, 200)
INK = (43, 38, 32)


def fix_iris(arr):
    """橙色/橙黄像素 → 纯青。"""
    r, g, b = arr[..., 0].astype(int), arr[..., 1].astype(int), arr[..., 2].astype(int)
    mask = (r > 140) & (g < 215) & (b < 140) & (r > g + 15) & (g > b + 15)
    # 膨胀 1px，让替换边缘平滑，避免锯齿
    m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
    mask = np.asarray(m) > 127
    out = arr.copy()
    out[mask] = (CYAN[0], CYAN[1], CYAN[2])
    return out, mask


def eye_bbox(arr):
    """深色内容（墨线/瞳孔）包围盒。"""
    gray = arr[..., :3].mean(axis=2)
    mask = gray < 110
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    return (xs.min(), ys.min(), xs.max(), ys.max())


def stamp_text(img, bbox):
    """在眼睛下方叠印打字机小字。"""
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    size = max(36, int(h * 0.42))
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/cour.ttf", size)
    except Exception:
        font = ImageFont.load_default()
    d = ImageDraw.Draw(img)
    text = "dsh-eye"
    # 用临时画布量宽
    probe = Image.new("RGBA", (10, 10))
    tw = d.textlength(text, font=font)
    tx = int(x0 + (w - tw) / 2)
    ty = int(y1 + h * 0.55)
    # 错位叠印两层（misregistration），再主层
    d.text((tx + 3, ty + 2), text, font=font, fill=(43, 38, 32, 80))
    d.text((tx + 1, ty + 1), text, font=font, fill=(120, 105, 90, 130))
    d.text((tx, ty), text, font=font, fill=INK)
    return ty + size


def main(src, dst):
    img = Image.open(src).convert("RGB")
    arr = np.asarray(img)
    arr, _ = fix_iris(arr)
    img = Image.fromarray(arr)
    bbox = eye_bbox(arr)
    if bbox is None:
        print("warning: 未找到眼睛区域")
    else:
        stamp_text(img, bbox)
    img.save(dst)
    print(f"fixed -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
