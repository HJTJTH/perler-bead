const fs=require('fs');
let html=fs.readFileSync('C:/claudecode/perler-bead.html','utf8');
const mard96=fs.readFileSync('C:/claudecode/_mard_96.js','utf8').trim().replace('const MARD_96=','');
const mard144=fs.readFileSync('C:/claudecode/_mard_144.js','utf8').trim().replace('const MARD_144=','');
const mard168=fs.readFileSync('C:/claudecode/_mard_168.js','utf8').trim().replace('const MARD_168=','');
const fullBEAD=html.match(/const BEAD_COLORS=\[([\s\S]*?)\];/);
if(!fullBEAD){console.log('BEAD_COLORS not found');process.exit(1);}
const beadArray=fullBEAD[0].slice(fullBEAD[0].indexOf('['));

const newPalettes=
'const BEAD_COLORS='+beadArray+';\n'+
'const MARD_96='+mard96+';\n'+
'const MARD_144='+mard144+';\n'+
'const MARD_168='+mard168+';\n'+
'const PALETTES={'+
  '"MARD 96色":MARD_96,'+
  '"MARD 144色":MARD_144,'+
  '"MARD 168色":MARD_168,'+
  '"MARD 291色":BEAD_COLORS'+
'};';

const start=html.indexOf('const BEAD_COLORS=[');
const end=html.indexOf('];\n\n//', start)+2;
html=html.substring(0,start)+newPalettes+html.substring(end);

const btnMarker='    <button class="btn outline" id="btnAuto"';
const editMarker='\n  <div class="btn-row">\n    <button class="btn secondary" id="btnEdit"';
const btnAutoStart=html.indexOf(btnMarker);
const btnRowEnd=html.indexOf(editMarker);

if(btnAutoStart>=0 && btnRowEnd>=0){
  const newDropdown=
'  <div class="param-group" style="padding:8px 10px">\n'+
'    <label>色板 <span class="val" id="paletteLabel">MARD 291色</span></label>\n'+
'    <select id="paletteSelect" style="width:100%;padding:6px;border-radius:6px;background:#0f3460;color:#eee;border:1px solid #444;font-size:.8em">\n'+
'      <option value="auto">自动配色</option>\n'+
'      <option value="MARD 96色">MARD 96色</option>\n'+
'      <option value="MARD 144色">MARD 144色</option>\n'+
'      <option value="MARD 168色">MARD 168色</option>\n'+
'      <option value="MARD 291色" selected>MARD 291色</option>\n'+
'    </select>\n'+
'  </div>\n'+
'\n'+
'  <div class="btn-row">';
  html=html.substring(0,btnAutoStart-2)+newDropdown+html.substring(btnRowEnd);
}

const oldSetFn='function setPaletteMode(mode){\n  currentPalette=(mode===\'bead\')?BEAD_COLORS:null;\n  [\'btnAuto\',\'btnBead\'].forEach(id=>$(id).classList.remove(\'active\'));\n  if(mode===\'bead\')$(\'btnBead\').classList.add(\'active\');else $(\'btnAuto\').classList.add(\'active\');\n  if(sourceImg)render();\n}';
const newSetFn='function setPalette(val){\n  if(val===\'auto\'){currentPalette=null;}\n  else{currentPalette=PALETTES[val];}\n  $(\'paletteLabel\').textContent=val;\n  if(sourceImg)render();\n}';
html=html.replace(oldSetFn, newSetFn);

const oldBtns='$(\'btnAuto\').addEventListener(\'click\',()=>setPaletteMode(\'auto\'));\n$(\'btnBead\').addEventListener(\'click\',()=>setPaletteMode(\'bead\'));';
const newBtns='$(\'paletteSelect\').addEventListener(\'change\',()=>setPalette($(\'paletteSelect\').value));';
html=html.replace(oldBtns, newBtns);

if(html.includes('currentPalette=null')){
  html=html.replace('currentPalette=null','currentPalette=BEAD_COLORS');
}

fs.writeFileSync('C:/claudecode/perler-bead.html', html);
console.log('Done. Size:', html.length, 'Has dropdown:', html.includes('paletteSelect'), 'Has setPalette:', html.includes('function setPalette'));
