import sys, json
from decimal import Decimal as D, getcontext
getcontext().prec = 60
C = D("299792.458")
out = []
for h0, om, z in json.loads(sys.argv[1]):
    h0, om, z = D(str(h0)), D(str(om)), D(str(z))
    out.append(str((2 * C / h0) / (om * om) * (om * z + (om - 2) * ((1 + om * z).sqrt() - 1))))
print(json.dumps(out))
