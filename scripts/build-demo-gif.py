from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
shots = root / "docs" / "demo" / "screenshots"
frames = [
    ("01-inbox-heating.png", "Inbox · recurring heating request"),
    ("02-inbox-water.png", "Review another tenant request"),
    ("03-inbox-access.png", "Property-specific guidance"),
    ("04-search-empty.png", "Search and empty-state recovery"),
    ("05-search-heating.png", "Find a request by tenant name"),
    ("06-properties.png", "Synthetic property context"),
    ("08-imports.png", "CSV migration setup"),
    ("10-workspace-setup.png", "Connected workspace setup"),
]
width, height = 1280, 1100
try:
    font = ImageFont.truetype("arial.ttf", 27)
    small = ImageFont.truetype("arial.ttf", 16)
except OSError:
    font = ImageFont.load_default()
    small = ImageFont.load_default()

images = []
for file, title in frames:
    with Image.open(shots / file) as original:
        screenshot = original.convert("RGB")
        ratio = width / screenshot.width
        screenshot = screenshot.resize((width, round(screenshot.height * ratio)), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (width, height), "#f5f7f4")
        canvas.paste(screenshot.crop((0, 0, width, min(height - 70, screenshot.height))), (0, 70))
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, 0, width, 70), fill="#183c34")
        draw.text((25, 17), "HausFlow  /  " + title, font=font, fill="white")
        draw.text((width - 185, 26), "PUBLIC PREVIEW", font=small, fill="#bde1cf")
        images.append(canvas)

target = root / "docs" / "demo" / "hausflow-demo.gif"
images[0].save(
    target,
    save_all=True,
    append_images=images[1:],
    duration=[1500, 1300, 1300, 1200, 1300, 1500, 1500, 1700],
    loop=0,
    optimize=True,
)
print(target)
