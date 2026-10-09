"""Re-reads DES-SN5YR_HD.csv and its README from the Zenodo zip (record
10.5281/zenodo.12720778, DES-SN5YR-1.2.zip) by HTTP range requests and compares
their SHA-256 with sources/. Prints the hashes and whether they match."""
import io, zipfile, urllib.request, hashlib
URL = "https://zenodo.org/records/12720778/files/DES-SN5YR-1.2.zip"
class R(io.RawIOBase):
    def __init__(s):
        s.n = int(urllib.request.urlopen(urllib.request.Request(URL, method="HEAD")).headers["Content-Length"]); s.p = 0
    def seekable(s): return True
    def readable(s): return True
    def tell(s): return s.p
    def seek(s, o, w=0):
        s.p = {0: o, 1: s.p + o, 2: s.n + o}[w]; return s.p
    def read(s, k=-1):
        if k < 0: k = s.n - s.p
        k = min(k, s.n - s.p)
        if k <= 0: return b""
        b = urllib.request.urlopen(urllib.request.Request(URL, headers={"Range": f"bytes={s.p}-{s.p+k-1}"})).read(); s.p += len(b); return b
    def readinto(s, b):
        d = s.read(len(b)); b[:len(d)] = d; return len(d)
z = zipfile.ZipFile(io.BufferedReader(R(), buffer_size=1 << 20))
for member, local in [("4_DISTANCES_COVMAT/DES-SN5YR_HD.csv", "sources/DES-SN5YR_HD.csv"), ("4_DISTANCES_COVMAT/README.md", "sources/DES-SN5YR_4_DISTANCES_COVMAT_README.md")]:
    a = hashlib.sha256(z.read("DES-SN5YR-1.2/" + member)).hexdigest()
    b = hashlib.sha256(open(local, "rb").read()).hexdigest()
    print(member, a, "same" if a == b else "DIFFERENT")
