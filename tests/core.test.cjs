const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.cjs');
test('SVD detects rank-one dependence and reconstructs at full numerical rank',()=>{
 const a=Float32Array.from([1,2,3,2,4,6,3,6,9,4,8,12]);const d=C.factorize([a],4,3);
 assert.equal(d.rank,1);const r=C.reconstruct(d,1);assert.ok(r.mse<1e-10);assert.equal(r.energy,1);
});
test('increasing retained rank reduces error and preserves more energy',()=>{
 const d=C.factorize([Float32Array.from([4,0,0,0,2,0,0,0,1])],3,3);
 const a=C.reconstruct(d,1),b=C.reconstruct(d,2),c=C.reconstruct(d,3);
 assert.ok(a.mse>b.mse&&b.mse>c.mse);assert.ok(a.energy<b.energy&&b.energy<c.energy);
});
test('zero, wide and tall matrices remain finite',()=>{
 for(const [m,n] of [[2,5],[5,2]]){const d=C.factorize([new Float32Array(m*n)],m,n);assert.equal(d.rank,0);assert.equal(C.reconstruct(d,0).energy,1);}
 const a=Float32Array.from([1,0,2,0,3,0]);const d=C.factorize([a],2,3);assert.ok(C.reconstruct(d,d.rank).mse<1e-10);
});
test('factor archives round-trip and the measured size increases with rank',()=>{
 const d=C.factorize([Float32Array.from([1,0,0,0,0.6,0,0,0,0.2])],3,3);
 const one=C.pack(d,1,{kind:'image',width:3,height:3,channels:1});const full=C.pack(d,3,{kind:'image',width:3,height:3,channels:1});
 assert.ok(one.byteLength<full.byteLength);const decoded=C.unpack(full);assert.equal(decoded.metadata.kind,'image');assert.ok(C.reconstruct(decoded.model,3).mse<1e-8);
});
test('rejects invalid ranks, dimensions, nonfinite values and malformed archives',()=>{
 assert.throws(()=>C.factorize([Float32Array.from([NaN])],1,1));
 const d=C.factorize([Float32Array.from([1])],1,1);assert.throws(()=>C.reconstruct(d,2));assert.throws(()=>C.reconstruct(d,-1));
 assert.throws(()=>C.unpack(new Uint8Array([1,2,3]).buffer));
 const packed=C.pack(d,1,{kind:'image',width:1,height:1,channels:1});assert.throws(()=>C.unpack(packed.slice(0,-1)));
});
test('WAV export writes valid PCM16 lengths and clips safely',()=>{
 const wav=C.wav(Float32Array.from([-2,0,2]),16000),v=new DataView(wav);
 assert.equal(v.getUint32(24,true),16000);assert.equal(v.getUint32(40,true),6);assert.equal(wav.byteLength,50);
 assert.equal(v.getInt16(44,true),-32768);assert.equal(v.getInt16(48,true),32767);
});
