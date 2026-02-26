from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
BG = (13, 17, 23)
PRIMARY = (76, 110, 245)
ACCENT = (255, 146, 43)
GREEN = (81, 207, 102)
WHITE = (241, 243, 245)
GRAY = (134, 142, 150)
DARK_CARD = (33, 37, 41)
CARD_BORDER = (73, 80, 87)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img, "RGBA")

for x in range(0, W, 40):
    draw.line([(x, 0), (x, H)], fill=(76, 110, 245, 10), width=1)
for y in range(0, H, 40):
    draw.line([(0, y), (W, y)], fill=(76, 110, 245, 10), width=1)

glow_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_img)
for r in range(300, 0, -1):
    alpha = int(25 * (r / 300))
    glow_draw.ellipse([900 - r, -200 - r, 900 + r, -200 + r], fill=(76, 110, 245, alpha))
    glow_draw.ellipse([-100 - r, 500 - r, -100 + r, 500 + r], fill=(255, 146, 43, alpha))
img.paste(Image.alpha_composite(Image.new("RGBA", (W, H), BG + (255,)), glow_img).convert("RGB"))

draw = ImageDraw.Draw(img, "RGBA")

def get_font(size, bold=False):
    paths = []
    if bold:
        paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
        ]
    else:
        paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

font_huge = get_font(58, bold=True)
font_title = get_font(22, bold=True)
font_body = get_font(16)
font_stat = get_font(36, bold=True)
font_label = get_font(15)
font_badge = get_font(14)
font_url = get_font(14)

badge_x, badge_y = 72, 120
draw.rounded_rectangle([badge_x, badge_y, badge_x + 220, badge_y + 34], radius=17,
                        fill=(76, 110, 245, 30), outline=(76, 110, 245, 64))
draw.ellipse([badge_x + 14, badge_y + 11, badge_x + 22, badge_y + 19], fill=GREEN)
draw.text((badge_x + 30, badge_y + 7), "Open to Collaborate", fill=(145, 167, 255), font=font_badge)

draw.text((72, 175), "Archer Yu", fill=PRIMARY, font=font_huge)

draw.text((72, 260), "AI Agent Engineer | Full-Stack Developer", fill=WHITE, font=font_title)

draw.text((72, 310), "Building AI Agent systems from monitoring,", fill=GRAY, font=font_body)
draw.text((72, 335), "trading to knowledge management.", fill=GRAY, font=font_body)

stats = [
    ("27", "Projects", PRIMARY),
    ("22", "AI Agents", ACCENT),
    ("12", "Production", GREEN),
]
card_x = 800
card_y_start = 160
card_w = 320
card_h = 80
card_gap = 16

for i, (num, label, color) in enumerate(stats):
    cy = card_y_start + i * (card_h + card_gap)
    draw.rounded_rectangle([card_x, cy, card_x + card_w, cy + card_h], radius=14,
                            fill=DARK_CARD + (200,), outline=CARD_BORDER + (100,))
    draw.text((card_x + 24, cy + 16), num, fill=color, font=font_stat)
    draw.text((card_x + 100, cy + 30), label, fill=GRAY, font=font_label)

for x in range(W):
    ratio = x / W
    r = int(PRIMARY[0] * (1 - ratio) + ACCENT[0] * ratio)
    g = int(PRIMARY[1] * (1 - ratio) + ACCENT[1] * ratio)
    b = int(PRIMARY[2] * (1 - ratio) + ACCENT[2] * ratio)
    draw.line([(x, H - 4), (x, H)], fill=(r, g, b))

draw.text((W - 250, H - 32), "github.com/yupeng0512", fill=(73, 80, 87), font=font_url)

script_dir = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(script_dir, "..", "public", "og-image.png")
img.save(out_path, "PNG")
print("Saved to " + out_path)
