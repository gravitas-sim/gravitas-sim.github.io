"""
Cuts the crater regions of Prompt 195 part 2 from the retrieved sources.

    python3 -I tools/craters-oracle/regions.py <retrieval dir> <repository root>

Standard library plus Pillow (for the one JPEG decode and crop, as
tools/data-packs/image-decode.py does); no Gravitas code and no numpy. The regions,
the cut and the projections are those of tests/fixtures/craters/regions-
thresholds.json, which was committed before this ran. It writes:

  frames/craters-<region>.json         the cropped display plane (base64, uint8)
  frames/craters-regions.json          the regional lists, areas, geometry, credits
  tests/fixtures/craters/regions-oracle.json    counts at the thresholds, areas, crops
  tests/fixtures/craters/regions-provenance.json  sources, hashes, terms, outputs

The retrieval dir holds mars/, sal/ and robbins/ (see its RETRIEVAL.md). Nothing is
fetched. The catalogue files are read unmodified; the Salamuniccar dBase table is
parsed here from its fixed-width records.
"""

import base64
import hashlib
import io
import json
import math
import site
import struct
import sys
import zipfile

sys.path.append(site.getusersitepackages())
from PIL import Image  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

src = sys.argv[1].rstrip("/") + "/"
root = sys.argv[2].rstrip("/") + "/"
TH = json.load(open(root + "tests/fixtures/craters/regions-thresholds.json"))
REG = TH["regions"]
CUT = 20.0
R_MOON = 1737.4
R_MARS = 3396.19
RELSIGMA = {"moon": 0.0, "mars": 0.003}


def sha(b):
    return hashlib.sha256(b).hexdigest()


def read(p):
    return open(p, "rb").read()


# ---- catalogues ----------------------------------------------------------------------

zbytes = read(src + "sal/goransalamuniccar_mooncraters.zip")
z = zipfile.ZipFile(io.BytesIO(zbytes))
dbf = z.read("GoranSalamuniccar_MoonCraters/LU78287GT_GIS/LU78287GT_Moon2000.dbf")
n, hl, rl = struct.unpack("<xxxxIHH", dbf[:12])
fields = []
o = 32
while dbf[o] != 0x0D:
    fields.append((dbf[o : o + 11].split(b"\0")[0].decode(), dbf[o + 16]))
    o += 32
offs = {}
pos = 1  # the deletion flag
for name, ln in fields:
    offs[name] = (pos, ln)
    pos += ln
assert [f[0] for f in fields] == ["Lon_E", "Lat", "p", "Name", "Radius_deg", "Radius_km"]


def moon_rows():
    for i in range(n):
        rec = dbf[hl + i * rl : hl + (i + 1) * rl]
        if rec[0:1] == b"*":
            continue

        def f(k):
            a, ln = offs[k]
            return float(rec[a : a + ln])

        yield f("Lon_E"), f("Lat"), 2.0 * f("Radius_km")


moon_all = list(moon_rows())
assert len(moon_all) == 78287


def mars_rows(name):
    d = json.load(open(src + "robbins/" + name))
    for ft in d["features"]:
        p = ft["properties"]
        yield p["lon_e"], p["lat"], p["diamkm"]


mars_files = {
    "mars-highland": "highlands.json",
    "mars-plains": "plains.json",
}


def inbox(rows, lon, lat):
    return [
        (D, lo, la)
        for lo, la, D in rows
        if lon[0] <= lo < lon[1] and lat[0] <= la < lat[1] and D >= CUT
    ]


def area(body, lon, lat):
    R = R_MOON if body == "moon" else R_MARS
    return R * R * math.radians(lon[1] - lon[0]) * (
        math.sin(math.radians(lat[1])) - math.sin(math.radians(lat[0]))
    )


# ---- frames ----------------------------------------------------------------------------

clem = Image.open(io.BytesIO(read(root + "tests/fixtures/lunar/PIA00302-clementine-nearside.jpg")))
clem.load()
clem_rgb = clem.convert("RGB")
mars_img = Image.open(src + "mars/mars_viking_mdim21_clrmosaic_1km.jpg")
mars_img.load()
mars_rgb = mars_img.convert("RGB")
MW, MH = mars_rgb.size
CW = clem_rgb.size[0]
assert CW == 1719 and clem_rgb.size[1] == 1719
RPX = CW / 2.0
CX = CY = CW / 2.0


def moon_px(lon, lat):
    la, lo = math.radians(lat), math.radians(lon)
    return CX + RPX * math.cos(la) * math.sin(lo), CY - RPX * math.sin(la)


def mars_px(lon, lat):
    return (lon + 180.0) * MW / 360.0, (90.0 - lat) * MH / 180.0


def boundary(lon, lat, step=0.25):
    pts = []
    k = int(round((lon[1] - lon[0]) / step))
    for i in range(k + 1):
        pts.append((lon[0] + i * step, lat[0]))
        pts.append((lon[0] + i * step, lat[1]))
    k = int(round((lat[1] - lat[0]) / step))
    for i in range(k + 1):
        pts.append((lon[0], lat[0] + i * step))
        pts.append((lon[1], lat[0] + i * step))
    return pts


def gray_plane(img, box):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    rgb = img.crop(box).tobytes()
    out = bytearray(w * h)
    for j in range(h):
        for i in range(w):
            k = 3 * (j * w + i)
            g = 0.299 * rgb[k] + 0.587 * rgb[k + 1] + 0.114 * rgb[k + 2]
            # rows from the bottom, as FITS
            out[(h - 1 - j) * w + i] = int(math.floor(g + 0.5))
    return w, h, bytes(out)


regions = {}
oracle = {}
frames_out = {}
for rid, r in REG.items():
    body = r["body"]
    lon, lat = r["lonE"], r["lat"]
    proj = moon_px if body == "moon" else mars_px
    pts = [proj(a, b) for a, b in boundary(lon, lat)]
    x0 = max(0, int(math.floor(min(p[0] for p in pts))))
    x1 = min(CW if body == "moon" else MW, int(math.ceil(max(p[0] for p in pts))))
    y0 = max(0, int(math.floor(min(p[1] for p in pts))))
    y1 = min(CW if body == "moon" else MH, int(math.ceil(max(p[1] for p in pts))))
    box = (x0, y0, x1, y1)
    img = clem_rgb if body == "moon" else mars_rgb
    w, h, plane = gray_plane(img, box)
    fid = "craters-" + rid
    text = json.dumps(
        {
            "format": "gravitas.image-pack-planes",
            "formatVersion": 1,
            "id": fid,
            "width": w,
            "height": h,
            "planes": {"display": {"encoding": "uint8", "base64": base64.b64encode(plane).decode()}},
        },
        separators=(",", ":"),
    ) + "\n"
    fb = text.encode()
    open(root + "frames/" + fid + ".json", "wb").write(fb)
    rows = moon_all if body == "moon" else list(mars_rows(mars_files[rid]))
    lst = inbox(rows, lon, lat)
    lst.sort(key=lambda t: (-t[0], t[1], t[2]))
    A = area(body, lon, lat)
    thr = []
    t = CUT
    big = max((d for d, _, _ in lst), default=CUT)
    k = 0
    while CUT * 2 ** (k / 2) <= big:
        thr.append(CUT * 2 ** (k / 2))
        k += 1
    counts = [sum(1 for d, _, _ in lst if d >= t) for t in thr]
    if body == "moon":
        geo = {
            "projection": "orthographic about 0N 0E",
            "kmPerPixelAtCentre": R_MOON / RPX,
            "kmPerPixelSigma": R_MOON / RPX * 0.5 / RPX,
            "centrePx": [CX, CY],
            "radiusPx": RPX,
            "radiusKm": R_MOON,
            "cropOriginPx": [x0, y0],
        }
    else:
        s = 2 * math.pi * R_MARS / MW
        geo = {
            "projection": "simple cylindrical (equirectangular), planetocentric",
            "kmPerPixel": s,
            "radiusKm": R_MARS,
            "mosaicPx": [MW, MH],
            "cropOriginPx": [x0, y0],
        }
    regions[rid] = {
        "body": body,
        "what": r["what"],
        "lonE": lon,
        "lat": lat,
        "areaKm2": A,
        "areaRelSigma": RELSIGMA[body],
        "completeFromKm": 30.0 if body == "moon" else 20.0,
        "cutKm": CUT,
        "frame": {
            "file": "frames/" + fid + ".json",
            "bytes": len(fb),
            "sha256": sha(fb),
            "width": w,
            "height": h,
            "use": "display-only",
            "cropBoxPx": list(box),
            "rows": "from the bottom, as FITS",
            "gray": "0.299 R + 0.587 G + 0.114 B, rounded",
        },
        "geometry": geo,
        "craters": [[round(d, 3), lo, la] for d, lo, la in lst],
    }
    oracle[rid] = {
        "n": len(lst),
        "areaKm2": A,
        "thresholdsKm": thr,
        "counts": counts,
        "cropBoxPx": list(box),
    }
    frames_out[rid] = {"file": "frames/" + fid + ".json", "bytes": len(fb), "sha256": sha(fb)}

doc = {
    "format": "gravitas.crater-regions",
    "formatVersion": 1,
    "prompt": 195,
    "credit": {
        "moon": "Frame: Clementine nearside orthographic mosaic, NASA/JPL/USGS (PIA00302; repository fixture tests/fixtures/lunar). Craters: LU78287GT, G. Salamunicar, S. Loncaric, A. Grumpe and C. Woehler 2013, Adv. Space Res., doi:10.1016/j.asr.2013.06.024, with LU60645GT (Salamunicar, Loncaric and Mazarico 2012, Planet. Space Sci. 60, 236, doi:10.1016/j.pss.2011.09.003), hosted by the USGS Astrogeology Science Center (Astropedia): Access Constraints None, Use Constraints Please cite authors.",
        "mars": "Frame: Mars Viking Colorized Global Mosaic 232m (MDIM 2.1 blended by NASA AMES, 1 km/px version), USGS Astrogeology Science Center; Access Constraints Public domain, Use Constraints None. Craters: Robbins V1 crater database, S. J. Robbins and B. M. Hynek 2012, J. Geophys. Res. Planets 117, E05004, doi:10.1029/2011JE003966, as served by the USGS Astrogeology OGC API (collection mars/robbinsv1); no licence is stated; credited under a recorded 'no licence stated, credited' decision (DECISION_REGISTER.md D-R10-77).",
    },
    "regions": regions,
}
text = json.dumps(doc, separators=(",", ":")) + "\n"
open(root + "frames/craters-regions.json", "wb").write(text.encode())
json.dump(
    {"format": "gravitas.craters-regions-oracle/1", "prompt": 195, "regions": oracle},
    open(root + "tests/fixtures/craters/regions-oracle.json", "w"),
    indent=1,
)
prov = {
    "format": "gravitas.craters-regions-provenance/1",
    "prompt": 195,
    "retrieved": "2026-10-25, by the main session with Carl's consent (chat to the main session: \"Download the data needed for  195\")",
    "script": "tools/craters-oracle/regions.py",
    "sources": {
        "mars-frame": {
            "file": "mars_viking_mdim21_clrmosaic_1km.jpg",
            "url": "https://astrogeology.usgs.gov/ckan/dataset/7131d503-cdc9-45a5-8f83-5126c0fd397e/resource/5ea881c6-01b3-41fa-a7af-42d2131b54f1/download/mars_viking_mdim21_clrmosaic_1km.jpg",
            "page": "https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m",
            "bytes": len(read(src + "mars/mars_viking_mdim21_clrmosaic_1km.jpg")),
            "sha256": sha(read(src + "mars/mars_viking_mdim21_clrmosaic_1km.jpg")),
            "pixels": [MW, MH],
            "terms": "USGS Astropedia dataset page, read 2026-10-25: Access constraints: \"Public domain\"; Use constraints: \"None\"; publisher USGS Astrogeology Science Center; originators NASA AMES; the page carries no separate licence text",
            "committed": False,
        },
        "moon-catalogue": {
            "file": "goransalamuniccar_mooncraters.zip",
            "url": "https://astrogeology.usgs.gov/ckan/dataset/144c1f05-de7f-4e45-aa6d-5ca04622bcb1/resource/fd47a9d8-046b-406c-b160-e416fd32f5fa/download/goransalamuniccar_mooncraters.zip",
            "page": "https://astrogeology.usgs.gov/search/map/moon_crater_database_v1_salamuni_car",
            "bytes": len(zbytes),
            "sha256": sha(zbytes),
            "terms": "USGS Astropedia dataset page, read 2026-10-25: Access Constraints: \"None\"; Use Constraints: \"Please cite authors\"; no named licence",
            "craters": 78287,
            "committed": False,
        },
        "mars-catalogue-plains": {
            "file": "plains.json",
            "url": "https://astrogeology.usgs.gov/pygeoapi/collections/mars/robbinsv1/items?f=json&bbox=165,0,180,15&limit=10000",
            "bytes": len(read(src + "robbins/plains.json")),
            "sha256": sha(read(src + "robbins/plains.json")),
            "terms": "collection page https://astrogeology.usgs.gov/pygeoapi/collections/mars/robbinsv1 read 2026-10-25: no licence, rights or terms field; the author's page https://craters.sjrdesign.net/ states none, funding by NASA awards NESSF NNX07AU85H and ROSES NNX10AL65G, and asks for citation of Robbins and Hynek (2012)",
            "committed": False,
        },
        "mars-catalogue-highlands": {
            "file": "highlands.json",
            "url": "https://astrogeology.usgs.gov/pygeoapi/collections/mars/robbinsv1/items?f=json&bbox=40,0,55,15&limit=10000",
            "bytes": len(read(src + "robbins/highlands.json")),
            "sha256": sha(read(src + "robbins/highlands.json")),
            "terms": "as for the plains answer",
            "committed": False,
        },
        "moon-frame": {
            "file": "tests/fixtures/lunar/PIA00302-clementine-nearside.jpg",
            "bytes": len(read(root + "tests/fixtures/lunar/PIA00302-clementine-nearside.jpg")),
            "sha256": sha(read(root + "tests/fixtures/lunar/PIA00302-clementine-nearside.jpg")),
            "terms": "NASA/JPL/USGS, see tests/fixtures/lunar/provenance.json",
            "committed": True,
        },
    },
    "outputs": {
        "frames": frames_out,
        "regions": {
            "file": "frames/craters-regions.json",
            "bytes": len(text.encode()),
            "sha256": sha(text.encode()),
        },
    },
    "decoder": "Pillow " + __import__("PIL").__version__ + "; python " + sys.version.split()[0],
    "decision": "Robbins' lists state no licence: only the regional diameter, longitude and latitude, cut at 20 km, are committed, with credit, as a recorded 'no licence stated, credited' decision under Roadmap III 7.5.4 (D-R10-77), ratified by Carl: \"Keep, credited (Recommended)\" = \"Facts-only subset (positions and sizes), credited, and it can be removed later. The legs that need it keep running.\" (AskUserQuestion to the merge-queue session, 2026-10-25). The full files and answers stay in the scratchpad with their SHA-256.",
}
json.dump(prov, open(root + "tests/fixtures/craters/regions-provenance.json", "w"), indent=2)
for rid, o in oracle.items():
    print(rid, o["n"], round(o["areaKm2"]), o["cropBoxPx"], frames_out[rid]["bytes"])
