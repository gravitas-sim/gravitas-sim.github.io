# Spike, Prompt 268: runs one notebook's code cells as tools/compute-answers.mjs does (python3 -I).
#   python3 -I tools/compute-gate-run.py <notebook.ipynb> <input file | -> [params JSON text]
# Prints the answer: the sorted-keys compact JSON of gravitas_output["answer"] (allow_nan=False); exits 1 and
# prints the exception's message to stderr when the notebook refuses.
import contextlib, io, json, sys
nbp, inp = sys.argv[1], sys.argv[2]
params = sys.argv[3] if len(sys.argv) > 3 else "{}"
cells = ["".join(c["source"]) for c in json.load(open(nbp))["cells"] if c["cell_type"] == "code"]
text = sys.stdin.read() if inp == "-" else open(inp).read()
g = {"gravitas_input": text, "gravitas_params": params}
try:
    with contextlib.redirect_stdout(io.StringIO()):
        for cell in cells:
            exec(compile(cell, nbp, "exec"), g)
except (AssertionError, ValueError) as e:
    sys.stderr.write("REFUSED: %s\n" % e)
    sys.exit(1)
print(json.dumps(g["gravitas_output"]["answer"], sort_keys=True, separators=(",", ":"), allow_nan=False))
