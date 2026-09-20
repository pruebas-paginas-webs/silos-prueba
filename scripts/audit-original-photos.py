"""Read-only audit of the supplied PDF; decoded source images retain their pixels."""
from pathlib import Path
import json
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[1]
source = root / 'Fotos del cliente/CATALOGO SAY CHEESE  julio 25 2.pdf'
out = root / 'tmp/original-photo-audit'
out.mkdir(parents=True, exist_ok=True)
reader = PdfReader(source)
doc = pdfium.PdfDocument(str(source))
records = []
for page_no, page in enumerate(reader.pages, 1):
    if page_no not in [3,4,5,6,8,9,10,12,13,15,17,18,20,21,22]:
        continue
    doc[page_no-1].render(scale=1.4).to_pil().save(out / f'page-{page_no:02}.png')
    for index, img in enumerate(page.images):
        filename = f'p{page_no:02}-{index}.png'
        rgba = img.image.convert('RGBA')
        decoded = Image.new('RGBA', rgba.size, 'white')
        decoded.alpha_composite(rgba)
        decoded = decoded.convert('RGB')
        decoded.save(out / filename)
        records.append({'page':page_no,'index':index,'name':img.name,'file':filename,'size':decoded.size})
for start in range(0,len(records),30):
    batch = records[start:start+30]
    sheet = Image.new('RGB',(1200,((len(batch)+4)//5)*205),'#e5e5e5')
    draw = ImageDraw.Draw(sheet)
    for n, record in enumerate(batch):
        x,y=(n%5)*240,(n//5)*205
        im=Image.open(out/record['file'])
        sheet.paste(ImageOps.contain(im,(230,168)),(x+5,y+25))
        draw.text((x+5,y+5),f"{record['file']} {record['size']}",fill='black')
    sheet.save(out / f'images-{start//30+1}.jpg')
(out/'images.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print(f'{len(records)} embedded images extracted from product pages; source untouched.')
