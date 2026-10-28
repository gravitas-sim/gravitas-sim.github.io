import { readFileSync } from 'node:fs';
import * as K from '/Users/carl/Desktop/Gravitas/worktrees/p201-spike/js/kernels/atmospheres/index.js';
const O = JSON.parse(readFileSync(process.argv[2]));
let n=0, v0=0, vA=0, vB=0, worstH=0, worstZ=0, ratioMax={A:0,B:0}, bothSign=0;
const strongOnly={n:0,fail:0,worst:0};
for (const a of O.X3) for (const nm of ['strong','weak','window']) {
  const r=K.bandDepth({radius:a.Rp,starRadius:a.Rs,temperature:a.T,meanMolecularWeight:a.mu,gravity:a.g,pressure:a.P0,abundance:a.X,band:K.SYNTHETIC_BANDS[nm]});
  if(r.refused) continue; n++;
  const fl=(a.Rp/a.Rs)**2, ex=a.delta[nm]-fl, err=Math.abs((r.depth-fl)/ex-1);
  const z=r.zEff/a.Rp, h=a.H/a.Rp;
  if(err>Math.max(1e-3,1.5*z)) v0++;
  const A=1.5*(z+2*h), B=1.5*(z+3*h);
  if(err>Math.max(1e-3,A)) vA++;
  if(err>Math.max(1e-3,B)) vB++;
  ratioMax.A=Math.max(ratioMax.A,err/A); ratioMax.B=Math.max(ratioMax.B,err/B);
  if(nm==='strong'){strongOnly.n++; if(err>Math.max(1e-3,1.5*z)) strongOnly.fail++; strongOnly.worst=Math.max(strongOnly.worst,err/(1.5*z));}
}
console.log({n,failuresAsCommitted:v0,candidate1p5_z_plus_2H:{violations:vA,worstRatio:ratioMax.A},candidate_z_plus_3H:{violations:vB,worstRatio:ratioMax.B},strongOnly});
