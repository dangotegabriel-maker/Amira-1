// Real local Storage rules runtime with injected cross-service lookup failures.
// Requires firebase-tools and its cached Storage emulator; no cloud access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cliRoot = process.env.FIREBASE_TOOLS_ROOT || path.dirname(require.resolve('firebase-tools/package.json', {paths:[process.cwd(), path.dirname(process.execPath)]}));
const {StorageRulesRuntime} = require(path.join(cliRoot, 'lib/emulator/storage/rules/runtime'));
const {EmulatorRegistry} = require(path.join(cliRoot, 'lib/emulator/registry'));
const runtime = new StorageRulesRuntime();
const originalClient = EmulatorRegistry.client;
const records = {
 'users/owner': {role:{stringValue:'consumer'},hostStatus:{mapValue:{fields:{isApproved:{booleanValue:false}}}}},
 'hostApplications/owner': {ownerUid:{stringValue:'owner'},status:{stringValue:'in_progress'}},
};
let fault = null, reached = false, checks = 0;
EmulatorRegistry.client = () => ({get: async pathname => {
 const key = Object.keys(records).find(key => pathname.endsWith('/'+key));
 assert.ok(key, pathname);
 if (fault && key === fault.key) { reached = true; throw Object.assign(new Error(fault.code), {code:fault.code}); }
 return {body:{name:pathname,fields:records[key]}};
}});
async function main() {
 await runtime.start(false);
 const filename = path.resolve(__dirname, '../../../storage.rules');
 const {ruleset} = await runtime.loadRuleset({files:[{name:filename,content:fs.readFileSync(filename,'utf8')}]});
 assert.ok(ruleset, 'Storage rules compile');
 const token = [Buffer.from(JSON.stringify({alg:'none'})).toString('base64url'),Buffer.from(JSON.stringify({sub:'owner',user_id:'owner',admin:false})).toString('base64url'),''].join('.');
 const metadata = {name:'users/owner/verification/1/capture.jpg',size:3,contentType:'image/jpeg',metadata:{}};
 for (const method of ['create','update','delete']) {
  const opts = {projectId:'demo-storage-lookup-failure',path:'/b/demo-storage-lookup-failure.appspot.com/o/'+metadata.name,method,token,file:{before:method==='create'?null:metadata,after:method==='delete'?null:metadata}};
  fault = null;
  assert.equal((await ruleset.verify(opts)).permitted,true,`${method} positive control`); checks++;
  for (const key of Object.keys(records)) for (const code of ['PERMISSION_DENIED','UNAVAILABLE']) {
   fault = {key,code}; reached = false;
   assert.notEqual((await ruleset.verify(opts)).permitted,true,`${method}: ${key} ${code}`);
   assert.equal(reached,true,'faulted lookup was evaluated'); checks++;
  }
 }
 console.log(`Storage lookup failure rules: ${checks} checks passed (3 positive controls, 12 injected lookup denials).`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{EmulatorRegistry.client=originalClient;await runtime.stop();});
