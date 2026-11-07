// Run against a clean emulator install after forwarding its WebView to port 9237.
const assert=require('node:assert/strict');
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9237/json')).json();
 const page=pages.find(p=>p.url.endsWith('/assets/index.html'));
 const ws=new WebSocket(page.webSocketDebuggerUrl),pending=new Map();let id=0;
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
 async function run(expression){const n=++id;const result=new Promise(resolve=>pending.set(n,resolve));ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));const m=await result;if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value;}
 try{
  assert.equal(await run("SiftBridge.needsWelcome()&&!document.getElementById('welcomeScreen').hidden"),true);
  // Web storage must not override an incomplete native welcome.
  await run("localStorage.setItem('sift.welcome.v1','seen')");
  assert.equal(await run('SiftBridge.needsWelcome()'),true);
  await run("document.getElementById('nextWelcome').click();document.getElementById('nextWelcome').click();document.getElementById('nextWelcome').click()");
  assert.equal(await run("!SiftBridge.needsWelcome()&&document.getElementById('welcomeScreen').hidden"),true);
  await run("document.getElementById('aboutButton').click();document.getElementById('replayIntro').click()");
  assert.equal(await run("!document.getElementById('welcomeScreen').hidden"),true);
  await run("document.getElementById('skipWelcome').click();document.getElementById('aboutButton').click()");
  assert.equal(await run("document.getElementById('updateApp').textContent"),'Get latest update');
  await run("document.getElementById('updateApp').click()");
  console.log('PASS: native first-launch state, completion, replay and update action');
 }finally{ws.close();}
})().catch(e=>{console.error(e);process.exit(1);});
