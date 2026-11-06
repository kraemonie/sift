'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
(async()=>{
 const port=process.argv[2]||'9237',pages=await (await fetch('http://127.0.0.1:'+port+'/json')).json();
 const page=pages.find(p=>p.url==='https://appassets.androidplatform.net/assets/index.html');if(!page)throw Error('Sift WebView target missing');
 const socket=new WebSocket(page.webSocketDebuggerUrl.replace(/localhost:\d+|127\.0\.0\.1:\d+/,'127.0.0.1:'+port)),pending=new Map();let serial=0;
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=event=>{const msg=JSON.parse(event.data),handler=pending.get(msg.id);if(handler){pending.delete(msg.id);msg.error?handler.reject(Error(JSON.stringify(msg.error))):handler.resolve(msg.result);}};
 socket.onclose=()=>{for(const h of pending.values())h.reject(Error('WebView disconnected'));pending.clear();};
 function send(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
 async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
 async function until(expression){const end=Date.now()+45000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+expression);}
 function check(value,label){if(!value)throw Error(label);}
 async function capture(name){await new Promise(r=>setTimeout(r,400));const adb=path.join(process.env.LOCALAPPDATA,'Android/Sdk/platform-tools/adb.exe'),device=process.argv[3]||'emulator-5556';execFileSync(adb,['-s',device,'shell','screencap','-p','/sdcard/Download/'+name],{stdio:'ignore'});execFileSync(adb,['-s',device,'pull','/sdcard/Download/'+name,path.join(__dirname,'../docs/'+name)],{stdio:'ignore'});}
await evaluate("localStorage.removeItem('sift.welcome.v1')");await send('Page.reload');await until("!!document.getElementById('welcomeScreen')&&!document.getElementById('welcomeScreen').hidden");console.log('Fresh page shows welcome');socket.close();})().catch(e=>{console.error(e);process.exit(1)});