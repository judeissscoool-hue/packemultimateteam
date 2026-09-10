"""Build lossless branding sizes from the supplied original (requires Pillow)."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root / 'branding'
original = Image.open(folder / 'original.png').convert('RGBA')
# Ignore near-transparent stray pixels when finding the visible artwork bounds.
box = original.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
if not box:
    raise ValueError('Logo has no visible artwork')
box = (max(0, box[0]-4), max(0, box[1]-4), min(original.width, box[2]+4), min(original.height, box[3]+4))
logo = original.crop(box)
logo.thumbnail((432, 432), Image.Resampling.LANCZOS)
logo.save(folder / 'logo.png', optimize=True)
square = Image.new('RGBA', (max(logo.size),)*2)
square.alpha_composite(logo, ((square.width-logo.width)//2, (square.height-logo.height)//2))
for size in (16, 32, 48, 180):
    square.resize((size, size), Image.Resampling.LANCZOS).save(folder / f'icon-{size}.png', optimize=True)
square.save(folder / 'favicon.ico', sizes=[(16,16), (32,32), (48,48)])
print('Header dimensions:', logo.size)
