const C=require('./core.cjs');
let model,metadata;
self.onmessage=({data})=>{
 try{
  if(data.type==='analyze'){
   metadata=data.metadata;model=C.factorize(data.planes,data.m,data.n);
   self.postMessage({type:'analyzed',generation:data.generation,rank:model.rank,spectrum:model.spectrum,metadata});
  }else if(data.type==='archive'){
   const decoded=C.unpack(data.buffer);model=decoded.model;metadata=decoded.metadata;
   self.postMessage({type:'analyzed',generation:data.generation,rank:model.rank,spectrum:model.spectrum,metadata,archive:true});
  }else if(data.type==='render'){
   const result=C.reconstruct(model,data.rank),packed=C.pack(model,data.rank,metadata);
   self.postMessage({type:'rendered',generation:data.generation,request:data.request,rank:data.rank,result,packed,metadata},result.planes.map(p=>p.buffer).concat([packed]));
  }
 }catch(error){self.postMessage({type:'error',generation:data.generation,message:error.message});}
};
