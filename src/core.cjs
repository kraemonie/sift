'use strict';
const {Matrix,SingularValueDecomposition}=require('ml-matrix');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function dimensions(m,n,c){if(!Number.isInteger(m)||!Number.isInteger(n)||m<1||n<1||m>2048||n>512||m*n>262144||![1,3].includes(c))throw Error('Unsupported matrix dimensions');}
function factorize(inputs,m,n){
 dimensions(m,n,inputs.length);
 const channels=inputs.map(input=>{
  if(input.length!==m*n||Array.from(input).some(x=>!finite(x)))throw Error('Matrix values must be finite');
  const matrix=Matrix.from1DArray(m,n,input),svd=new SingularValueDecomposition(matrix,{autoTranspose:true});
  const r=Math.min(m,n),s=Float32Array.from(svd.diagonal.slice(0,r)),u=new Float32Array(m*r),v=new Float32Array(n*r);
  for(let i=0;i<m;i++)for(let j=0;j<r;j++)u[i*r+j]=svd.leftSingularVectors.get(i,j);
  for(let i=0;i<n;i++)for(let j=0;j<r;j++)v[i*r+j]=svd.rightSingularVectors.get(i,j);
  return {u,v,s,r,rank:Math.min(svd.rank,r),original:Float32Array.from(input)};
 });
 const rank=Math.max(...channels.map(c=>c.rank)),spectrum=Array.from({length:Math.min(m,n)},(_,j)=>channels.reduce((a,c)=>a+(c.s[j]||0)**2,0));
 return {m,n,channels,rank,spectrum,totalEnergy:spectrum.reduce((a,b)=>a+b,0)};
}
function checkRank(model,k){if(!Number.isInteger(k)||k<0||k>model.rank)throw Error('Rank is outside the available range');}
function reconstruct(model,k){
 checkRank(model,k);let error=0,count=0,kept=0,reference=true;
 const planes=model.channels.map(c=>{
  const out=new Float32Array(model.m*model.n),r=Math.min(k,c.rank,c.r);
  for(let j=0;j<r;j++){
   kept+=c.s[j]*c.s[j];
   for(let i=0;i<model.m;i++){const a=c.u[i*c.r+j]*c.s[j];for(let x=0;x<model.n;x++)out[i*model.n+x]+=a*c.v[x*c.r+j];}
  }
  if(c.original){for(let i=0;i<out.length;i++){error+=(out[i]-c.original[i])**2;count++;}}else reference=false;
  return out;
 });
 const mse=reference?error/Math.max(1,count):null;
 return {planes,mse,psnr:mse===null?null:mse<1e-16?Infinity:10*Math.log10(1/mse),energy:model.totalEnergy===0?1:Math.max(0,Math.min(1,kept/model.totalEnergy))};
}
function pack(model,k,metadata){
 checkRank(model,k);
 const ranks=model.channels.map(c=>Math.min(k,c.rank,c.r));
 const header=Object.assign({},metadata,{version:1,m:model.m,n:model.n,c:model.channels.length,ranks,totalEnergy:model.totalEnergy,sourceRank:model.sourceRank===undefined?model.rank:model.sourceRank});
 const json=new TextEncoder().encode(JSON.stringify(header));if(json.length>8192)throw Error('Archive metadata too large');
 const bytes=12+json.length+ranks.reduce((sum,r)=>sum+r*(4+2*model.m+2*model.n),0),buffer=new ArrayBuffer(bytes),view=new DataView(buffer);
 new Uint8Array(buffer,0,8).set(new TextEncoder().encode('SVDC01\r\n'));view.setUint32(8,json.length,true);new Uint8Array(buffer,12,json.length).set(json);let offset=12+json.length;
 model.channels.forEach((c,ch)=>{for(let j=0;j<ranks[ch];j++){
  view.setFloat32(offset,c.s[j],true);offset+=4;
  for(const [array,length]of [[c.u,model.m],[c.v,model.n]])for(let i=0;i<length;i++){view.setInt16(offset,Math.round(Math.max(-1,Math.min(1,array[i*c.r+j]))*32767),true);offset+=2;}
 }});
 return buffer;
}
function unpack(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<14||buffer.byteLength>4*1024*1024)throw Error('Invalid SVD archive');
 const bytes=new Uint8Array(buffer),view=new DataView(buffer);
 if(new TextDecoder().decode(bytes.subarray(0,8))!=='SVDC01\r\n')throw Error('Not a Sift archive');
 const size=view.getUint32(8,true);if(size>8192||size<2||12+size>bytes.length)throw Error('Invalid archive header');
 let h;try{h=JSON.parse(new TextDecoder().decode(bytes.subarray(12,12+size)));}catch(e){throw Error('Invalid archive metadata');}
 dimensions(h.m,h.n,h.c);
 if(h.version!==1||!['image','audio'].includes(h.kind)||!Array.isArray(h.ranks)||h.ranks.length!==h.c||h.ranks.some(r=>!Number.isInteger(r)||r<0||r>Math.min(h.m,h.n))||!finite(h.totalEnergy)||h.totalEnergy<0)throw Error('Invalid archive metadata');
 if(h.kind==='image'&&(h.width!==h.n||h.height!==h.m||h.m>192||h.n>192))throw Error('Unsupported image archive');
 if(h.kind==='audio'&&(h.c!==1||h.n!==128||!Number.isInteger(h.frames)||h.frames<1||h.frames>h.m*h.n||h.frames>128000||h.sampleRate!==16000))throw Error('Unsupported audio archive');
 const expected=12+size+h.ranks.reduce((a,r)=>a+r*(4+2*h.m+2*h.n),0);if(expected!==buffer.byteLength)throw Error('Truncated or oversized archive');
 let offset=12+size;
 const channels=h.ranks.map(r=>{
  const s=new Float32Array(r),u=new Float32Array(h.m*r),v=new Float32Array(h.n*r);
  for(let j=0;j<r;j++){
   s[j]=view.getFloat32(offset,true);offset+=4;if(!finite(s[j])||s[j]<0||s[j]>1e8)throw Error('Invalid singular value');
   for(const [array,length]of [[u,h.m],[v,h.n]])for(let i=0;i<length;i++){array[i*r+j]=view.getInt16(offset,true)/32767;offset+=2;}
  }
  return {s,u,v,r,rank:r};
 });
 const rank=Math.max(...h.ranks),spectrum=Array.from({length:rank},(_,j)=>channels.reduce((a,c)=>a+(c.s[j]||0)**2,0));
 const retained=spectrum.reduce((a,b)=>a+b,0);if(retained>h.totalEnergy*1.001+1e-8)throw Error('Invalid energy metadata');
 return {metadata:h,model:{m:h.m,n:h.n,channels,rank,spectrum,totalEnergy:h.totalEnergy,sourceRank:Number.isInteger(h.sourceRank)?h.sourceRank:rank}};
}
function wav(samples,sampleRate){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>48000||samples.length>128000||Array.from(samples).some(x=>!finite(x)))throw Error('Invalid audio');
 const out=new ArrayBuffer(44+samples.length*2),v=new DataView(out);const word=(offset,text)=>{for(let i=0;i<text.length;i++)v.setUint8(offset+i,text.charCodeAt(i));};
 word(0,'RIFF');v.setUint32(4,out.byteLength-8,true);word(8,'WAVE');word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);word(36,'data');v.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const a=Math.max(-1,Math.min(1,samples[i]));v.setInt16(44+2*i,Math.round(a*(a<0?32768:32767)),true);}return out;
}
module.exports={factorize,reconstruct,pack,unpack,wav};
