#!/usr/bin/env python3
"""dsh-eye 图标生成（photo-abstract-editorial 确定性管线）
1) 按 eye.svg 几何程序化重绘源图（等效 SVG 渲染，无 AI）
2) 按 art-direction.md 规则绘制透明抽象 motif
用法: python tools/draw-source-motif.py <outdir>
"""
import sys, os
from PIL import Image, ImageDraw

INK_BG = (4, 6, 11, 255)          # 源图深底 #04060B
CYAN = (55, 230, 200)             # #37E6C8
CYAN_DEEP = (14, 122, 106)        # #0E7A6A
CYAN_DARK = (5, 59, 51)           # #053B33
AMBER = (255, 180, 84)            # #FFB454
PAPER = (232, 225, 213, 255)      # 面板暖象牙 #E8E1D5
MOTIF_INK = (15, 76, 67)          # 深墨青（结构色）
MOTIF_CYAN = (47, 166, 143)       # 氧化青（次级弧）

S = 5  # eye.svg 200x120 放大 5 倍 → 1000x600


def quad(p0, p1, p2, t):
    return tuple(
        (1 - t) ** 2 * p0[i] + 2 * (1 - t) * t * p1[i] + t * t * p2[i]
        for i in range(2)
    )


def quad_points(p0, p1, p2, n=120):
    return [quad(p0, p1, p2, i / n) for i in range(n + 1)]


def draw_source(path, size=(1000, 600)):
    """重绘 eye.svg：杏仁眼 + 青色虹膜渐变 + 琥珀瞳孔 + 扫描虚线 + 睫毛。"""
    img = Image.new("RGBA", size, INK_BG)
    d = ImageDraw.Draw(img)
    cx, cy = 500, 300
    upper = quad_points((80, 300), (cx, -70), (920, 300))
    lower = quad_points((80, 300), (cx, 670), (920, 300))
    d.line(upper, fill=CYAN, width=20, joint="curve")
    d.line(lower, fill=CYAN, width=20, joint="curve")
    # 虹膜：同心圆径向渐变（青 → 深青）
    for r in range(190, 0, -2):
        t = r / 190
        col = tuple(int(CYAN[i] * (1 - t) + CYAN_DARK[i] * t) for i in range(3)) + (255,)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=col, width=3)
    d.ellipse((cx - 190, cy - 190, cx + 190, cy + 190), outline=CYAN, width=14)
    # 瞳孔 + 高光
    d.ellipse((cx - 80, cy - 80, cx + 80, cy + 80), fill=AMBER)
    d.ellipse((cx - 80, cy - 80, cx + 80, cy + 80), outline=INK_BG, width=10)
    d.ellipse((cx - 52, cy - 58, cx - 2, cy - 8), fill=(234, 255, 251, 255))
    d.ellipse((cx + 52, cy + 44, cx + 66, cy + 58), fill=(234, 255, 251, 200))
    # 扫描虚线
    for x in range(90, 910, 46):
        d.line((x, cy, x + 24, cy), fill=AMBER, width=7)
    # 睫毛
    for x0, y0, x1, y1 in [(260, 130, 290, 170), (350, 90, 365, 140), (740, 130, 710, 170), (650, 90, 635, 140)]:
        d.line((x0, y0, x1, y1), fill=CYAN, width=12)
    img.save(path)
    print(f"source -> {path}")


def draw_motif(path, size=(800, 400)):
    """art-direction 抽象标记（透明）：弧形眼睑线 + 水平虚线 + 琥珀瞳孔点 + 氧化青同心弧。"""
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = 360, 210
    # 主结构：一条粗弧形眼睑线（不对称，弧心偏上）
    arc = quad_points((120, 250), (cx - 40, 40), (640, 250), n=140)
    d.line(arc, fill=MOTIF_INK, width=26, joint="curve")
    # 从属：水平虚线（扫描线），位于弧下方偏左
    y = 330
    for x in range(120, 500, 44):
        d.line((x, y, x + 26, y), fill=MOTIF_INK, width=12)
    # 琥珀瞳孔点（实心，位于弧内偏右下方，不等权）
    d.ellipse((400, 250, 460, 310), fill=AMBER)
    # 氧化青次级弧（同心、细、截断）
    d.arc((150, 30, 610, 430), start=200, end=340, fill=MOTIF_CYAN, width=12)
    img.save(path)
    print(f"motif -> {path}")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "tools/_gen"
    os.makedirs(out, exist_ok=True)
    draw_source(os.path.join(out, "source.png"))
    draw_motif(os.path.join(out, "motif.png"))
