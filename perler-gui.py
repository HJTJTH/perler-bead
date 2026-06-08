#!/usr/bin/env python3
"""拼豆图纸生成器 — 拖拽图片 → 像素化 → 导出图纸"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageDraw, ImageTk
import os

# ── 拼豆标准色 ──
BEAD_COLORS = [
    ("白色", (255,255,255)), ("黑色", (30,30,30)), ("灰色", (150,150,150)),
    ("深灰", (90,90,90)), ("浅棕", (200,170,140)), ("棕色", (150,100,60)),
    ("深棕", (100,60,30)), ("红色", (220,40,40)), ("深红", (160,20,20)),
    ("粉色", (255,150,180)), ("浅粉", (255,200,220)), ("橙色", (255,140,0)),
    ("黄色", (255,220,30)), ("浅黄", (255,245,150)), ("绿色", (50,180,50)),
    ("深绿", (20,120,20)), ("浅绿", (150,220,150)), ("青色", (50,200,200)),
    ("蓝色", (40,100,220)), ("浅蓝", (150,190,240)), ("深蓝", (20,50,140)),
    ("紫色", (150,50,200)), ("浅紫", (200,160,230)), ("品红", (220,50,150)),
    ("肤色", (255,210,170)),
]
BEAD_RGB = [c[1] for c in BEAD_COLORS]
BEAD_NAMES = [c[0] for c in BEAD_COLORS]

SYMBOLS = ['●','○','◆','◇','▲','△','■','□','★','☆','♦','♢','♥','♡','⏺',
           '+','×','◎','◉','◈','▣','▤','▥','▦','▧','▨','▩','▪','▫']

# ── 核心算法 ──
def closest(rgb, palette):
    r,g,b = rgb
    best, best_d = 0, float('inf')
    for i, (pr,pg,pb) in enumerate(palette):
        d = (r-pr)**2 + (g-pg)**2 + (b-pb)**2
        if d < best_d: best_d, best = d, i
    return best

def quantize(pixels, k):
    """k-means 颜色量化"""
    n = len(pixels)
    step = max(1, n // k)
    centers = [list(pixels[min(i*step, n-1)]) for i in range(k)]
    for _ in range(10):
        buckets = [[] for _ in range(k)]
        for p in pixels:
            best_i, best_d = 0, float('inf')
            for i, c in enumerate(centers):
                d = (p[0]-c[0])**2 + (p[1]-c[1])**2 + (p[2]-c[2])**2
                if d < best_d: best_d, best_i = d, i
            buckets[best_i].append(p)
        changed = False
        for i in range(k):
            if not buckets[i]: continue
            avg = [sum(x)//len(x) for x in zip(*([x[:3] for x in buckets[i]]))]
            if avg != centers[i]: changed = True
            centers[i] = avg
        if not changed: break
    return [tuple(c) for c in centers]

def process_image(img, w, h, n_colors, use_bead_palette):
    """图片 → 像素矩阵"""
    img = img.resize((w, h), Image.NEAREST).convert('RGB')
    pixels = list(img.get_flattened_data())

    if use_bead_palette:
        palette = BEAD_RGB
        names = BEAD_NAMES
    else:
        palette = quantize(pixels, n_colors)
        names = [f"C{i+1}" for i in range(len(palette))]

    # 按亮度排序
    ranked = sorted(range(len(palette)),
                    key=lambda i: palette[i][0]*0.299+palette[i][1]*0.587+palette[i][2]*0.114)
    palette = [palette[i] for i in ranked]
    names = [names[i] for i in ranked]

    indices = [closest(p, palette) for p in pixels]
    counts = [0]*len(palette)
    for idx in indices: counts[idx] += 1

    return indices, palette, names, counts, w, h

def draw_grid(indices, palette, w, h, cell=24, mode='color'):
    """画网格预览图"""
    img = Image.new('RGB', (w*cell, h*cell), (255,255,255))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        for x in range(w):
            idx = indices[y*w + x]
            color = palette[idx]
            draw.rectangle([x*cell, y*cell, x*cell+cell-1, y*cell+cell-1], fill=color)
    # 网格线
    for y in range(h+1):
        t = 2 if y%10==0 else 1
        draw.line([(0,y*cell),(w*cell,y*cell)], fill=(180,180,180), width=t)
    for x in range(w+1):
        t = 2 if x%10==0 else 1
        draw.line([(x*cell,0),(x*cell,h*cell)], fill=(180,180,180), width=t)
    # 符号
    if mode in ('symbol', 'both'):
        from PIL import ImageFont
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", max(9, cell//2))
        except:
            font = ImageFont.load_default()
        for y in range(h):
            for x in range(w):
                idx = indices[y*w + x]
                r,g,b = palette[idx]
                lum = r*0.299+g*0.587+b*0.114
                txt_color = (0,0,0) if lum > 128 else (255,255,255)
                sym = SYMBOLS[idx % len(SYMBOLS)]
                bbox = font.getbbox(sym)
                tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
                draw.text((x*cell+cell//2-tw//2, y*cell+cell//2-th//2-2), sym, fill=txt_color, font=font)
    return img


# ── GUI ──
class App:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("拼豆/十字绣图纸生成器 — 大王专用")
        self.root.geometry("1100x720")
        self.root.configure(bg='#1a1a2e')
        self.src_img = None
        self.result_img = None
        self._setup_ui()

    def _setup_ui(self):
        # 左侧面板
        left = tk.Frame(self.root, bg='#16213e', width=300, padx=16, pady=16)
        left.pack(side='left', fill='y')
        left.pack_propagate(False)

        tk.Label(left, text="🧶 拼豆图纸生成器", font=('微软雅黑', 14, 'bold'),
                 fg='#e94560', bg='#16213e').pack(pady=(0,12))

        # 上传区
        self.drop_frame = tk.Frame(left, bg='#0f3460', relief='ridge', bd=2, height=120)
        self.drop_frame.pack(fill='x', pady=(0,10))
        self.drop_frame.pack_propagate(False)
        self.drop_label = tk.Label(self.drop_frame, text="拖拽图片到这里\n或点击选择文件",
                                    font=('微软雅黑', 10), fg='#aaa', bg='#0f3460')
        self.drop_label.pack(expand=True)
        self.drop_frame.bind("<Button-1>", lambda e: self._pick_file())
        self.drop_label.bind("<Button-1>", lambda e: self._pick_file())
        self.root.drop_target_register('DND_Files')
        self.root.dnd_bind('<<Drop>>', self._on_drop)

        self.thumb_label = tk.Label(left, bg='#16213e')
        self.thumb_label.pack(pady=(0,8))

        # 参数
        params = tk.LabelFrame(left, text="参数设置", font=('微软雅黑', 9),
                               fg='#ccc', bg='#16213e', padx=10, pady=10)
        params.pack(fill='x', pady=(0,8))

        # 宽
        tk.Label(params, text="宽度（颗）", font=('微软雅黑', 9), fg='#aaa', bg='#16213e').pack(anchor='w')
        fw = tk.Frame(params, bg='#16213e')
        fw.pack(fill='x')
        self.w_scale = tk.Scale(fw, from_=8, to=100, orient='horizontal', length=200,
                                 bg='#16213e', fg='#e94560', troughcolor='#0f3460',
                                 highlightthickness=0, command=self._on_param)
        self.w_scale.set(40)
        self.w_scale.pack(side='left')
        self.w_val = tk.Label(fw, text="40", font=('微软雅黑', 10, 'bold'), fg='#e94560', bg='#16213e', width=4)
        self.w_val.pack(side='right')

        # 高
        tk.Label(params, text="高度（颗）", font=('微软雅黑', 9), fg='#aaa', bg='#16213e').pack(anchor='w')
        fh = tk.Frame(params, bg='#16213e')
        fh.pack(fill='x')
        self.h_scale = tk.Scale(fh, from_=8, to=100, orient='horizontal', length=200,
                                 bg='#16213e', fg='#e94560', troughcolor='#0f3460',
                                 highlightthickness=0, command=self._on_param)
        self.h_scale.set(40)
        self.h_scale.pack(side='left')
        self.h_val = tk.Label(fh, text="40", font=('微软雅黑', 10, 'bold'), fg='#e94560', bg='#16213e', width=4)
        self.h_val.pack(side='right')

        # 锁定比例
        self.lock_var = tk.BooleanVar(value=True)
        tk.Checkbutton(params, text="锁定原图比例", variable=self.lock_var,
                       font=('微软雅黑', 8), fg='#aaa', bg='#16213e',
                       selectcolor='#16213e', activebackground='#16213e',
                       activeforeground='#e94560').pack(anchor='w')

        # 颜色数
        tk.Label(params, text="颜色数量", font=('微软雅黑', 9), fg='#aaa', bg='#16213e').pack(anchor='w')
        fc = tk.Frame(params, bg='#16213e')
        fc.pack(fill='x')
        self.c_scale = tk.Scale(fc, from_=4, to=50, orient='horizontal', length=200,
                                 bg='#16213e', fg='#e94560', troughcolor='#0f3460',
                                 highlightthickness=0, command=self._on_param)
        self.c_scale.set(20)
        self.c_scale.pack(side='left')
        self.c_val = tk.Label(fc, text="20", font=('微软雅黑', 10, 'bold'), fg='#e94560', bg='#16213e', width=4)
        self.c_val.pack(side='right')

        # 模式
        tk.Label(params, text="图纸模式", font=('微软雅黑', 9), fg='#aaa', bg='#16213e').pack(anchor='w', pady=(8,0))
        self.mode_var = tk.StringVar(value='color')
        for text, val in [("🎨 色块", "color"), ("🔤 符号", "symbol"), ("🎨+🔤 色块+符号", "both")]:
            tk.Radiobutton(params, text=text, value=val, variable=self.mode_var,
                           font=('微软雅黑', 9), fg='#aaa', bg='#16213e',
                           selectcolor='#16213e', activebackground='#16213e',
                           command=self._render).pack(anchor='w')

        # 色板
        tk.Label(params, text="颜色方案", font=('微软雅黑', 9), fg='#aaa', bg='#16213e').pack(anchor='w', pady=(8,0))
        self.palette_var = tk.StringVar(value='auto')
        for text, val in [("🤖 自动量化", "auto"), ("🧶 拼豆标准色", "bead")]:
            tk.Radiobutton(params, text=text, value=val, variable=self.palette_var,
                           font=('微软雅黑', 9), fg='#aaa', bg='#16213e',
                           selectcolor='#16213e', activebackground='#16213e',
                           command=self._render).pack(anchor='w')

        # 按钮
        btns = tk.Frame(left, bg='#16213e')
        btns.pack(fill='x', pady=(10,0))
        tk.Button(btns, text="📥 导出图纸", font=('微软雅黑', 10, 'bold'),
                  bg='#e94560', fg='white', activebackground='#ff6b81',
                  relief='flat', padx=16, pady=8, cursor='hand2',
                  command=self._export).pack(side='left', fill='x', expand=True, padx=(0,4))
        tk.Button(btns, text="🖨 打印", font=('微软雅黑', 10),
                  bg='#0f3460', fg='#ccc', activebackground='#1a4a80',
                  relief='flat', padx=16, pady=8, cursor='hand2',
                  command=self._print).pack(side='left', fill='x', expand=True, padx=(4,0))

        self.info = tk.Label(left, text="请先上传图片", font=('微软雅黑', 8),
                              fg='#666', bg='#16213e')
        self.info.pack(pady=(10,0))

        # 右侧预览
        self.preview = tk.Label(self.root, text="上传图片后在右侧预览", font=('微软雅黑', 14),
                                 fg='#444', bg='#1a1a2e')
        self.preview.pack(side='right', expand=True, fill='both')

    def _pick_file(self):
        path = filedialog.askopenfilename(filetypes=[("图片", "*.jpg *.jpeg *.png *.gif *.webp *.bmp"), ("所有", "*.*")])
        if path: self._load(path)

    def _on_drop(self, e):
        path = e.data.strip('{}')
        if os.path.isfile(path): self._load(path)

    def _load(self, path):
        try:
            self.src_img = Image.open(path)
            thumb = self.src_img.copy()
            thumb.thumbnail((260, 100))
            self._thumb_tk = ImageTk.PhotoImage(thumb)
            self.thumb_label.configure(image=self._thumb_tk)
            if self.lock_var.get():
                ratio = self.src_img.height / self.src_img.width
                self.h_scale.set(max(8, int(self.w_scale.get() * ratio)))
            self._render()
        except Exception as ex:
            messagebox.showerror("错误", f"无法加载图片: {ex}")

    def _on_param(self, *args):
        self.w_val.configure(text=str(self.w_scale.get()))
        self.h_val.configure(text=str(self.h_scale.get()))
        self.c_val.configure(text=str(self.c_scale.get()))
        if self.lock_var.get() and self.src_img:
            ratio = self.src_img.height / self.src_img.width
            self.h_scale.set(max(8, int(self.w_scale.get() * ratio)))
            self.h_val.configure(text=str(self.h_scale.get()))
        self._render()

    def _render(self, *args):
        if not self.src_img: return
        try:
            w = self.w_scale.get()
            h = self.h_scale.get()
            n = self.c_scale.get()
            mode = self.mode_var.get()
            use_bead = self.palette_var.get() == 'bead'

            indices, palette, names, counts, w, h = process_image(self.src_img, w, h, n, use_bead)
            cell = max(8, min(36, 800 // max(w, h)))
            self.result_img = draw_grid(indices, palette, w, h, cell, mode)

            # 缩放以适应窗口
            display = self.result_img.copy()
            max_w = self.root.winfo_width() - 320
            max_h = self.root.winfo_height() - 40
            if display.width > max_w or display.height > max_h:
                ratio = min(max_w/display.width, max_h/display.height)
                display = display.resize((int(display.width*ratio), int(display.height*ratio)), Image.NEAREST)

            self._display = ImageTk.PhotoImage(display)
            self.preview.configure(image=self._display, text="")

            total = sum(counts)
            self.info.configure(text=f"{w}×{h}格 | {len(palette)}色 | 共{total}颗")
            self._indices, self._palette, self._names, self._counts = indices, palette, names, counts
            self._grid_w, self._grid_h = w, h
            self._cell = cell
        except Exception as ex:
            self.info.configure(text=f"渲染出错: {ex}")

    def _export(self):
        if not self.result_img: return
        path = filedialog.asksaveasfilename(defaultextension=".png",
                                             filetypes=[("PNG图片", "*.png"), ("JPEG", "*.jpg")])
        if not path: return
        try:
            self.result_img.save(path)
            txt_path = os.path.splitext(path)[0] + "_图纸.txt"
            self._save_blueprint(txt_path)
            messagebox.showinfo("搞定！", f"图纸已保存:\n{path}\n{txt_path}")
        except Exception as ex:
            messagebox.showerror("导出错误", str(ex))

    def _save_blueprint(self, path):
        if not hasattr(self, '_indices'): return
        indices, palette, names, counts = self._indices, self._palette, self._names, self._counts
        w, h = self._grid_w, self._grid_h
        with open(path, 'w', encoding='utf-8') as f:
            f.write("="*50 + "\n")
            f.write(f"拼豆/十字绣图纸  {w}×{h}格  共{sum(counts)}颗\n")
            f.write("="*50 + "\n\n【颜色对照】\n")
            for i in range(len(palette)):
                r,g,b = palette[i]
                f.write(f"  {i:2d} | {names[i]:6s} | RGB({r:3d},{g:3d},{b:3d}) | {counts[i]:4d}颗\n")
            f.write("\n【网格图纸】\n")
            for y in range(h):
                row = [f"{indices[y*w+x]:2d}" for x in range(w)]
                f.write(" ".join(row) + "\n")

    def _print(self):
        if not self.result_img: return
        tmp = os.path.join(os.environ.get('TEMP', '.'), '_perler_print.png')
        self.result_img.save(tmp)
        os.startfile(tmp, 'print')

    def run(self):
        self.root.mainloop()


if __name__ == '__main__':
    App().run()
