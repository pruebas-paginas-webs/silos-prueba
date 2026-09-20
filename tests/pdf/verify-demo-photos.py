from pathlib import Path
import json
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parents[2]
out=root/'tmp/photo-quality-review/pdf';out.mkdir(parents=True,exist_ok=True)
seed=json.loads((root/'demo/demo-seed.json').read_text(encoding='utf-8'))
items=[p for p in seed['products'] if p['visible'] and not p['archived_at']]
report=[]
for kind in ['con','sin']:
    file=root/f'demo/pdf/Silos-Paraguay-movil-{kind}-precios-DEMO.pdf'
    reader=PdfReader(file);text=' '.join(' '.join(p.extract_text().split()) for p in reader.pages)
    assert all(p['producto'] in text for p in items)
    for name in ['Basiron Pesto Verde','Basiron Olive Tomato','Montana Intenso']:assert text.count(name)==1
    assert ('G$' in text)==(kind=='con')
    assert 'MUESTRA DE DEMOSTRACIÓN' in text
    assert file.stat().st_size<5_000_000
    assert all(abs(float(p.mediabox.width)-108*72/25.4)<1 for p in reader.pages)
    urls=[a.get_object().get('/A',{}).get('/URI','') for p in reader.pages for a in p.get('/Annots',[])]
    assert not any('127.0.0.1' in u or 'localhost' in u for u in urls)
    doc=pdfium.PdfDocument(str(file))
    sheet=Image.new('RGB',(1200,((len(doc)+4)//5)*460),'#ddd');draw=ImageDraw.Draw(sheet)
    for i in range(len(doc)):
        im=doc[i].render(scale=1.8).to_pil().convert('RGB');im.save(out/f'{kind}-{i+1:02}.png')
        sheet.paste(ImageOps.contain(im,(230,420)),((i%5)*240,(i//5)*460+24));draw.text(((i%5)*240+8,(i//5)*460+5),str(i+1),fill='black')
    sheet.save(out/f'{kind}-contact.png')
    report.append({'file':file.name,'products':len(items),'pages':len(doc),'bytes':file.stat().st_size})
(out/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
