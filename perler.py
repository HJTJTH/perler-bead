#!/usr/bin/env python3
"""图片转拼豆图纸 — 大王专用"""

from PIL import Image, ImageDraw, ImageFont
import os
import sys

# ── 拼豆标准色板（Hama/Perler 常用色，RGB 近似值） ──
BEAD_COLORS = {
    "白色":      (255, 255, 255),
    "黑色":      (30, 30, 30),
    "灰色":      (150, 150, 150),
    "深灰":      (90, 90, 90),
    "浅棕":      (200, 170, 140),
    "棕色":      (150, 100, 60),
    "深棕":      (100, 60, 30),
    "红色":      (220, 40, 40),
    "深红":      (160, 20, 20),
    "粉色":      (255, 150, 180),
    "浅粉":      (255, 200, 220),
    "橙色":      (255, 140, 0),
    "黄色":      (255, 220, 30),
    "浅黄":      (255, 245, 150),
    "绿色":      (50, 180, 50),
    "深绿":      (20, 120, 20),
    "浅绿":      (150, 220, 150),
    "青色":      (50, 200, 200),
    "蓝色":      (40, 100, 220),
    "浅蓝":      (150, 190, 240),
    "深蓝":      (20, 50, 140),
    "紫色":      (150, 50, 200),
    "浅紫":      (200, 160, 230),
    "品红":      (220, 50, 150),
    "肤色":      (255, 210, 170),
}

BEAD_LIST = list(BEAD_COLORS.values())
BEAD_NAMES = list(BEAD_COLORS.keys())


def closest_color(rgb, palette):
    """找最近的颜色"""
    r, g, b = rgb
    best, best_dist = 0, float('inf')
    for i, (pr, pg, pb) in enumerate(palette):
        d = (r - pr)**2 + (g - pg)**2 + (b - pb)**2
        if d < best_dist:
            best_dist, best = d, i
    return best


def image_to_beads(img, width, height, num_colors=None):
    """把图片转成拼豆色块矩阵"""
    # 缩放到目标尺寸（最近邻 = 像素风）
    img = img.resize((width, height), Image.NEAREST)
    img = img.convert('RGB')
    pixels = list(img.get_flattened_data())

    if num_colors:
        # 自动量化：用 Pillow 的 quantize 减少颜色，再映射
        q = img.quantize(num_colors, method=Image.Quantize.MEDIANCUT)
        palette = [tuple(q.getpalette()[i*3:i*3+3]) for i in range(num_colors)]
    else:
        palette = BEAD_LIST

    # 映射每个像素到最近的颜色
    indices = [closest_color(p, palette) for p in pixels]

    # 生成颜色名列表
    if num_colors:
        color_names = [f"C{i+1}" for i in range(num_colors)]
    else:
        color_names = BEAD_NAMES

    return indices, palette, color_names, width, height


def draw_grid(indices, palette, w, h, cell=20, grid_color=(200,200,200)):
    """画放大版图纸"""
    img_w, img_h = w * cell, h * cell
    out = Image.new('RGB', (img_w, img_h), (255, 255, 255))
    draw = ImageDraw.Draw(out)

    for y in range(h):
        for x in range(w):
            idx = indices[y * w + x]
            color = palette[idx]
            x0, y0 = x * cell, y * cell
            x1, y1 = x0 + cell - 1, y0 + cell - 1
            draw.rectangle([x0, y0, x1, y1], fill=color)

    # 网格线（每隔10格画粗线方便数）
    for y in range(h + 1):
        thick = 3 if y % 10 == 0 else 1
        draw.line([(0, y*cell), (img_w, y*cell)], fill=grid_color, width=thick)
    for x in range(w + 1):
        thick = 3 if x % 10 == 0 else 1
        draw.line([(x*cell, 0), (x*cell, img_h)], fill=grid_color, width=thick)

    return out


def make_blueprint(indices, palette, color_names, w, h):
    """生成文本图纸 + 统计"""
    lines = []
    lines.append("=" * 60)
    lines.append("  拼豆图纸")
    lines.append(f"  尺寸: {w} x {h}  (共 {w*h} 颗)")
    lines.append("=" * 60)
    lines.append("")

    # 颜色对照表
    lines.append("【颜色对照】")
    used = set(indices)
    for i in sorted(used):
        r, g, b = palette[i]
        name = color_names[i]
        count = indices.count(i)
        lines.append(f"  {i:2d} | {name:6s} | RGB({r:3d},{g:3d},{b:3d}) | 需要 {count:4d} 颗")
    lines.append("")

    # 网格图纸
    lines.append("【网格图纸】")
    for y in range(h):
        row = []
        for x in range(w):
            row.append(f"{indices[y * w + x]:2d}")
        lines.append(" ".join(row))

    lines.append("")
    lines.append(f"总数: {w*h} 颗 | 颜色: {len(used)} 种")
    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("用法: python perler.py <图片路径> [宽] [高] [颜色数]")
        print("示例: python perler.py 照片.jpg 40 40 15")
        print("      将图片转成 40x40 拼豆图纸，限制 15 种颜色")
        print("")
        print("不指定颜色数则使用内置 25 色拼豆标准色板")
        return

    path = sys.argv[1]
    if not os.path.exists(path):
        print(f"找不到文件: {path}")
        return

    w = int(sys.argv[2]) if len(sys.argv) > 2 else 29
    h = int(sys.argv[3]) if len(sys.argv) > 3 else 29
    n = int(sys.argv[4]) if len(sys.argv) > 4 else None

    img = Image.open(path)
    print(f"原图: {img.size[0]}x{img.size[1]}")
    print(f"拼豆: {w}x{h}, 颜色: {n if n else '标准色板'}")

    indices, palette, names, w, h = image_to_beads(img, w, h, n)

    # 输出文件
    base = os.path.splitext(os.path.basename(path))[0]
    out_dir = os.path.dirname(os.path.abspath(path)) or "."

    # 放大预览图
    grid_img = draw_grid(indices, palette, w, h, cell=30)
    grid_path = os.path.join(out_dir, f"{base}_拼豆预览.png")
    grid_img.save(grid_path)
    print(f"预览图 -> {grid_path}")

    # 文本图纸
    txt = make_blueprint(indices, palette, names, w, h)
    txt_path = os.path.join(out_dir, f"{base}_拼豆图纸.txt")
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(txt)
    print(f"图纸 -> {txt_path}")

    print("搞定！大王可以直接照着图纸拼了。")


if __name__ == '__main__':
    main()
