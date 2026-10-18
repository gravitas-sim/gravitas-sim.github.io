const acorn=require('acorn'),fs=require('fs');
const file=process.argv[2],lo=+process.argv[3],hi=+process.argv[4];
const src=fs.readFileSync(file,'utf8');
const ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'module',locations:true});
const top=new Map();
function decl(n){const e=n.type==='ExportNamedDeclaration'&&n.declaration?n.declaration:n;
 if(e.type==='FunctionDeclaration')return[[e.id.name,'fn']];
 if(e.type==='ClassDeclaration')return[[e.id.name,'class']];
 if(e.type==='VariableDeclaration')return e.declarations.map(d=>[d.id.name||'{}',e.kind]);
 if(e.type==='ImportDeclaration')return e.specifiers.map(s=>[s.local.name,'import']);return[]}
const inRange=[];const defIn=new Set();
for(const n of ast.body){for(const[nm,k]of decl(n)){top.set(nm,{k,line:n.loc.start.line});}
 if(n.loc.start.line>=lo&&n.loc.end.line<=hi){inRange.push(n);decl(n).forEach(([nm])=>defIn.add(nm));}}
function visit(node,fn,p,k){if(!node||typeof node.type!=='string')return;fn(node,p,k);for(const key in node){const v=node[key];if(Array.isArray(v))v.forEach(c=>visit(c,fn,node,key));else if(v&&typeof v.type==='string')visit(v,fn,node,key)}}
const ext=new Map();const defs=[];
for(const n of inRange){visit(n,(x,p,k)=>{if(x.type!=='Identifier'||!top.has(x.name)||defIn.has(x.name))return;
 if(p&&p.type==='MemberExpression'&&k==='property'&&!p.computed)return;
 if(p&&p.type==='Property'&&k==='key'&&!p.computed&&!p.shorthand)return;
 ext.set(x.name,(ext.get(x.name)||0)+1)})}
console.log('defined in range:',[...defIn].join(' '));
console.log('external refs:');for(const[nm,c]of ext)console.log('  ',nm,top.get(nm).k,'@'+top.get(nm).line,'x'+c);
// who outside the range uses defIn names
const users=new Map();
for(const n of ast.body){if(inRange.includes(n))continue;visit(n,(x,p,k)=>{if(x.type!=='Identifier'||!defIn.has(x.name))return;if(p&&p.type==='MemberExpression'&&k==='property'&&!p.computed)return;if(p&&p.type==='Property'&&k==='key'&&!p.computed&&!p.shorthand)return;users.set(x.name,(users.get(x.name)||0)+1)})}
console.log('used outside the range:');for(const[nm,c]of users)console.log('  ',nm,'x'+c);
