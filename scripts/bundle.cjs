const esbuild=require('esbuild');
const fs=require('node:fs');
fs.mkdirSync('web/vendor',{recursive:true});
esbuild.buildSync({entryPoints:['src/worker.cjs'],bundle:true,platform:'browser',format:'iife',target:['chrome69'],outfile:'web/worker.js',minify:true,legalComments:'eof'});
esbuild.buildSync({entryPoints:['src/core.cjs'],bundle:true,platform:'browser',format:'iife',globalName:'CompressorCore',target:['chrome69'],outfile:'web/vendor/core.js',minify:true,legalComments:'eof'});
fs.copyFileSync('node_modules/ml-matrix/LICENSE','web/vendor/ml-matrix-LICENSE.txt');
console.log('Bundled independent, offline Compressor math worker.');
