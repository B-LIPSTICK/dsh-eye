#!/usr/bin/env python3
"""生成 GitHub 仓库图标安全版：内容（眼睛+文字）居中，圆形安全边距，500x500。
用法: python tools/make-avatar.py <input.png> <output.png>
"""
import sys
import numpy as np
from PIL import Image

SIZE = 500
MARGIN = 0.12  # 圆形裁剪安全边距（12% 全边留白）


def content_bbox(arr):
    """非纸色内容包围盒（纸色为暖象牙，内容明显更暗或更饱和）。"""
    r, g, b = arr[..., 0].astype(int), arr[..., 1].astype(int), arr[..., 2].astype(int)
    # 内容 = 深色（墨）或饱和色（青）且明显偏离纸色
    paperish = (r > 210) & (g > 200) & (b > 170)
    saturated = (g > 150) & (g > r + 40) & (g > b + 40)
    mask = ~paperish & ~(saturated & (np.abs(r - g) < 90))
    mask = ~paperish  # 简化为非纸色即内容
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    return (xs.min(), ys.min(), xs.max(), ys.max())


def main(src, dst):
    img = Image.open(src).convert("RGB")
    arr = np.asarray(img)
    bbox = content_bbox(arr)
    if bbox is None:
        print("warning: 未找到内容区域")
        img.resize((SIZE, SIZE)).save(dst)
        return
    x0, y0, x1, y1 = bbox
    crop = img.crop((x0, y0, x1, y1))
    cw, ch = crop.size
    # 放入 500x500，四边留 12% 安全边距，内容按比例缩放并居中
    avail = SIZE * (1 - 2 * MARGIN)
    scale = min(avail / cw, avail / ch)
    nw, nh = int(cw * scale), int(ch * scale)
    crop = crop.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (SIZE, SIZE), (244, 237, 224))  # 纸色
    canvas.paste(crop, ((SIZE - nw) // 2, (SIZE - nh) // 2))
    canvas.save(dst)
    print(f"avatar -> {dst} ({nw}x{nh} content)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
