const fs=require('fs');
let html=fs.readFileSync('C:/claudecode/perler-bead-clean.html','utf8');

html=html.replace('let bgMarkedColors=new Set();','let bgMarkedColors=new Set();\nlet showLabels=true;');

html=html.replace('<button class="btn secondary" id="btnUndo">↩ 撤销</button>','<button class="btn secondary" id="btnUndo">↩ 撤销</button>\n    <button class="btn outline active" id="btnLabels">📝 色号</button>');

const oldH="document.getElementById('btnUndo').addEventListener('click',()=>{";
const newH="document.getElementById('btnLabels').addEventListener('click',()=>{showLabels=!showLabels;document.getElementById('btnLabels').classList.toggle('active',showLabels);drawPreview()});\ndocument.getElementById('btnUndo').addEventListener('click',()=>{";
html=html.replace(oldH, newH);

const oldLoop="ctx.fillRect(x*cell,y*cell,cell-1,cell-1)}}\n\n  for(let y=0;y<=h;y++){const tk=y%10===0?2:0.5";
const newLoop="ctx.fillRect(x*cell,y*cell,cell-1,cell-1)}}\n\n"+
"  if(showLabels&&cell>=16){\n"+
"    const fs=Math.max(7,Math.min(10,cell*0.38));\n"+
"    ctx.font='bold '+fs+'px Microsoft YaHei,sans-serif';\n"+
"    ctx.textAlign='center';ctx.textBaseline='middle';\n"+
"    for(let y=0;y<h;y++){for(let x=0;x<w;x++){\n"+
"      const idx=indices[y*w+x];if(bgCells&&bgCells.has(y*w+x))continue;\n"+
"      const[r,g,b]=palette[idx];const lum=r*0.299+g*0.587+b*0.114;\n"+
"      ctx.fillStyle=lum>150?'#000':'#fff';\n"+
"      ctx.fillText(names[idx],x*cell+cell/2,y*cell+cell/2);\n"+
"    }}\n"+
"  }\n\n"+
"  for(let y=0;y<=h;y++){const tk=y%10===0?2:0.5";
html=html.replace(oldLoop, newLoop);

console.log('showLabels:', (html.match(/showLabels/g)||[]).length);
console.log('btnLabels:', (html.match(/btnLabels/g)||[]).length);
console.log('label code:', html.includes('showLabels&&cell'));
fs.writeFileSync('C:/claudecode/perler-bead.html', html);
console.log('OK, size:', html.length);
