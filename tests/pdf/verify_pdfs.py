from pathlib import Path
import json,re
import pypdfium2 as pdfium
from pypdf import PdfReader
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parents[2]
out=root/'tmp/qa-mobile'; out.mkdir(parents=True,exist_ok=True)
items=json.loads((root/'data/catalogo.json').read_text(encoding='utf-8'))
report=[]
for kind in ['sin','con']:
 file=root/f'output/pdf/Silos-Paraguay-movil-{kind}-precios.pdf'
 reader=PdfReader(file); doc=pdfium.PdfDocument(str(file))
 text=' '.join(' '.join(p.extract_text().split()) for p in reader.pages)
 assert ('G$' in text)==(kind=='con'), 'Precios incorrectos'
 assert '\ufffd' not in text,'Caracteres dañados'
 missing=[p['producto'] for p in items if p['producto'] not in text]
 assert not missing,missing
 assert all(abs(float(p.mediabox.width)-108*72/25.4)<1 for p in reader.pages)
 assert file.stat().st_size<5_000_000
 sheet=Image.new('RGB',(1200,((len(doc)+4)//5)*460),'#ddd'); draw=ImageDraw.Draw(sheet)
 for i in range(len(doc)):
  im=doc[i].render(scale=1.8).to_pil().convert('RGB'); im.save(out/f'{kind}-{i+1:02}.png')
  sheet.paste(ImageOps.contain(im,(230,420)),((i%5)*240,(i//5)*460+24)); draw.text(((i%5)*240+8,(i//5)*460+5),str(i+1),fill='black')
 sheet.save(out/f'{kind}-contact.png')
 report.append({'file':file.name,'pages':len(doc),'bytes':file.stat().st_size,'allProductNames':True,'links':sum(len(p.get('/Annots',[])) for p in reader.pages)})
for count in [1,7]:
 file=out/f'edge-{count}.pdf';reader=PdfReader(file);text=' '.join(p.extract_text() for p in reader.pages)
 for i in range(count):assert text.count(f'PRUEBA-{i+1}')==1
 doc=pdfium.PdfDocument(str(file));doc[1].render(scale=1.8).to_pil().save(out/f'edge-{count}-interior.png')
 report.append({'edgeProducts':count,'pages':len(reader.pages),'noDuplicatesOrMissing':True})
(out/'inspection.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
