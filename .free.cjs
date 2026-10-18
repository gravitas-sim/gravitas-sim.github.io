const acorn=require('acorn'),fs=require('fs');
const src=fs.readFileSync('js/investigations.js','utf8');
const ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'module'});
const top=new Map();
for(const n of ast.body){let e=n.type==='ExportNamedDeclaration'&&n.declaration?n.declaration:n;
 if(e.type==='FunctionDeclaration')top.set(e.id.name,{n:e,kind:'fn'});
 else if(e.type==='VariableDeclaration')for(const d of e.declarations){ if(d.id.name)top.set(d.id.name,{n:d,kind:e.kind});}
 else if(e.type==='ImportDeclaration')for(const s of e.specifiers)top.set(s.local.name,{kind:'import'});}
function visit(node,fn,parent,key){ if(!node||typeof node.type!=='string')return; fn(node,parent,key);
 for(const k in node){const v=node[k]; if(Array.isArray(v))v.forEach(c=>visit(c,fn,node,k)); else if(v&&typeof v.type==='string')visit(v,fn,node,k);} }
for(const nm of process.argv.slice(2)){const t=top.get(nm);const used=new Set();
 visit(t.n,(x,p,k)=>{ if(x.type!=='Identifier'||!top.has(x.name)||x.name===nm)return;
  if(p&&p.type==='MemberExpression'&&k==='property'&&!p.computed)return;
  if(p&&p.type==='Property'&&k==='key'&&!p.computed&&!p.shorthand)return;
  used.add(x.name)});
 console.log(nm,'->',[...used].map(u=>u+':'+top.get(u).kind).join(' '))}
