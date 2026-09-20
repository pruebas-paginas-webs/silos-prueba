"""Migración única del HTML legado; no usar como build recurrente."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
for name in ['index.html','catalogo.html']:
 p=root/'public'/name
 s=p.read_text(encoding='utf-8')
 s=re.sub(r'  <link[^>]+(?:fonts.googleapis.com|fonts.gstatic.com)[^>]*>\s*','',s)
 if name=='index.html':
  s=re.sub(r'<ul class="products-grid" data-reveal>.*?</ul>','<ul class="products-grid" data-featured></ul>',s,flags=re.S)
  s=s.replace('Con fotos, presentaciones y descarga en PDF.','Con fotos, presentaciones y disponibilidad.')
  s=s.replace('href="#productos">\n            <span>Mirá nuestros productos</span>','href="catalogo.html">\n            <span>Ver catálogo</span>')
  s=s.replace('Desde 2021 importamos y distribuimos quesos, fiambres y otros productos premium de Dinamarca, España, Italia, Países Bajos e Inglaterra, para los clientes y consumidores más exigentes de Paraguay.','Quesos, jamones y fiambres seleccionados de Europa para góndolas y cocinas de Paraguay. Importamos y distribuimos desde 2021.')
  s=s.replace('</body>','  <script src="catalogo.js" defer></script>\n</body>')
 else:
  s=re.sub(r'    <!-- Portada:.*?(?=    <section class="section catalog-head">)','',s,flags=re.S)
  s=re.sub(r'          <button class="btn btn-primary" type="button" data-print>.*?</button>','',s,flags=re.S)
  s=re.sub(r'        <p class="catalog-hint" data-print-hint>.*?</p>','''        <div class="catalog-search-row"><label for="catalog-search">Buscar producto o marca<input id="catalog-search" type="search" placeholder="Brie, jamón, Emborg…" /></label><label class="catalog-stock-label"><input id="catalog-stock" type="checkbox" /> Solo disponibles</label></div>''',s,flags=re.S)
 p.write_text(s,encoding='utf-8')
p=root/'public/styles.css'
s=p.read_text(encoding='utf-8')
s=s[:s.index('/* ----------------------------- Panel de administración')]
fonts='''@font-face{font-family:"Spectral";src:url("assets/fonts/spectral-latin-400-normal.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Spectral";src:url("assets/fonts/spectral-latin-600-normal.woff2") format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"Hanken Grotesk";src:url("assets/fonts/hanken-grotesk-latin-400-normal.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Hanken Grotesk";src:url("assets/fonts/hanken-grotesk-latin-600-normal.woff2") format("woff2");font-weight:500 800;font-display:swap}
'''
s=fonts+s+'''
.catalog-head{padding:45px 0 28px}.catalog-head .section-head{margin-bottom:22px}.catalog-head .section-title{font-size:clamp(2rem,4vw,3rem)}.catalog-head .catalog-filters{margin-top:18px}.catalog-body{padding-top:32px}.catalog-search-row{display:flex;gap:24px;align-items:end;margin-top:24px}.catalog-search-row label{display:grid;gap:7px;font-size:14px}.catalog-search-row input[type=search]{width:min(440px,70vw);min-height:46px;padding:10px 16px;border:1px solid #cbd0c6;border-radius:10px;background:white;font:inherit}.catalog-search-row .catalog-stock-label{display:flex;align-items:center;min-height:46px;gap:9px}.catalog-stock-label input{width:19px;height:19px;accent-color:#385947}.catalog-presentation{font-size:15px;font-weight:600}.product-inquiry{font-size:13px;color:#355743;text-decoration:underline;text-underline-offset:4px;margin-top:8px;padding:10px 0;min-height:44px}.public-price{font-weight:600;color:#355743}.catalog-card .catalog-placeholder{width:100%;height:100%;display:grid;place-items:center;font-size:14px}.catalog-card .product-name{overflow-wrap:anywhere}.catalog-empty{padding:40px 0}.catalog-empty button{margin-top:15px}[hidden]{display:none!important}
@media(max-width:600px){.catalog-head{padding:28px 0 24px}.catalog-head .section-sub{font-size:15px}.catalog-search-row{align-items:stretch;flex-direction:column;gap:9px}.catalog-search-row input[type=search]{width:100%}.catalog-filters{gap:8px}.catalog-grid{gap:24px 14px}.catalog-meta{font-size:13px}.catalog-card .product-name{font-size:18px}.catalog-body{padding-top:25px}}
'''
p.write_text(s,encoding='utf-8')
