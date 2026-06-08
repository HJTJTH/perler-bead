const fs=require('fs');
let html=fs.readFileSync('C:/claudecode/perler-bead-base.html','utf8');
const mard96=fs.readFileSync('C:/claudecode/_mard_96.js','utf8').trim();
const mard144=fs.readFileSync('C:/claudecode/_mard_144.js','utf8').trim();
const mard168=fs.readFileSync('C:/claudecode/_mard_168.js','utf8').trim();

const beadStart=html.indexOf('const BEAD_COLORS=[');
const beadEndMarker='];\n\n//';
const beadEnd=html.indexOf(beadEndMarker, beadStart)+2;
if(beadStart<0||beadEnd<2){console.log('BEAD_COLORS not found');process.exit(1);}

const fullBEAD=html.substring(beadStart, html.indexOf('];', beadStart)+2);
const allPalettes=fullBEAD+'\n'+mard96+';\n'+mard144+';\n'+mard168+';\n'+
  'const PALETTES={"MARD 96色":MARD_96,"MARD 144色":MARD_144,"MARD 168色":MARD_168,"MARD 291色":BEAD_COLORS};';
html=html.substring(0,beadStart)+allPalettes+html.substring(beadEnd);

const btnSection='    <button class="btn outline" id="btnAuto">🤖 自动配色</button>\n    <button class="btn outline active" id="btnBead">🧶 拼豆色</button>';
const dropdown=
'  <div class="param-group" style="padding:8px 10px">\n'+
'    <label>色板 <span class="val" id="paletteLabel">MARD 291色</span></label>\n'+
'    <select id="paletteSelect" style="width:100%;padding:6px;border-radius:6px;background:#0f3460;color:#eee;border:1px solid #444;font-size:.8em">\n'+
'      <option value="auto">🤖 自动配色</option>\n'+
'      <option value="MARD 96色">🧶 MARD 96色</option>\n'+
'      <option value="MARD 144色">🧶 MARD 144色</option>\n'+
'      <option value="MARD 168色">🧶 MARD 168色</option>\n'+
'      <option value="MARD 291色" selected>🧶 MARD 291色</option>\n'+
'    </select>\n'+
'  </div>';
html=html.replace(btnSection, dropdown);

const oldFn='function setPaletteMode(mode){\n  currentPalette=(mode===\'bead\')?BEAD_COLORS:null;\n  [\'btnAuto\',\'btnBead\'].forEach(id=>$(id).classList.remove(\'active\'));\n  if(mode===\'bead\')$(\'btnBead\').classList.add(\'active\');else $(\'btnAuto\').classList.add(\'active\');\n  if(sourceImg)render();\n}';
const newFn='function setPalette(val){\n  if(val===\'auto\'){currentPalette=null;}\n  else{currentPalette=PALETTES[val];}\n  $(\'paletteLabel\').textContent=val;\n  if(sourceImg)render();\n}';
html=html.replace(oldFn, newFn);
html=html.replace('$(\'btnAuto\').addEventListener(\'click\',()=>setPaletteMode(\'auto\'));\n$(\'btnBead\').addEventListener(\'click\',()=>setPaletteMode(\'bead\'));',
  '$(\'paletteSelect\').addEventListener(\'change\',()=>setPalette($(\'paletteSelect\').value));');
if(html.includes('currentPalette=null')) html=html.replace('currentPalette=null','currentPalette=BEAD_COLORS');

const beadCount=(html.match(/const BEAD_COLORS=/g)||[]).length;
console.log('BEAD_COLORS:', beadCount, 'Has dropdown:', html.includes('paletteSelect'), 'Size:', html.length);
fs.writeFileSync('C:/claudecode/perler-bead.html', html);
console.log('OK');
