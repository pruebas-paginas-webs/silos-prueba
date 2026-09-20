"""Marca las muestras con pypdf y reportlab, sin dependencias adicionales."""
from io import BytesIO
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
root = Path(__file__).resolve().parents[1]
for kind in ['con', 'sin']:
    file = root / f'demo/pdf/Silos-Paraguay-movil-{kind}-precios-DEMO.pdf'
    reader = PdfReader(file)
    if (reader.metadata.subject or '').startswith('Muestra'):
        print('ya marcado:', file.name)
        continue
    cover = reader.pages[0]
    width, height = float(cover.mediabox.width), float(cover.mediabox.height)
    overlay = BytesIO()
    c = canvas.Canvas(overlay, pagesize=(width, height))
    c.setFillColorRGB(.604, .761, .690)
    c.setFont('Helvetica-Bold', 7.2)
    c.drawString(24, height-509, 'MUESTRA DE DEMOSTRACIÓN')
    c.setFillColorRGB(.957, .945, .918)
    c.setFont('Helvetica', 6.6)
    c.drawString(24, height-524, 'Importes de ejemplo, no son la lista real.' if kind=='con' else 'Catálogo de ejemplo para probar la demo.')
    c.save()
    cover.merge_page(PdfReader(overlay).pages[0])
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)
    writer.add_metadata({'/Title':'Silos Paraguay - muestra de demostración', '/Subject':'Muestra de demostración. Importes de ejemplo; no es la lista de precios real.', '/Author':'Silos Paraguay'})
    output = BytesIO()
    writer.write(output)
    file.write_bytes(output.getvalue())
    print('marcado:', file.name)
