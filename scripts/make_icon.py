import math
from PIL import Image, ImageDraw, ImageFilter

SIZE = 512
OUT_DIR = "icons"


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def make_base():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    c1 = (30, 41, 59)
    c2 = (79, 140, 255)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        row_color = lerp_color(c1, c2, t)
        for x in range(SIZE):
            px[x, y] = (*row_color, 255)

    mask = Image.new("L", (SIZE, SIZE), 0)
    mdraw = ImageDraw.Draw(mask)
    radius = int(SIZE * 0.22)
    mdraw.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=radius, fill=255)
    img.putalpha(mask)
    return img


def draw_scissors(img):
    draw = ImageDraw.Draw(img)
    cx, cy = SIZE / 2, SIZE / 2
    white = (255, 255, 255, 255)

    blade_len = SIZE * 0.30
    handle_r = SIZE * 0.075
    lw = int(SIZE * 0.045)

    for sign in (-1, 1):
        angle = math.radians(20 * sign)
        ex = cx + blade_len * math.sin(angle)
        ey = cy - blade_len * math.cos(angle) + SIZE * 0.02
        hx = cx - (SIZE * 0.16) * math.sin(angle) * -0.4
        hy = cy + SIZE * 0.20
        draw.line([(cx, cy), (ex, ey)], fill=white, width=lw)
        hcx = cx + (SIZE * 0.11) * sign
        hcy = cy + SIZE * 0.20
        draw.line([(cx, cy), (hcx, hcy)], fill=white, width=lw)
        draw.ellipse(
            [hcx - handle_r, hcy - handle_r, hcx + handle_r, hcy + handle_r],
            outline=white,
            width=int(lw * 0.85),
        )

    pivot_r = SIZE * 0.03
    draw.ellipse(
        [cx - pivot_r, cy - pivot_r, cx + pivot_r, cy + pivot_r],
        fill=white,
    )

    dash_gap = SIZE * 0.05
    y = cy - SIZE * 0.32
    x = cx + blade_len * 0.55
    dash_len = SIZE * 0.045
    while x < SIZE * 0.94:
        draw.line([(x, y), (x + dash_len, y)], fill=(255, 255, 255, 200), width=int(lw * 0.4))
        x += dash_len + dash_gap


def main():
    import os

    os.makedirs(OUT_DIR, exist_ok=True)
    base = make_base()
    draw_scissors(base)

    base.resize((512, 512), Image.LANCZOS).save(f"{OUT_DIR}/icon-512.png")
    base.resize((192, 192), Image.LANCZOS).save(f"{OUT_DIR}/icon-192.png")
    base.resize((180, 180), Image.LANCZOS).save(f"{OUT_DIR}/apple-touch-icon.png")
    print("icons generated")


if __name__ == "__main__":
    main()
