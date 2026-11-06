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
 await send('Page.enable');await until("!!document.getElementById('closeMath')");
 await evaluate("window.scrollTo(0,0);window.siftBefore=document.querySelector('.workspace-toolbar').getBoundingClientRect().top;document.getElementById('helpButton').click()");
 check(await evaluate("!document.getElementById('mathPanel').hidden&&getComputedStyle(document.getElementById('mathPanel')).position==='fixed'&&Math.abs(window.siftBefore-document.querySelector('.workspace-toolbar').getBoundingClientRect().top)<1&&document.activeElement.id==='closeMath'"),'Popup shifts layout or lacks focus');
 await capture('sift-math-popup.png');
 await evaluate("document.getElementById('closeMath').click()");check(await evaluate("document.getElementById('mathPanel').hidden&&!document.body.classList.contains('math-open')&&document.activeElement.id==='helpButton'"),'Close did not restore home');
 await evaluate("document.getElementById('helpButton').click();document.getElementById('mathPanel').click()");check(await evaluate("document.getElementById('mathPanel').hidden"),'Backdrop close failed');
 await evaluate("document.getElementById('helpButton').click();document.getElementById('mathPanel').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");check(await evaluate("document.getElementById('mathPanel').hidden"),'Escape close failed');
 await evaluate("document.getElementById('helpButton').click()");
 const adb=path.join(process.env.LOCALAPPDATA,'Android/Sdk/platform-tools/adb.exe'),device=process.argv[3];execFileSync(adb,['-s',device,'shell','input','keyevent','4']);await until("document.getElementById('mathPanel').hidden&&!document.body.classList.contains('math-open')");
 check(await evaluate("['.mini-photo','.mini-record','.brand-icon'].every(s=>getComputedStyle(document.querySelector(s)).animationName!=='none')"),'Floating animations missing');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});check(await evaluate("['.mini-photo','.mini-record','.brand-icon'].every(s=>getComputedStyle(document.querySelector(s)).animationName==='none')"),'Reduced motion failed');await send('Emulation.setEmulatedMedia',{features:[]});
 check(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),'Horizontal overflow');
 fs.writeFileSync(path.join(__dirname,'../docs/math-motion-qa.json'),JSON.stringify({passed:true,checks:['overlay without layout shift','initial focus','close and focus return','backdrop','Escape','Android Back','gentle animations','reduced motion','no horizontal overflow']},null,2));console.log('Popup and motion checks passed');socket.close();
})().catch(error=>{console.error(error);process.exit(1);});
