const fs=require('fs');
const data=JSON.parse(fs.readFileSync('C:/Users/Administrator/AppData/Local/Temp/2/perler-beads/src/app/colorSystemMapping.json','utf8'));
const colors=[];
for(const [hex, systems] of Object.entries(data)){
  if(systems.MARD){colors.push({name:systems.MARD, hex:hex.toUpperCase()});}
}
colors.sort((a,b)=>a.name.localeCompare(b.name));
function hexToRgb(hex){return[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]}

// Must-have colors
const ESSENTIAL=['T01','H07','H01','H02','A01','R01','C08','B08','D21','E06','F05','G08'];
const essentialColors=colors.filter(c=>ESSENTIAL.includes(c.name));
const remainingColors=colors.filter(c=>!ESSENTIAL.includes(c.name));

function kmeansSubset(colors, k, forcedColors){
  const rgbs=colors.map(c=>hexToRgb(c.hex));
  const availK=k-forcedColors.length;
  if(availK<=0) return forcedColors.slice(0,k);
  const step=Math.max(1,Math.floor(rgbs.length/availK));
  let centers=[];for(let i=0;i<availK;i++) centers.push([...rgbs[Math.min(i*step,rgbs.length-1)]]);
  for(let iter=0;iter<15;iter++){
    const buckets=Array.from({length:availK},()=>[]);
    for(const p of rgbs){let b=0,bd=Infinity;for(let i=0;i<availK;i++){const d=(p[0]-centers[i][0])**2+(p[1]-centers[i][1])**2+(p[2]-centers[i][2])**2;if(d<bd){bd=d;b=i}}buckets[b].push(p)}
    let ch=false;for(let i=0;i<availK;i++){if(!buckets[i].length)continue;const a=[0,0,0];for(const p of buckets[i]){a[0]+=p[0];a[1]+=p[1];a[2]+=p[2]}a[0]=Math.round(a[0]/buckets[i].length);a[1]=Math.round(a[1]/buckets[i].length);a[2]=Math.round(a[2]/buckets[i].length);if(a[0]!==centers[i][0]||a[1]!==centers[i][1]||a[2]!==centers[i][2])ch=true;centers[i]=a}if(!ch)break}
  const subset=[...forcedColors];
  for(const c of centers){let b=0,bd=Infinity;for(let i=0;i<colors.length;i++){const rgb=hexToRgb(colors[i].hex);const d=(c[0]-rgb[0])**2+(c[1]-rgb[1])**2+(c[2]-rgb[2])**2;if(d<bd){bd=d;b=i}}const existing=subset.find(s=>s.name===colors[b].name);if(!existing) subset.push(colors[b])}
  subset.sort((a,b)=>a.name.localeCompare(b.name));
  return subset;
}

for(const k of [96,144,168]){
  const subset=kmeansSubset(remainingColors, k, essentialColors);
  const hasWhite=subset.some(c=>c.hex==='#FFFFFF');
  const hasBlack=subset.some(c=>c.hex==='#000000');
  console.log('MARD_'+k+':', subset.length, 'colors, white:', hasWhite, 'black:', hasBlack);
  const js='const MARD_'+k+'=['+subset.map(c=>'{name:\"'+c.name+'\",hex:\"'+c.hex+'\"}').join(',\n')+'];';
  fs.writeFileSync('C:/claudecode/_mard_'+k+'.js', js);
}
console.log('Done');
