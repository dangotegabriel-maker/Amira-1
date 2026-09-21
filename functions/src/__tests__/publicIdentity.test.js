const {createPublicIdentity,identity}=require('../publicIdentity');
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
const docs=new Map();
const snap=path=>({id:path.split('/').at(-1),exists:docs.has(path),data:()=>docs.get(path)});
const db={doc:path=>({get:async()=>snap(path)}),collection:path=>{
 let limit=Infinity;const q={orderBy:()=>q,limit:value=>{limit=value;return q;},get:async()=>({docs:[...docs.keys()].filter(k=>k.startsWith(path+'/')&&k.split('/').length===path.split('/').length+1).sort().slice(0,limit).map(snap)})};return q;
}};
const api=createPublicIdentity({db,HttpsError});
const privateFields={email:'SECRET_EMAIL',phone:'SECRET_PHONE',dob:'1999-01-01',accountId:'123456789',wallet:{creditBalance:987654},earnings:{pending:987654},payoutSetup:{bank:'SECRET_PAYOUT'},verification:{document:'SECRET_VERIFY'},deviceTokens:['SECRET_DEVICE'],settings:{secret:'SECRET_SETTINGS'},lifetimeQualifyingPurchasedCredits:987654,level:10,vip:{tier:'SECRET_VIP'},amiraId:'AMR-ABC123',authProvider:'SECRET_AUTH'};
const p=(uid,host=false)=>({username:uid,profilePic:'https://example.test/photo.jpg',...privateFields,hostStatus:{isApproved:host,availability:'busy',preCallAvailability:'offline'}});
const seedCall=(id='call',path='calls',patch={})=>docs.set(`${path}/${id}`,{callerId:'c',receiverId:'h',participantIds:['c','h'],...patch});
beforeEach(()=>{docs.clear();for(const [uid,host]of [['c',false],['c2',false],['h',true],['h2',true]])docs.set(`users/${uid}`,p(uid,host));});
test('tiny identity has exact keys and contains no private sentinels',()=>{
 const result=identity('c',p('c'));expect(Object.keys(result).sort()).toEqual(['profilePic','uid','username']);expect(JSON.stringify(result)).not.toMatch(/SECRET|987654|123456789|AMR-/);
});
test.each([['c','h',true],['h','c',true],['c','c2',false],['h','h2',false]])('relationship %s to %s reveals only capability',async(a,b,valid)=>expect(await api.relationship(a,{targetUid:b})).toEqual({valid}));
test.each(['left','right'])('bidirectional %s block suppresses message identity and follow',async(side)=>{
 docs.set(side==='left'?'users/c/blocked/h':'users/h/blocked/c',{blockedUid:side==='left'?'h':'c'});
 expect(await api.relationship('c',{targetUid:'h'})).toEqual({valid:false});await expect(api.message('c',{targetUid:'h'})).rejects.toMatchObject({code:'permission-denied'});
});
test('message projection exposes only tiny identity and protected header capability',async()=>{
 const result=await api.message('c',{targetUid:'h'});expect(Object.keys(result).sort()).toEqual(['canInteract','hostStatus','identity']);expect(result.hostStatus).toEqual({isApproved:true});expect(JSON.stringify(result)).not.toMatch(/SECRET|987654|123456789|AMR-/);
});
test('historical conversation survives role change without granting Host actions',async()=>{
 docs.get('users/h').hostStatus.isApproved=false;docs.set('conversations/c__h',{participantIds:['c','h']});expect((await api.message('c',{targetUid:'h'})).canInteract).toBe(false);
 docs.set('conversations/c__h',{participantIds:['c','h2']});await expect(api.message('c',{targetUid:'h'})).rejects.toMatchObject({code:'permission-denied'});
});
test('unknown same-role targets are not a directory',async()=>{await expect(api.message('c',{targetUid:'c2'})).rejects.toMatchObject({code:'permission-denied'});});
test.each(['message','relationship'])('%s rejects demo and missing identities',async(method)=>{
 docs.get('users/h').isDemo=true;await expect(api[method]('c',{targetUid:'h'})).rejects.toMatchObject({code:'not-found'});await expect(api[method]('c',{targetUid:'missing'})).rejects.toMatchObject({code:'not-found'});
});
test('call identities derive the opposite participant, including legacy history',async()=>{
 seedCall();seedCall('legacy','callHistory');const result=await api.calls('c',{callIds:['call','legacy']});expect(result.participants.map(item=>item.identity.uid)).toEqual(['h','h']);expect(JSON.stringify(result)).not.toMatch(/SECRET|987654|123456789|AMR-/);
});
test('live normal incoming Host projection derives current VIP and Level without private totals',async()=>{
 seedCall('call','calls',{status:'ringing'});docs.set('vipMemberships/c',{status:'active',startsAt:new Date(Date.now()-1000),expiresAt:new Date(Date.now()+1000)});
 docs.set('consumerLevels/c',{lifetimeQualifyingPurchasedCredits:250});docs.set('levelConfig/current',{thresholds:Array.from({length:11},(_,level)=>level*100),milestones:{}});
 const result=(await api.calls('h',{callIds:['call']})).participants[0].identity;
 expect(result).toEqual({uid:'c',username:'c',profilePic:'https://example.test/photo.jpg',vipActive:true,level:2});expect(JSON.stringify(result)).not.toMatch(/SECRET|987654|250/);
 docs.get('vipMemberships/c').expiresAt=new Date(Date.now());expect((await api.calls('h',{callIds:['call']})).participants[0].identity.vipActive).toBe(false);
});
test('Quick Match and history identity do not receive normal incoming VIP or Level presentation',async()=>{
 seedCall('quick','calls',{status:'ringing',source:'quick_match'});seedCall('legacy','callHistory',{status:'ended'});docs.set('vipMemberships/c',{status:'active',startsAt:new Date(0),expiresAt:new Date(Date.now()+1000)});docs.set('consumerLevels/c',{lifetimeQualifyingPurchasedCredits:1000});
 for(const item of (await api.calls('h',{callIds:['quick','legacy']})).participants)expect(item.identity).toEqual({uid:'c',username:'c',profilePic:'https://example.test/photo.jpg'});
});
test('call participant authorization cannot be bypassed by an arbitrary UID',async()=>{seedCall();await expect(api.calls('c2',{callIds:['call']})).rejects.toMatchObject({code:'permission-denied'});});
test('malformed call participants fail closed',async()=>{seedCall('bad','calls',{participantIds:['c','h2']});await expect(api.calls('c',{callIds:['bad']})).rejects.toMatchObject({code:'permission-denied'});});
test('blocked historical calls retain only identity and disable new interaction',async()=>{seedCall();docs.set('users/h/blocked/c',{blockedUid:'c'});expect((await api.calls('c',{callIds:['call']})).participants[0].canInteract).toBe(false);});
test('block during ringing suppresses VIP and Level presentation',async()=>{seedCall('call','calls',{status:'ringing'});docs.set('users/h/blocked/c',{blockedUid:'c'});docs.set('vipMemberships/c',{status:'active',startsAt:new Date(0),expiresAt:new Date(Date.now()+1000)});docs.set('consumerLevels/c',{lifetimeQualifyingPurchasedCredits:1000});const item=(await api.calls('h',{callIds:['call']})).participants[0];expect(item.canInteract).toBe(false);expect(item.identity).toEqual({uid:'c',username:'c',profilePic:'https://example.test/photo.jpg'});});
test('call projection never writes accounting or availability',async()=>{seedCall();const before=JSON.stringify([...docs]);await api.calls('c',{callIds:['call']});expect(JSON.stringify([...docs])).toBe(before);});
test('owned blocks alone authorize management identities',async()=>{
 docs.set('users/c/blocked/h',{blockedUid:'h'});docs.set('users/h2/blocked/c',{blockedUid:'c'});const result=await api.blockedProfiles('c');expect(result.people.map(p=>p.uid)).toEqual(['h']);expect(JSON.stringify(result)).not.toMatch(/SECRET|987654|123456789|AMR-/);expect(result.sourceLimit).toBe(50);
});
test('owned blocked projection suppresses demo targets',async()=>{docs.set('users/c/blocked/h',{blockedUid:'h'});docs.get('users/h').isDemo=true;expect((await api.blockedProfiles('c')).people).toEqual([]);});
test.each([[],Array(31).fill('call'),['call','call']].map(callIds=>[callIds]))('invalid call batches rejected %#',async callIds=>{await expect(api.calls('c',{callIds})).rejects.toMatchObject({code:'invalid-argument'});});
test.each(['message','relationship','calls','blockedProfiles'])('%s validates actor and input keys',async method=>{
 await expect(api[method]('',{})).rejects.toMatchObject({code:'unauthenticated'});await expect(api[method]('c',{ownerUid:'h'})).rejects.toMatchObject({code:'invalid-argument'});
});
