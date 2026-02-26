from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 675

def get_font(size, bold=False):
    paths = []
    if bold:
        paths = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                 "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
                 "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc"]
    else:
        paths = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                 "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                 "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                pass
    return ImageFont.load_default()

font_name = get_font(48, bold=True)
font_title = get_font(20, bold=True)
font_body = get_font(16)
font_tag = get_font(14, bold=True)
font_small = get_font(13)

projects = [
    {
        "slug": "infohunter",
        "name": "InfoHunter",
        "tagline": "AI-Powered Social Media Monitor",
        "tech": ["Python", "FastAPI", "MySQL", "Docker"],
        "highlights": ["3-stage decoupled architecture", "AG-UI protocol", "Multi-platform support"],
        "color": (76, 110, 245),
        "pain": "Social media scattered, manual tracking inefficient",
        "solution": "Auto-crawl + AI analysis + smart push",
        "result": "Zero info loss, 90% time saved",
    },
    {
        "slug": "TrendRadar",
        "name": "TrendRadar",
        "tagline": "Real-time Trend Aggregation System v6.0",
        "tech": ["Python", "SQLite", "LiteLLM", "Docker"],
        "highlights": ["11+ platform aggregation", "AI analysis & summary", "Multi-channel push", "MCP integration"],
        "color": (255, 146, 43),
        "pain": "Trends scattered across 11+ platforms",
        "solution": "Auto aggregation + AI analysis + multi-push",
        "result": "Production v6.0, zero-delay awareness",
    },
    {
        "slug": "truthsocial-trump-monitor",
        "name": "TruthSocial Monitor",
        "tagline": "Trump Social Media Intelligence",
        "tech": ["Python", "FastAPI", "MySQL", "Docker"],
        "highlights": ["Real-time Trump post alerts", "AI macro-economic analysis", "Auto daily/weekly reports"],
        "color": (81, 207, 102),
        "pain": "Trump posts impact markets instantly",
        "solution": "AI real-time monitoring + macro analysis",
        "result": "Second-level push, auto market impact analysis",
    },
]

BG = (13, 17, 23)
GRAY = (134, 142, 150)
WHITE = (241, 243, 245)
DARK_CARD = (26, 29, 36)

out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "screenshots")
os.makedirs(out_dir, exist_ok=True)

for proj in projects:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img, "RGBA")

    c = proj["color"]

    # top accent bar
    for x in range(W):
        draw.line([(x, 0), (x, 4)], fill=c)

    # glow
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r in range(200, 0, -1):
        alpha = int(18 * (r / 200))
        gd.ellipse([W - 200 - r, -100 - r, W - 200 + r, -100 + r], fill=c + (alpha,))
    img.paste(Image.alpha_composite(Image.new("RGBA", (W, H), BG + (255,)), glow).convert("RGB"))
    draw = ImageDraw.Draw(img, "RGBA")

    # production badge
    bx, by = 60, 40
    draw.rounded_rectangle([bx, by, bx + 80, by + 26], radius=13, fill=(81, 207, 102, 40), outline=(81, 207, 102, 100))
    draw.text((bx + 12, by + 5), "Production", fill=(81, 207, 102), font=font_small)

    # project name
    draw.text((60, 85), proj["name"], fill=c, font=font_name)

    # tagline
    draw.text((60, 150), proj["tagline"], fill=WHITE, font=font_title)

    # tech stack
    tx = 60
    ty = 200
    for tech in proj["tech"]:
        tw = len(tech) * 9 + 24
        draw.rounded_rectangle([tx, ty, tx + tw, ty + 28], radius=6, fill=(33, 37, 41, 200), outline=(73, 80, 87, 100))
        draw.text((tx + 12, ty + 5), tech, fill=GRAY, font=font_small)
        tx += tw + 10

    # highlights section
    hy = 260
    draw.text((60, hy), "Key Features", fill=WHITE, font=font_title)
    hy += 35
    for h in proj["highlights"]:
        draw.text((80, hy), "->  " + h, fill=GRAY, font=font_body)
        hy += 28

    # value story card
    vy = 420
    draw.rounded_rectangle([60, vy, W - 60, H - 30], radius=16, fill=DARK_CARD + (220,), outline=(73, 80, 87, 80))

    draw.text((90, vy + 20), "PAIN", fill=(255, 100, 100), font=font_tag)
    draw.text((90, vy + 42), proj["pain"], fill=GRAY, font=font_body)

    draw.text((90, vy + 80), "SOLUTION", fill=c, font=font_tag)
    draw.text((90, vy + 102), proj["solution"], fill=GRAY, font=font_body)

    draw.text((90, vy + 140), "RESULT", fill=(81, 207, 102), font=font_tag)
    draw.text((90, vy + 162), proj["result"], fill=GRAY, font=font_body)

    out_path = os.path.join(out_dir, proj["slug"] + ".png")
    img.save(out_path, "PNG")
    print("Saved " + out_path)

print("Done!")
