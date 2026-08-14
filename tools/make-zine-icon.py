#!/usr/bin/env python3
"""dsh-eye zine 图标（gc-minimal-zine-poster 风格系统的程序化实现）
暖纸 + 大留白 + 单眼印记 + 纯青锚点 + 打字机小字 + risograph 颗粒。
确定性：所有随机使用固定种子。用法: python tools/make-zine-icon.py <out.png>
"""
import sys, random
from PIL import Image, ImageDraw, ImageFont

PAPER = (244, 237, 224, 255)      # 暖象牙纸
INK = (43, 38, 32)                # 深墨色
CYAN = (55, 230, 200)             # 纯青锚点 #37E6C8
SIZE = 1024

random.seed(42)  # 确定性


def paper(d):
    img = Image.new("RGBA", (SIZE, SIZE), PAPER)
    d = ImageDraw.Draw(img)
    # 纤维与细噪点（低密度，纸感）
    for _ in range(220):
        x, y = random.randint(0, SIZE), random.randint(0, SIZE)
        a = random.randint(6, 16)
        d.line((x, y, x + random.randint(4, 30), y + random.randint(-3, 3)),
               fill=(90, 80, 66, a), width=1)
    for _ in range(3200):
        x, y = random.randint(0, SIZE), random.randint(0, SIZE)
        r = random.choice([1, 1, 1, 2])
        d.ellipse((x, y, x + r, y + r), fill=(80, 70, 58, random.randint(6, 20)))
    return img


def stamp_eye(d, cx, cy, scale=1.0):
    """单眼印记：细线杏仁形 + 纯青虹膜 + 墨色瞳孔 + 高光。"""
    def quad(p0, p1, p2, t):
        return tuple((1 - t) ** 2 * p0[i] + 2 * (1 - t) * t * p1[i] + t * t * p2[i] for i in range(2))

    def pts(p0, p1, p2, n=100):
        return [quad(p0, p1, p2, i / n) for i in range(n + 1)]

    w = 280 * scale
    lx, rx, top, bot = cx - w / 2, cx + w / 2, cy - 70 * scale, cy + 70 * scale
    d.line(pts((lx, cy), (cx, top), (rx, cy)), fill=INK, width=7, joint="curve")
    d.line(pts((lx, cy), (cx, bot), (rx, cy)), fill=INK, width=7, joint="curve")
    # 纯青虹膜（锚点，约画布 1.8%）
    r = 46 * scale
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=CYAN)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=INK, width=5)
    # 瞳孔 + 高光
    pr = 20 * scale
    d.ellipse((cx - pr, cy - pr, cx + pr, cy + pr), fill=INK)
    d.ellipse((cx - 10 * scale, cy - 14 * scale, cx - 2 * scale, cy - 6 * scale),
              fill=(250, 250, 246, 235))


def main(out):
    img = paper(None)
    d = ImageDraw.Draw(img)
    # 眼睛印记：下左三分之一，约占画布 12%
    stamp_eye(d, 330, 470, scale=1.0)
    # 打字机小字 "dsh-eye"：先错位叠印（misregistration），再主层
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/cour.ttf", 58)
    except Exception:
        font = ImageFont.load_default()
    tx = 330
    ty = 620
    d.text((tx + 3, ty + 2), "dsh-eye", font=font, fill=(43, 38, 32, 90))
    d.text((tx + 1, ty + 1), "dsh-eye", font=font, fill=(120, 105, 90, 120))
    d.text((tx, ty), "dsh-eye", font=font, fill=INK)
    # risograph 青色颗粒（细半色调点，压低透明度）
    for _ in range(1500):
        x, y = random.randint(0, SIZE), random.randint(0, SIZE)
        d.ellipse((x, y, x + 1, y + 1), fill=(55, 230, 200, random.randint(4, 14)))
    img.save(out)
    print(f"zine icon -> {out}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dsh-eye/assets/icon-zine.png")
