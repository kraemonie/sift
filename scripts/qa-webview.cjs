'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
(async()=>{
 const port=process.argv[2]||'9237',pages=await (await fetch('http://127.0.0.1:'+port+'/json')).json();
 const page=pages.find(p=>p.url==='https://appassets.androidplatform.net/assets/index.html');if(!page)throw Error('Sift WebView target missing');
 const socket=new WebSocket(page.webSocketDebuggerUrl.replace(/localhost:\d+|127\.0\.0\.1:\d+/,'127.0.0.1:'+port)),pending=new Map();let serial=0;
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=event=>{const msg=JSON.parse(event.data),handler=pending.get(msg.id);if(handler){pending.delete(msg.id);msg.error?handler.reject(Error(JSON.stringify(msg.error))):handler.resolve(msg.result);}};
 function send(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
 async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
 async function until(expression){const end=Date.now()+45000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+expression);}
 function check(value,label){if(!value)throw Error(label);}
 async function capture(name){await new Promise(r=>setTimeout(r,400));const adb=path.join(process.env.LOCALAPPDATA,'Android/Sdk/platform-tools/adb.exe'),device=process.argv[3]||'emulator-5556';execFileSync(adb,['-s',device,'shell','screencap','-p','/sdcard/Download/'+name],{stdio:'ignore'});execFileSync(adb,['-s',device,'pull','/sdcard/Download/'+name,path.join(__dirname,'../docs/'+name)],{stdio:'ignore'});}
 await send('Page.enable');await until("!!document.documentElement&&!!document.getElementById('statePill')");await evaluate("if(document.getElementById('welcomeScreen')&&!document.getElementById('welcomeScreen').hidden)document.getElementById('skipWelcome').click();document.documentElement.style.scrollBehavior='auto'");await until("document.getElementById('statePill').textContent==='Ready'");
 check(await evaluate("document.getElementById('openButton').textContent.trim()==='Select file'&&document.getElementById('openButton').getBoundingClientRect().height>=64"),'Large Select file missing');
 check(await evaluate("Math.abs((document.getElementById('openButton').getBoundingClientRect().left+document.getElementById('openButton').getBoundingClientRect().right)/2-innerWidth/2)<2"),'File picker is not centered');
 check(await evaluate("!!document.querySelector('#helpButton svg')"),'Math vector icon missing');
 check(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),'Image overflow');
 check(await evaluate("document.getElementById('saveMedia').getBoundingClientRect().top>=document.getElementById('imageWorkspace').getBoundingClientRect().bottom-1"),'Image download placement');
  check(await evaluate("!document.querySelector('.compare-control')"),'Old bottom comparison slider remains');
 await evaluate("document.getElementById('imageFrame').scrollIntoView({block:'center',behavior:'auto'})");
 const frame=await evaluate("(function(){const r=document.getElementById('imageFrame').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()");
 const adb=path.join(process.env.LOCALAPPDATA,'Android/Sdk/platform-tools/adb.exe'),device=process.argv[3]||'emulator-5556';
 const input=(...args)=>execFileSync(adb,['-s',device,...args],{encoding:'utf8'});
 input('shell','uiautomator','dump','/sdcard/sift-qa-ui.xml');const tree=input('shell','cat','/sdcard/sift-qa-ui.xml');
 const bounds=tree.match(/class="android.webkit.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);if(!bounds)throw Error('WebView accessibility bounds missing');
 const viewport=await evaluate('({width:innerWidth,height:innerHeight})'),left=Number(bounds[1]),top=Number(bounds[2]),scale=(Number(bounds[3])-left)/viewport.width;
 const y=Math.round(top+(frame.y+frame.height*.5)*scale),startX=Math.round(left+(frame.x+frame.width*.25)*scale),endX=Math.round(left+(frame.x+frame.width*.75)*scale);
 input('shell','input','swipe',String(startX),String(y),String(endX),String(y),'500');
 check(await evaluate("Math.abs(Number(document.getElementById('compareSlider').value)-75)<=2"),'Dragging directly on photo failed');
 await evaluate("document.getElementById('compareSlider').focus({preventScroll:true})");
 const beforeKey=await evaluate("Number(document.getElementById('compareSlider').value)");input('shell','input','keyevent','22');
 await until("Number(document.getElementById('compareSlider').value)>"+beforeKey);
 await evaluate("document.getElementById('compareSlider').value=50;document.getElementById('compareSlider').dispatchEvent(new Event('input'));window.scrollTo(0,0)");await capture('sift-home.png');await evaluate("document.getElementById('imageWorkspace').scrollIntoView({block:'start',behavior:'auto'})");await capture('sift-image.png');
 await evaluate("document.getElementById('audioTab').click()");await until("document.body.dataset.mode==='audio'&&document.getElementById('statePill').textContent==='Ready'&&document.getElementById('previewPanel').dataset.transitioning!=='true'");
 check(await evaluate("document.getElementById('saveMediaLabel').textContent==='Download audio'&&document.getElementById('saveMedia').getBoundingClientRect().top>=document.getElementById('audioWorkspace').getBoundingClientRect().bottom-1"),'Audio download placement');
 check(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),'Audio overflow');check(await evaluate("document.querySelectorAll('.waveform path').length===2&&document.querySelector('#resultWave path').getAttribute('d').length>1000"),'Audio waveforms missing');
 await evaluate("document.getElementById('audioWorkspace').scrollIntoView({block:'start',behavior:'auto'})");await capture('sift-audio.png');await evaluate("document.getElementById('saveMedia').scrollIntoView({block:'center',behavior:'auto'})");await capture('sift-audio-download.png');
 await evaluate("document.getElementById('imageTab').click();document.getElementById('audioTab').click();document.getElementById('imageTab').click()");await until("document.body.dataset.mode==='image'&&document.getElementById('statePill').textContent==='Ready'&&document.getElementById('previewPanel').dataset.transitioning!=='true'");
 const supportsReduced=await evaluate("matchMedia('(prefers-reduced-motion: reduce), (prefers-reduced-motion: no-preference)').matches");if(supportsReduced)await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});else await evaluate("window.siftQaMatchMedia=window.matchMedia;window.matchMedia=function(query){return query.indexOf('prefers-reduced-motion')!==-1?{matches:true}:window.siftQaMatchMedia.call(window,query)}");
 await evaluate("document.getElementById('audioTab').click()");check(await evaluate("document.getElementById('previewPanel').dataset.transitioning!=='true'"),'Reduced motion still animates');
 await until("document.getElementById('statePill').textContent==='Ready'");await evaluate("document.getElementById('imageTab').click()");await until("document.getElementById('statePill').textContent==='Ready'");if(supportsReduced)await send('Emulation.setEmulatedMedia',{features:[]});else await evaluate('window.matchMedia=window.siftQaMatchMedia;delete window.siftQaMatchMedia');await evaluate("document.documentElement.style.scrollBehavior='';window.scrollTo(0,0)");
 const result=await evaluate("({width:innerWidth,mode:document.body.dataset.mode,status:document.getElementById('statePill').textContent,download:document.getElementById('saveMediaLabel').textContent})");fs.writeFileSync(path.join(__dirname,'../docs/device-qa.json'),JSON.stringify({passed:true,device:process.argv[3]||'emulator-5556',checks:['centered 64px file picker','math vector icon','output download placement in both modes','phone overflow','rapid mode switching','reduced motion','direct photo dragging','comparison keyboard arrows'],...result},null,2));console.log(JSON.stringify(result));socket.close();
})().catch(error=>{console.error(error);process.exit(1);});
