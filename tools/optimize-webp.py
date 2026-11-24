from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageOps
import re, math, json, html
from urllib.parse import unquote, urlsplit
from concurrent.futures import ThreadPoolExecutor

root=Path(".")
attr=re.compile(r'(\b(?:src|data-src)\s*=\s*)(["\'])([^"\'<>]+)\2', re.I)
css=re.compile(r'(url\(\s*)(["\']?)([^)"\']+)\2(\s*\))', re.I)
docs={p:p.read_text(encoding="utf-8") for p in sorted(list(root.glob("*.html"))+list(root.glob("*.css"))) if p.name not in {"admin.html","admin.css"}}
def resolve(raw):
    url=html.unescape(raw)
    parts=urlsplit(url)
    if parts.scheme or parts.netloc or url.startswith(("/", "#", "data:")):
        return None
    p=Path(unquote(parts.path))
    if p.suffix.lower() not in {".png",".jpg",".jpeg"} or not p.is_file() or ".." in p.parts:
        return None
    return p

sources=set()
for txt in docs.values():
    for pat in (attr,css):
        for m in pat.finditer(txt):
            p=resolve(m[3])
            if p: sources.add(p)

def psnr(a,b):
    aa=a.convert("RGBA")
    bb=b.convert("RGBA")
    if aa.size!=bb.size or aa.getchannel("A").tobytes()!=bb.getchannel("A").tobytes():
        return 0.0
    vals=[]
    for bg in ("white","black"):
        base=Image.new("RGBA",aa.size,bg)
        d=ImageChops.difference(Image.alpha_composite(base,aa).convert("RGB"),Image.alpha_composite(base,bb).convert("RGB"))
        rms=ImageStat.Stat(d).rms
        mse=sum(v*v for v in rms)/3
        vals.append(99.0 if mse==0 else 10*math.log10(255**2/mse))
    return min(vals)

def optimize(p):
    out=p.with_name(p.name+".webp")
    row={"original":p.as_posix(),"before":p.stat().st_size}
    with Image.open(p) as src:
        if getattr(src,"is_animated",False):
            return dict(row,skipped="animated")
        src.load()
        source=ImageOps.exif_transpose(src)
        source=source.convert("RGBA" if ("A" in source.getbands() or "transparency" in src.info) else "RGB")
        opts={"method":6,"exact":True}
        if src.info.get("icc_profile"): opts["icc_profile"]=src.info["icc_profile"]
        source.save(out,format="WEBP",quality=95,alpha_quality=100,**opts)
        with Image.open(out) as check:
            score=psnr(source,check)
        mode="quality95"
        if score<42:
            source.save(out,format="WEBP",lossless=True,quality=100,**opts)
            with Image.open(out) as check:
                score=psnr(source,check)
            mode="lossless"
        if score<42 or out.stat().st_size>=row["before"]*0.95:
            out.unlink()
            return dict(row,skipped="quality or savings threshold",psnr=round(score,2))
        return dict(row,webp=out.as_posix(),after=out.stat().st_size,width=source.width,height=source.height,psnr=round(score,2),mode=mode)

with ThreadPoolExecutor(max_workers=2) as pool:
    report=list(pool.map(optimize,sorted(sources)))
mapping={r["original"]:r["webp"] for r in report if "webp" in r}
def changed_url(raw):
    p=resolve(raw)
    if p is None or p.as_posix() not in mapping: return raw
    match=re.match(r'([^?#]+)(.*)',raw)
    return match[1]+".webp"+match[2]

for p,txt in docs.items():
    new=attr.sub(lambda m:m[1]+m[2]+changed_url(m[3])+m[2],txt)
    new=css.sub(lambda m:m[1]+m[2]+changed_url(m[3])+m[2]+m[4],new)
    if new!=txt: p.write_text(new,encoding="utf-8")
assert mapping, "No optimized images"
used=[r for r in report if "webp" in r]
summary={"converted":len(used),"skipped":len(report)-len(used),"before":sum(r["before"] for r in used),"after":sum(r["after"] for r in used),"images":report}
Path("webp-optimization-report.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({k:v for k,v in summary.items() if k!="images"},ensure_ascii=False))
