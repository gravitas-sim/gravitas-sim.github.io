# Spike, Prompt 268: the synthetic N09 snapshot (N = 1000, numpy default_rng(268009)), as a grid document.
# python3 -E tools/compute-gate-snapshot.py <outdir>
import base64, hashlib, json, os, sys
import numpy as np
n = 1000
rng = np.random.default_rng(268009)
x = rng.standard_normal(n)
y = rng.standard_normal(n)
m = np.full(n, 1.0 / n)
def grid(N, x, y, m, title, gid):
    flat = np.concatenate([x, y, m]).astype('<f8')
    return {"format": "gravitas.grid", "formatVersion": 1, "id": gid, "title": title,
            "axes": [{"name": "body", "unit": "", "values": list(range(N))}],
            "outputs": [{"name": "x", "unit": ""}, {"name": "y", "unit": ""}, {"name": "m", "unit": ""}],
            "generator": {"name": "tools/compute-gate-snapshot.py", "version": "1",
                          "inputs": {"seed": 268009, "N": N, "numpy": np.__version__, "G": 1,
                                     "synthetic": "x then y drawn from standard normals, equal masses 1/N"}},
            "layout": "dense", "storage": {"encoding": "float64-le", "data": base64.b64encode(flat.tobytes()).decode()}}
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
docs = {
 "n09-snapshot.grid.json": grid(n, x, y, m, "SYNTHETIC: 1000 equal-mass bodies, x and y standard normal, numpy default_rng(268009), G = 1", "compute-gate-ii:n09-snapshot"),
}
N2 = 4001
r2 = np.random.default_rng(268010)
docs["n09-too-many.grid.json"] = grid(N2, r2.standard_normal(N2), r2.standard_normal(N2), np.full(N2, 1.0 / N2), "SYNTHETIC: 4001 bodies (over the notebook's cap)", "compute-gate-ii:n09-too-many")
for name, d in docs.items():
    t = json.dumps(d, separators=(",", ":")) + "\n"
    open(os.path.join(out, name), "w").write(t)
    print(hashlib.sha256(t.encode()).hexdigest(), name, len(t))
