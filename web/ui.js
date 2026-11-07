(function(){
'use strict';
const $=id=>document.getElementById(id);
function store(key,value){try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,value);}catch(e){}return null;}

/* Appearance: Auto follows the phone, Light and Dark are set from About. */
const root=document.documentElement,query=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
function systemDark(){try{if(window.SiftBridge&&typeof window.SiftBridge.systemDark==='function')return !!window.SiftBridge.systemDark();}catch(e){}return !!(query&&query.matches);}
function preference(){const v=store('sift.theme');return v==='light'||v==='dark'?v:'auto';}
function applyTheme(){
 const pref=preference(),dark=pref==='dark'||(pref==='auto'&&systemDark());
 root.dataset.theme=dark?'dark':'light';
 document.querySelectorAll('[data-theme-pref]').forEach(button=>{const on=button.dataset.themePref===pref;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',String(on));});
 window.dispatchEvent(new Event('resize'));
}
document.querySelectorAll('[data-theme-pref]').forEach(button=>{button.onclick=()=>{store('sift.theme',button.dataset.themePref);applyTheme();};});
if(query){if(query.addEventListener)query.addEventListener('change',applyTheme);else if(query.addListener)query.addListener(applyTheme);}
applyTheme();

/* Busy feedback: a moving bar, and the reason the controls are locked. */
const pill=$('statePill'),slider=$('rankSlider'),bar=$('workBar'),hint=$('busyHint'),reset=$('resetRank'),firstPreset=document.querySelector('.presets button');
let startedAt=0,timer=null;
function sync(){
 const text=pill.textContent,working=/^(Analyzing|Updating|Opening)/.test(text),locked=working&&slider.disabled;
 bar.hidden=!working;
 if(working&&!startedAt){startedAt=Date.now();timer=setInterval(sync,1000);}
 if(!working&&startedAt){startedAt=0;clearInterval(timer);timer=null;}
 const seconds=startedAt?Math.floor((Date.now()-startedAt)/1000):0;
 hint.hidden=!locked;
 if(locked)hint.textContent=(text==='Analyzing'?'Analyzing your file':'Opening your file')+' — controls unlock when it’s ready.'+(seconds>=3?' Still working… '+seconds+'s. Bigger files take longer.':'');
 reset.disabled=!!(firstPreset&&firstPreset.disabled);
}
const observer=new MutationObserver(sync);
observer.observe(pill,{childList:true,characterData:true,subtree:true});
observer.observe(slider,{attributes:true,attributeFilter:['disabled']});
if(firstPreset)observer.observe(firstPreset,{attributes:true,attributeFilter:['disabled']});
sync();

/* Reset applies the Balanced preset. */
reset.onclick=()=>{const balanced=document.querySelector('[data-preset="balanced"]');if(balanced&&!balanced.disabled)balanced.click();};
})();
