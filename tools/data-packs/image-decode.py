# Decode one JPEG from standard input to raw 8-bit RGB on standard output.
#
#   python3 -I tools/data-packs/image-decode.py < picture.jpg > rgb.bin
#
# The first line of the output is a JSON object {"width", "height", "pillow",
# "libjpeg"}, then a newline, then width x height x 3 bytes, rows from the top.
# Node has no JPEG decoder, so tools/data-packs/image-packs.mjs asks this one
# for the pixels and does every other step itself, in integer arithmetic, so
# that the only thing a decoder can change is the decode (and the pack records
# which decoder it was). Nothing is written but the output; no file is read.
import io
import json
import site
import sys

# Run with -I, which leaves the user's own site-packages out; Pillow is
# installed there on the machines that build packs, so it is added after the
# standard library and nothing else.
sys.path.append(site.getusersitepackages())

from PIL import Image, features  # noqa: E402

data = sys.stdin.buffer.read()
im = Image.open(io.BytesIO(data))
im.load()
if im.format != "JPEG":
    sys.exit("not a JPEG: " + str(im.format))
rgb = im.convert("RGB")
head = {
    "width": rgb.width,
    "height": rgb.height,
    "pillow": __import__("PIL").__version__,
    "libjpeg": features.version("jpg"),
}
out = sys.stdout.buffer
out.write((json.dumps(head) + "\n").encode("ascii"))
out.write(rgb.tobytes())
