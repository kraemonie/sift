(function(){
'use strict';
const C=window.CompressorCore,$=id=>document.getElementById(id);
let mode='image',worker=null,generation=0,request=0,inflight=false,pendingRank=null,desiredRank=16,summary=null,current=null,metadata=null,reference=null,sourceBytes=0,archiveInput=false,renderTimer=null,saveBusy=false;
let loadGeneration=0,originalUpload=null,activeSourceFile=null,workspaceRank=null,restoringRank=null,afterBaselineRank=null;const objectUrls={};
const workspaces={image:{file:null,rank:null,comparison:50},audio:{file:null,rank:null,comparison:50}};
function rememberWorkspace(){workspaces[mode]={file:activeSourceFile,rank:workspaceRank,comparison:Number($('compareSlider').value)};}
function prepareSource(file,state){activeSourceFile=file;workspaceRank=state?state.rank:null;restoringRank=state?state.rank:null;setComparison(state?state.comparison:50);}
function switchWorkspace(next){if(mode===next)return;rememberWorkspace();const state=workspaces[next];activeSourceFile=state.file;workspaceRank=state.rank;setComparison(state.comparison);if(worker)worker.terminate();worker=null;++generation;clearTimeout(renderTimer);summary=null;current=null;setMode(next);busy('Opening');if(state.file)loadFile(state.file,state).catch(e=>message(e.message,true));else if(next==='image')sampleImage(state).catch(e=>message(e.message,true));else sampleAudio(state).catch(e=>message(e.message,true));}
function themeColor(name,fallback){return getComputedStyle(document.body).getPropertyValue(name).trim()||fallback;}
function bytes(n){if(n===null||n===undefined)return '—';return n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB';}
function message(text,error){$('status').textContent=text;$('status').classList.toggle('error',!!error);}
function exportsEnabled(on){$('saveArchive').disabled=!on||saveBusy;$('saveMedia').disabled=!on||saveBusy;$('shareMedia').disabled=!on||saveBusy;}
function urlFor(key,blob){if(objectUrls[key])URL.revokeObjectURL(objectUrls[key]);objectUrls[key]=URL.createObjectURL(blob);return objectUrls[key];}
function setMode(next){
 const changed=mode!==next;mode=next;document.body.dataset.mode=next;['image','audio'].forEach(name=>{$(name+'Tab').classList.toggle('active',name===next);$(name+'Tab').setAttribute('aria-selected',String(name===next));$(name+'Tab').tabIndex=name===next?0:-1;$(name+'Workspace').hidden=name!==next;});
 $('mediaKind').textContent=next==='image'?'PHOTO / DARKROOM':'AUDIO / RECORDING ROOM';$('qualityTitle').textContent=next==='image'?'PSNR':'RMS error';$('saveMediaLabel').textContent=next==='image'?'Download image':'Download audio';$('mediaFormat').textContent=next==='image'?'PNG':'WAV';$('exportNote').textContent=next==='image'?'Download the reconstructed image. Its PNG size may differ from the SVD archive.':'Download the reconstructed audio as WAV. Its size may differ from the SVD archive.';
  $('sourceAudio').pause();$('resultAudio').pause();
 if(changed){const panel=$('previewPanel');if(panel._modeAnimation)panel._modeAnimation.cancel();panel.dataset.transitioning='false';if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&panel.animate){panel.dataset.transitioning='true';const animation=panel.animate([{opacity:.15,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:340,easing:'cubic-bezier(.2,.75,.25,1)'});panel._modeAnimation=animation;animation.onfinish=animation.oncancel=()=>{if(panel._modeAnimation===animation){panel.dataset.transitioning='false';panel._modeAnimation=null;}};}}
}
function busy(text){document.querySelector('.studio-grid').setAttribute('aria-busy','true');document.querySelectorAll('[data-preset]').forEach(b=>b.disabled=true);exportsEnabled(false);$('statePill').textContent=text;$('rankSlider').disabled=true;$('processingText').textContent=text==='Analyzing'?'Finding the building blocks…':text;$('processingOverlay').hidden=false;current=null;message(text+'…');}
function canvasPixels(id,planes,width,height){
 const canvas=$(id);canvas.width=width;canvas.height=height;const context=canvas.getContext('2d'),image=context.createImageData(width,height);
 for(let i=0;i<width*height;i++){for(let c=0;c<3;c++)image.data[i*4+c]=Math.max(0,Math.min(255,Math.round(255*planes[Math.min(c,planes.length-1)][i])));image.data[i*4+3]=255;}context.putImageData(image,0,0);
}
function wave(id,samples){
 const svg=$(id),width=320,height=90;let path='';
 for(let x=0;x<width;x++){const start=Math.floor(x*samples.length/width),end=Math.max(start+1,Math.floor((x+1)*samples.length/width));let lo=0,hi=0;for(let i=start;i<Math.min(samples.length,end);i++){lo=Math.min(lo,samples[i]);hi=Math.max(hi,samples[i]);}path+='M'+x+' '+(height/2-hi*height*.43).toFixed(2)+'V'+(height/2-lo*height*.43).toFixed(2);}
 svg.innerHTML='<path d="'+path+'" fill="none" stroke="'+(id==='sourceWave'?themeColor('--sift-mist','#94B4C1'):themeColor('--sift-cream','#EAE0CF'))+'" stroke-width="0.9"/>';
}
function drawReference(planes){
 if(mode==='image'){canvasPixels('sourceCanvas',planes,metadata.width,metadata.height);$('imageFrame').style.paddingTop=(Math.max(.65,Math.min(1.2,metadata.height/metadata.width))*100)+'%';}
 else{const samples=planes[0].subarray(0,metadata.frames);wave('sourceWave',samples);$('sourceAudio').src=urlFor('source',new Blob([C.wav(samples,metadata.sampleRate)],{type:'audio/wav'}));$('durationLabel').textContent=(metadata.frames/metadata.sampleRate).toFixed(1)+' seconds';}
}
function spectrum(){
 if(!summary)return;const canvas=$('spectrum'),width=Math.max(200,canvas.clientWidth||300),height=100,dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=width*dpr;canvas.height=height*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,height);
 const values=summary.spectrum,max=Math.max(1e-20,...values),count=Math.max(1,values.length),bar=width/count;
 values.forEach((v,i)=>{const h=Math.max(v>0?1:0,Math.sqrt(v/max)*83);ctx.fillStyle=i<desiredRank?themeColor('--sift-neon','#22D3BE'):themeColor('--sift-plot-muted','#7697AE');ctx.fillRect(i*bar,86-h,Math.max(.5,bar*.76),h);});
 ctx.fillStyle=themeColor('--sift-panel-muted','#B9CED4');ctx.font='12px system-ui';ctx.fillText('1',0,99);ctx.textAlign='right';ctx.fillText(String(values.length),width,99);ctx.textAlign='left';
}
function savedRatio(){try{const v=parseFloat(localStorage.getItem('sift.rank.'+mode));return v>0&&v<=1?v:null;}catch(e){return null;}}
function saveRatio(rank){try{if(summary&&summary.rank>0&&!archiveInput&&rank>0)localStorage.setItem('sift.rank.'+mode,String(Math.min(1,rank/summary.rank)));}catch(e){}}
function startingRank(max){const ratio=savedRatio();return ratio?Math.max(1,Math.min(max,Math.round(ratio*max))):Math.min(max,mode==='image'?16:12);}
let rankGlowTimer;
function rankLabel(rank){const slider=$('rankSlider');const min=Number(slider.min),max=Number(slider.max);slider.style.setProperty('--rank-progress',(max>min?(rank-min)/(max-min)*100:0)+'%');const panel=document.querySelector('.control-panel');panel.classList.add('rank-changing');clearTimeout(rankGlowTimer);rankGlowTimer=setTimeout(()=>panel.classList.remove('rank-changing'),450);$('rankValue').textContent=rank;$('rankSlider').value=rank;$('resultLabel').textContent='Rank '+rank;$('audioResultLabel').textContent='Rank '+rank+' reconstruction';spectrum();}
function queueRender(rank){if(archiveInput&&!reference&&summary)rank=summary.rank;
 if(!summary||!worker)return;desiredRank=Math.max(0,Math.min(summary.rank,Math.round(rank)));workspaceRank=afterBaselineRank!==null?afterBaselineRank:desiredRank;rankLabel(desiredRank);exportsEnabled(false);$('statePill').textContent='Updating';pendingRank=desiredRank;
 clearTimeout(renderTimer);renderTimer=setTimeout(sendRender,55);
}
function sendRender(){if(inflight||pendingRank===null||!worker)return;const rank=pendingRank;pendingRank=null;inflight=true;worker.postMessage({type:'render',generation,request:++request,rank});}
function analyzed(data){
 const rankToRestore=restoringRank;restoringRank=null;summary=data;metadata=data.metadata;archiveInput=!!data.archive;if(archiveInput&&rankToRestore!==null&&rankToRestore!==data.rank)afterBaselineRank=rankToRestore;setMode(metadata.kind);$('fileName').textContent=String(metadata.name||'Imported archive').slice(0,100);$('maxRank').textContent=data.rank;$('rankSlider').min=data.rank===0?'0':'1';$('rankSlider').max=data.rank;$('rankSlider').disabled=data.rank===0;
 $('numericalRank').textContent=(archiveInput?'Available rank ':'Numerical rank ')+data.rank;
 $('rankDescription').textContent=archiveInput?'Only the factors in this archive are available; the original source is not embedded.':mode==='image'?'Singular components kept per RGB color channel.':'Singular components kept in the 128-sample block matrix.';
 $('workingInfo').textContent=mode==='image'?(originalUpload?originalUpload.width+' × '+originalUpload.height+' · original photo':metadata.width+' × '+metadata.height+' · RGB working pixels'):metadata.frames+' samples · 16 kHz mono';
 $('transformNote').textContent=archiveInput?'Reference preview is the highest rank stored in this archive. Source-file quality cannot be measured without the original.':mode==='image'&&originalUpload?'Reference stays at original resolution. Rank changes use '+metadata.width+' × '+metadata.height+' working pixels; PNG output uses that working size.':mode==='image'?'Working resolution is limited to 192px on the longest edge. Transparency is composited on white.':'First '+(metadata.frames/16000).toFixed(1)+' seconds, resampled to 16 kHz mono. This is an educational block-SVD codec, not MP3.';
 document.querySelectorAll('[data-preset]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});$('sourceSize').previousElementSibling.textContent=archiveInput?'Opened archive':'Original encoded file';$('sourceSize').textContent=bytes(archiveInput?sourceBytes:metadata.sourceBytes);if(originalUpload&&rankToRestore===null){desiredRank=data.rank;rankLabel(data.rank);$('rankValue').textContent='—';$('resultLabel').textContent='Original';$('archiveSize').textContent='—';$('sizeFill').style.width='0%';$('rawSizeLabel').textContent='Raw —';$('sizeFill').parentNode.parentNode.hidden=true;$('savingLabel').textContent='Choose a rank to create an archive';$('energyValue').textContent='—';$('qualityValue').textContent='—';$('qualityNote').textContent='No rank adjustment applied';$('rankDescription').textContent='Original photo shown. Move the slider or choose a preset to apply a working-matrix rank.';$('processingOverlay').hidden=true;$('statePill').textContent='Ready';document.querySelector('.studio-grid').setAttribute('aria-busy','false');document.querySelectorAll('[data-preset]').forEach(b=>b.disabled=false);exportsEnabled(false);message('Original resolution preserved. Choose a rank to start comparing.');}else queueRender(rankToRestore!==null?rankToRestore:archiveInput?data.rank:startingRank(data.rank));
}
function rendered(data){
 inflight=false;
 if(data.rank!==desiredRank){sendRender();return;}
 current=data;document.querySelector('.studio-grid').setAttribute('aria-busy','false');document.querySelectorAll('[data-preset]').forEach(b=>b.disabled=false);$('processingOverlay').hidden=true;$('statePill').textContent='Ready';$('rankSlider').disabled=summary.rank===0;
 if(archiveInput&&!reference){reference=data.result.planes.map(p=>new Float32Array(p));drawReference(reference);if(afterBaselineRank!==null){const restored=afterBaselineRank;afterBaselineRank=null;queueRender(restored);return;}}
 if(mode==='image'){$('originalResult').hidden=true;$('resultCanvas').hidden=false;canvasPixels('resultCanvas',data.result.planes,metadata.width,metadata.height);}
 else{const samples=data.result.planes[0].subarray(0,metadata.frames);wave('resultWave',samples);$('resultAudio').src=urlFor('result',new Blob([C.wav(samples,16000)],{type:'audio/wav'}));}
 const raw=mode==='image'?metadata.width*metadata.height*3:metadata.frames*2,ratio=data.packed.byteLength/raw;
 $('archiveSize').textContent=bytes(data.packed.byteLength);{const fill=$('sizeFill');fill.parentNode.parentNode.hidden=false;fill.style.width=Math.max(2,Math.min(100,ratio*100)).toFixed(1)+'%';fill.classList.toggle('over',ratio>=1);$('rawSizeLabel').textContent='Raw '+bytes(raw);}$('savingLabel').textContent=ratio<1?((1-ratio)*100).toFixed(0)+'% smaller than raw':((ratio-1)*100).toFixed(0)+'% larger than raw';
 $('energyValue').textContent=(data.result.energy*100).toFixed(1)+'%';
 $('qualityValue').textContent=data.result.mse===null?'—':mode==='audio'?Math.sqrt(data.result.mse).toFixed(4):data.result.psnr===Infinity?'∞ dB':data.result.psnr.toFixed(1)+' dB';
 $('qualityNote').textContent=archiveInput?'Original not included':'Float matrix vs working reference';exportsEnabled(true);message('Rank '+data.rank+' ready. '+(archiveInput?'Archive baseline is not the original source.':'All processing stays on your device.'));sendRender();
}
function newWorker(){afterBaselineRank=null;originalUpload=null;['sourcePhoto','originalResult'].forEach(id=>{$(id).hidden=true;$(id).removeAttribute('src');});$('resultCanvas').hidden=false;if(objectUrls.originalPhoto){URL.revokeObjectURL(objectUrls.originalPhoto);delete objectUrls.originalPhoto;}if(worker)worker.terminate();worker=new Worker('worker.js');const mine=++generation;inflight=false;pendingRank=null;summary=null;current=null;reference=null;
 worker.onmessage=({data})=>{if(data.generation!==mine)return;if(data.type==='analyzed')analyzed(data);else if(data.type==='rendered')rendered(data);else{inflight=false;document.querySelector('.studio-grid').setAttribute('aria-busy','false');$('processingOverlay').hidden=true;$('statePill').textContent='Try another file';message(data.message+'. Try a supported file or the sample.',true);}};
 worker.onerror=()=>{inflight=false;document.querySelector('.studio-grid').setAttribute('aria-busy','false');$('processingOverlay').hidden=true;$('statePill').textContent='Could not process';message('This file could not be processed. Try a smaller file or the sample.',true);};return mine;
}
function analyze(planes,m,n,meta,photo){const id=newWorker();metadata=meta;originalUpload=photo||null;if(photo){const url=urlFor('originalPhoto',photo.file);['sourcePhoto','originalResult'].forEach(id=>{$(id).src=url;$(id).hidden=false;});$('resultCanvas').hidden=true;}reference=planes.map(p=>new Float32Array(p));setMode(meta.kind);drawReference(reference);busy('Analyzing');if(originalUpload)$('processingOverlay').hidden=true;worker.postMessage({type:'analyze',generation:id,planes,m,n,metadata:meta});}
function imagePlanes(canvas){const {width:w,height:h}=canvas,rgba=canvas.getContext('2d').getImageData(0,0,w,h).data,planes=[new Float32Array(w*h),new Float32Array(w*h),new Float32Array(w*h)];for(let i=0;i<w*h;i++)for(let c=0;c<3;c++)planes[c][i]=rgba[i*4+c]/255;return planes;}
function asBlob(canvas,type){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('This device could not export the image.')),type));}
async function sampleImage(state){const load=++loadGeneration;const response=await fetch('samples/cat.png');if(!response.ok)throw Error('Could not open the cat sample');const blob=await response.blob();if(load!==loadGeneration)return;return loadFile(new File([blob],'Cat portrait.png',{type:'image/png'}),state||{rank:null,comparison:50});}
async function sampleAudio(state){const load=++loadGeneration;const response=await fetch('samples/cat-meow.ogg');if(!response.ok)throw Error('Could not open the cat meow sample');const blob=await response.blob();if(load!==loadGeneration)return;return loadFile(new File([blob],'Cat meow.ogg',{type:'audio/ogg'}),state||{rank:null,comparison:50});}
function readBuffer(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read this file'));reader.readAsArrayBuffer(file);});}
async function loadFile(file,state){if(!state)rememberWorkspace();const load=++loadGeneration;
 if(!file)return;if(file.size>20*1024*1024)throw Error('Choose a file smaller than 20 MB');const fileBytes=file.size;message('Opening '+file.name+'. The current preview stays active until it is ready.');
 if(/\.svdc$/i.test(file.name)){const buffer=await readBuffer(file);if(load!==loadGeneration)return;sourceBytes=fileBytes;prepareSource(file,state);const id=newWorker();busy('Opening archive');worker.postMessage({type:'archive',generation:id,buffer},[buffer]);return;}
 if(file.type.startsWith('image/')||/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)){
  const url=URL.createObjectURL(file);try{const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Unsupported or damaged image'));img.src=url;});if(load!==loadGeneration)return;sourceBytes=fileBytes;prepareSource(file,state);const scale=Math.min(1,192/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);analyze(imagePlanes(canvas),canvas.height,canvas.width,{kind:'image',width:canvas.width,height:canvas.height,channels:3,name:file.name,sourceBytes},{file,width:image.naturalWidth||image.width,height:image.naturalHeight||image.height});}finally{URL.revokeObjectURL(url);}return;
 }
 if(file.type.startsWith('audio/')||/\.(wav|mp3|ogg|m4a|flac)$/i.test(file.name)){
  message('Decoding up to eight seconds. The current preview stays active until it is ready.');const AC=window.AudioContext||window.webkitAudioContext,context=new AC();let decoded;
  try{const data=await readBuffer(file);decoded=await new Promise((resolve,reject)=>context.decodeAudioData(data,resolve,()=>reject(Error('Unsupported or damaged audio'))));}finally{context.close();}
  const frames=Math.max(1,Math.min(128000,Math.floor(decoded.duration*16000))),offline=new OfflineAudioContext(1,frames,16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const mono=(await offline.startRendering()).getChannelData(0);if(load!==loadGeneration)return;sourceBytes=fileBytes;prepareSource(file,state);
  const rows=Math.ceil(frames/128),plane=new Float32Array(rows*128);plane.set(mono);analyze([plane],rows,128,{kind:'audio',frames,sampleRate:16000,channels:1,name:file.name,sourceBytes});return;
 }
 throw Error('Choose an image, audio file, or .svdc archive');
}
async function save(blob,name){
 saveBusy=true;exportsEnabled(false);message('Choose where to save '+name+'…');
 if(window.SiftBridge){const reader=new FileReader();reader.onload=()=>window.SiftBridge.saveFile(name,blob.type,String(reader.result).split(',')[1]);reader.onerror=()=>window.onNativeSaveResult(false,'Could not prepare export. Try again.');reader.readAsDataURL(blob);}
 else{const a=document.createElement('a');a.href=urlFor('download',blob);a.download=name;a.click();window.onNativeSaveResult(true,'Downloaded '+name);}
}
window.onNativeSaveResult=(ok,text)=>{saveBusy=false;exportsEnabled(!!current);message(text,!ok);};
$('rankSlider').oninput=event=>{document.querySelectorAll('[data-preset]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});const chosen=Number(event.target.value);saveRatio(chosen);queueRender(chosen);};
function setComparison(value){const split=Math.max(0,Math.min(100,Math.round(value)));$('compareSlider').value=split;$('compareSlider').setAttribute('aria-valuetext',split+'% reference, '+(100-split)+'% output');$('resultCanvas').style.clipPath='inset(0 0 0 '+split+'%)';$('compareLine').style.left=split+'%';}
$('compareSlider').oninput=event=>setComparison(Number(event.target.value));
const comparisonFrame=$('imageFrame');let comparisonPointer=null;
function compareAt(event){const rect=comparisonFrame.getBoundingClientRect();if(rect.width>0)setComparison((event.clientX-rect.left)/rect.width*100);}
comparisonFrame.addEventListener('pointerdown',event=>{if(event.isPrimary===false||event.button!==0)return;comparisonPointer=event.pointerId;comparisonFrame.classList.add('is-comparing');$('compareSlider').focus({preventScroll:true});if(comparisonFrame.setPointerCapture)comparisonFrame.setPointerCapture(event.pointerId);compareAt(event);});
comparisonFrame.addEventListener('pointermove',event=>{if(event.pointerId===comparisonPointer){compareAt(event);}});
function endComparison(event){if(event.pointerId===comparisonPointer){if(event.type==='pointerup')compareAt(event);comparisonPointer=null;comparisonFrame.classList.remove('is-comparing');}}
['pointerup','pointercancel','lostpointercapture'].forEach(name=>comparisonFrame.addEventListener(name,endComparison));setComparison(50);
$('imageTab').onclick=()=>switchWorkspace('image');$('audioTab').onclick=()=>switchWorkspace('audio');
$('sampleButton').onclick=()=>{if(mode==='image')sampleImage().catch(e=>message(e.message,true));else sampleAudio().catch(e=>message(e.message,true));};
$('openButton').onclick=()=>{$('fileInput').value='';$('fileInput').click();};$('fileInput').onchange=event=>loadFile(event.target.files[0]).catch(e=>message(e.message+'. Try a different file.',true));
function closeMath(){ $('mathPanel').hidden=true;document.body.classList.remove('math-open');$('helpButton').setAttribute('aria-expanded','false');$('helpButton').focus(); }
window.closeMath=closeMath;
$('helpButton').onclick=()=>{ $('mathCurrentRank').textContent=workspaceRank===null?'Not applied':workspaceRank+' / '+(summary?summary.rank:'—');$('mathPanel').hidden=false;document.body.classList.add('math-open');$('helpButton').setAttribute('aria-expanded','true');$('closeMath').focus(); };
$('closeMath').onclick=closeMath;
$('mathPanel').onclick=event=>{if(event.target===$('mathPanel'))closeMath();};
$('mathPanel').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeMath();}else if(event.key==='Tab'){const items=$('mathPanel').querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]');const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
$('saveArchive').onclick=()=>{if(current&&!saveBusy)save(new Blob([current.packed],{type:'application/octet-stream'}),'sift-rank-'+current.rank+'.svdc').catch(e=>window.onNativeSaveResult(false,e.message));};
async function mediaBlob(){return mode==='image'?await asBlob($('resultCanvas'),'image/png'):new Blob([C.wav(current.result.planes[0].subarray(0,metadata.frames),16000)],{type:'audio/wav'});}
function canShareFiles(){try{if(window.SiftBridge&&typeof window.SiftBridge.shareFile==='function')return true;return !!(navigator.canShare&&navigator.share&&navigator.canShare({files:[new File([new Blob(['x'])],'x.png',{type:'image/png'})]}));}catch(e){return false;}}
$('shareMedia').hidden=!canShareFiles();
$('shareMedia').onclick=async()=>{if(!current||saveBusy)return;const savedRank=current.rank,image=mode==='image',name='sift-rank-'+savedRank+(image?'.png':'.wav');try{const blob=await mediaBlob();if(window.SiftBridge&&typeof window.SiftBridge.shareFile==='function'){const reader=new FileReader();reader.onload=()=>window.SiftBridge.shareFile(name,blob.type,String(reader.result).split(',')[1]);reader.onerror=()=>message('Could not prepare the file to share.',true);reader.readAsDataURL(blob);message('Opening the share sheet…');}else{await navigator.share({files:[new File([blob],name,{type:blob.type})],title:'Sift rank '+savedRank});message('Shared '+name+'.');}}catch(e){if(e&&e.name==='AbortError')message('Share cancelled. Your work is still here.');else message('Sharing is not available here. Use Download instead.',true);}};
$('saveMedia').onclick=async()=>{if(!current||saveBusy)return;const savedRank=current.rank,savedMode=mode;saveBusy=true;exportsEnabled(false);try{const blob=mode==='image'?await asBlob($('resultCanvas'),'image/png'):new Blob([C.wav(current.result.planes[0].subarray(0,metadata.frames),16000)],{type:'audio/wav'});$('exportNote').textContent=(mode==='image'?'PNG':'WAV')+' export: '+bytes(blob.size)+'. Standard media files store reconstructed data, not SVD factors.';await save(blob,'sift-rank-'+savedRank+(savedMode==='image'?'.png':'.wav'));}catch(e){window.onNativeSaveResult(false,e.message);}};
document.querySelectorAll('[data-preset]').forEach(button=>{button.setAttribute('aria-pressed',String(button.classList.contains('selected')));button.onclick=()=>{if(!summary)return;const ratio={small:.05,balanced:.12,detail:.4,full:1}[button.dataset.preset];document.querySelectorAll('[data-preset]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});const chosen=summary.rank===0?0:Math.max(1,Math.round(summary.rank*ratio));saveRatio(chosen);queueRender(chosen);};});
window.addEventListener('resize',()=>{spectrum();if(mode==='audio'&&reference){wave('sourceWave',reference[0].subarray(0,metadata.frames));if(current)wave('resultWave',current.result.planes[0].subarray(0,metadata.frames));}});
document.querySelector('.brand').onclick=event=>{event.preventDefault();window.scrollTo(0,0);};
document.querySelector('.mode-tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'image':event.key==='End'?'audio':mode==='image'?'audio':'image';$(next+'Tab').focus();$(next+'Tab').click();});
sampleImage().catch(e=>message(e.message,true));
})();
