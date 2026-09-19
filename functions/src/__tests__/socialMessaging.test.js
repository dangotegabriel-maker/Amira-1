const { createSocialMessaging } = require('../socialMessaging');
const M = require('../messageEntitlements');
const { createConsumerRewards } = require('../consumerRewards');
const docs = new Map();
// Preserve timestamp Dates in Jest's realm, including while its clock is mocked.
const clone = (v) => Object.prototype.toString.call(v) === '[object Date]' ? new Date(v.getTime()) : Array.isArray(v) ? v.map(clone) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([key,value]) => [key,clone(value)])) : v;
const snap = (path) => ({ exists: docs.has(path), data: () => clone(docs.get(path)), id: path.split('/').at(-1) });
const ref = (path) => ({ path, get: async () => snap(path) });
let queue;
const db = { doc: ref, collection: (path) => {
  const q = { orderBy: () => q, limit: () => q, get: async () => ({ docs: [...docs.keys()].filter((k) => k.startsWith(path + '/') && k.split('/').length === path.split('/').length + 1).map(snap) }) };
  return q;
}, runTransaction: (callback) => {
  const work = queue.then(async () => {
    const writes = [];
    const tx = { get: async (r) => { if (writes.length) throw Error('read after write'); return snap(r.path); } };
    for (const op of ['set', 'create', 'update']) tx[op] = (r, value, options) => writes.push([op, r.path, value, options]);
    const result = await callback(tx);
    const next = new Map([...docs].map(([k,v]) => [k, clone(v)]));
    for (const [op,path,value,options] of writes) {
      if (op === 'create' && next.has(path)) throw Error('duplicate');
      const data = options?.merge || op === 'update' ? next.get(path) || {} : {};
      for (const [key,v] of Object.entries(value)) {
        const parts = key.split('.'); let target = data;
        for (const part of parts.slice(0,-1)) target = target[part] ||= {};
        target[parts.at(-1)] = clone(v);
      }
      next.set(path,data);
    }
    docs.clear(); for (const [k,v] of next) docs.set(k,v);
    return result;
  }); queue = work.catch(() => {}); return work;
}};
const FieldValue = { serverTimestamp: () => new Date(Date.now()) };
class HttpsError extends Error { constructor(code,message,details) { super(message); this.code=code; this.details=details; } }
const api = createSocialMessaging({ db, FieldValue, HttpsError });
const rewards = createConsumerRewards({ db, FieldValue, HttpsError });
const consumer = { role: 'consumer', isProfileComplete: true, vip: { status: 'inactive', tier: 'FREE' },wallet:{creditBalance:100} };
const host = { role: 'host', isProfileComplete: true, hostStatus: { isApproved: true } };
const balance = (uid='c') => docs.get(`consumerRewards/${uid}`)?.freeMessages;
const matching = (part) => [...docs.keys()].filter(k => k.includes(part));
const send = (uid='c', messageId='one', text='Hello') => api.sendText(uid,{ receiverId: uid==='h'?'c':'h', messageId, text });
const follow = () => docs.set('users/c/following/h', { consumerId:'c',hostId:'h' });
const mutual = () => { follow(); docs.set('users/h/following/c',{ sourceId:'h',targetId:'c',sourceRole:'host',targetRole:'consumer' }); };
beforeEach(() => {
 jest.useFakeTimers().setSystemTime(new Date('2026-09-11T12:00:00Z')); docs.clear(); queue=Promise.resolve();
 docs.set('users/c',clone(consumer)); docs.set('users/h',clone(host)); docs.set('users/h2',clone(host)); docs.set('users/c2',clone(consumer));
 docs.set('consumerRewards/c',{freeMessages:3,freeVideoSeconds:10});
});
afterEach(() => jest.useRealTimers());
test.each([['c','h'],['h','c']])('profile view %s to %s uses existing records',async(a,b)=>{
 expect(await api.trackProfileView(a,b)).toEqual({counted:true});
 expect(docs.get(`users/${b}/profileViews/${a}`).viewCount).toBe(1);
 expect((await api.listProfileViews(b)).count).toBe(1);
});
test('Host identities are visible only to their owner; Consumer view identities remain deferred even with VIP flags',async()=>{
 await api.trackProfileView('c','h'); await api.trackProfileView('h','c');
 expect((await api.listProfileViews('h')).views[0].viewerUid).toBe('c');
 expect((await api.listProfileViews('c')).views).toEqual([]);
 docs.get('users/c').vip={status:'active',tier:'VIP_1',expiresAt:Date.now()+1000};
 expect((await api.listProfileViews('c')).views).toEqual([]);
 expect((await api.listProfileViews('c')).reveal).toBe(false);
 jest.advanceTimersByTime(1001); expect((await api.listProfileViews('c')).views).toEqual([]);
});
test('self view ignored and incomplete target not recorded',async()=>{
 expect(await api.trackProfileView('c','c')).toEqual({counted:false});
 docs.get('users/h').isProfileComplete=false;
 expect(await api.trackProfileView('c','h')).toEqual({counted:false}); expect(matching('/profileViews/')).toHaveLength(0);
});
test('30 minute dedupe, concurrent retries and later repeat keep one visible row',async()=>{
 await Promise.all([api.trackProfileView('c','h'),api.trackProfileView('c','h')]);
 jest.advanceTimersByTime(1799999); expect((await api.trackProfileView('c','h')).counted).toBe(false);
 jest.advanceTimersByTime(1); expect((await api.trackProfileView('c','h')).counted).toBe(true);
 expect(docs.get('users/h/profileViews/c').viewCount).toBe(2); expect((await api.listProfileViews('h')).count).toBe(1);
});
test.each(['users/c/blocked/h','users/h/blocked/c'])('blocks reject views and filter old entries: %s',async(path)=>{
 await api.trackProfileView('c','h'); docs.set(path,{});
 await expect(api.trackProfileView('c','h')).rejects.toMatchObject({code:'permission-denied'});
 expect((await api.listProfileViews('h')).count).toBe(0);
});
test('one-way follow is not friends; reciprocal creates event and consumer grant only',async()=>{
 follow(); expect((await api.syncFriendship('c','h')).friends).toBe(false);
 mutual(); expect(await api.syncFriendship('h','c')).toEqual({friends:true,created:true});
 expect(balance()).toBe(8); expect(balance('h')).toBeUndefined();
 expect(matching('/messages/')).toHaveLength(1);
 expect(docs.get(matching('/messages/')[0])).toMatchObject({type:'friendship_created',senderId:null});
 expect(docs.get(matching('/messageTransactions/')[0])).toMatchObject({source:'friendship',delta:5});
});
test('concurrent friendship retries, unfollow/refollow never regrant or recreate history',async()=>{
 mutual(); await Promise.all([api.syncFriendship('c','h'),api.syncFriendship('h','c')]);
 docs.delete('users/h/following/c'); expect((await api.syncFriendship('c','h')).friends).toBe(false);
 mutual(); await api.syncFriendship('c','h'); expect(balance()).toBe(8); expect(matching('/messages/')).toHaveLength(1);
});
test('blocked or forged unsupported mutual relationship cannot create friendship',async()=>{
 mutual(); docs.set('users/c/blocked/h',{});
 await expect(api.syncFriendship('c','h')).rejects.toMatchObject({code:'permission-denied'});
 docs.delete('users/c/blocked/h'); docs.set('users/h',clone(consumer));
 expect((await api.syncFriendship('c','h')).friends).toBe(false); expect(balance()).toBe(3);
});
test('friendship preserves existing canonical conversation and read markers',async()=>{
 await send(); const before=docs.get('conversations/c__h'); mutual(); await api.syncFriendship('c','h');
 expect(matching('/messages/')).toHaveLength(2); expect(docs.get('conversations/c__h').lastReadAt).toEqual(before.lastReadAt);
});
test.each([3,1])('consumer balance %i is consumed atomically and receipt schema preserved',async(n)=>{
 docs.get('consumerRewards/c').freeMessages=n; const result=await send(); expect(balance()).toBe(n-1);
 expect(docs.get(`conversations/c__h/messages/${result.messageId}`)).toMatchObject({senderId:'c',receiverId:'h',type:'text',status:'sent'});
  expect(docs.get('conversations/c__h')).toMatchObject({unreadCounts:{c:0,h:1},lastReadAt:{c:new Date(Date.now()),h:null}});
 expect(docs.get(matching('/messageTransactions/')[0])).toMatchObject({delta:-1,source:'chat_window',resultingBalance:n-1});
});
test('zero entitlement has typed failure and no conversation artifacts',async()=>{
 docs.get('consumerRewards/c').freeMessages=0;
 await expect(send()).rejects.toMatchObject({details:{reason:'paid_messaging_unavailable'}});
 expect(matching('conversations/')).toHaveLength(0); expect(balance()).toBe(0);
});
test('duplicate retry at zero costs once; changed payload with same ID rejected',async()=>{
 docs.get('consumerRewards/c').freeMessages=1; await Promise.all([send(),send()]);
 expect(balance()).toBe(0); expect(matching('/messages/')).toHaveLength(1);
 await expect(send('c','one','Changed')).rejects.toMatchObject({code:'already-exists'});
});
test('distinct sends preserve conversation and recipient read marker',async()=>{
 await send(); docs.get('conversations/c__h').lastReadAt.h=123;
 await send('c','two'); expect(balance()).toBe(2);
 expect(docs.get('conversations/c__h')).toMatchObject({unreadCounts:{h:2},lastReadAt:{h:123}});
});
test.each(['users/c/blocked/h','users/h/blocked/c'])('blocked send consumes nothing: %s',async(path)=>{
 docs.set(path,{}); await expect(send()).rejects.toMatchObject({code:'permission-denied'});
 expect(balance()).toBe(3); expect(matching('/messages/')).toHaveLength(0);
});
test('invalid text, forged system type and missing recipient consume nothing',async()=>{
 await expect(send('c','one','  ')).rejects.toMatchObject({code:'invalid-argument'});
 await expect(api.sendText('c',{receiverId:'h',messageId:'x',text:'fake',type:'friendship_created'})).rejects.toMatchObject({code:'invalid-argument'});
 docs.delete('users/h'); await expect(send()).rejects.toMatchObject({code:'not-found'}); expect(balance()).toBe(3);
});
test('approved host needs no pass; old pending host role remains subject to consumer passes',async()=>{
 await send('h'); expect(balance()).toBe(3); expect(balance('h')).toBeUndefined(); expect(matching('/messageTransactions/')).toHaveLength(0);
 docs.get('users/h').hostStatus.isApproved=false;
 await expect(send('h','two')).rejects.toMatchObject({code:'permission-denied'});
});
test('no VIP unlimited default; trusted policy may authorize it without client changes',()=>{
 const vip={...consumer,vip:{status:'active',tier:'VIP_3'}};
 expect(M.resolveMessagingEntitlement(vip,{freeMessages:0}).allowed).toBe(false);
 expect(M.resolveMessagingEntitlement(vip,{freeMessages:0},M.messagePolicy({unlimitedMessagingVipTiers:['VIP_3']}))).toMatchObject({allowed:true,consume:0});
});
test('Daily Check-In awards 3 with an auditable once-only source and usable send',async()=>{
 docs.get('consumerRewards/c').freeMessages=0; await rewards.claim('c'); await rewards.claim('c'); expect(balance()).toBe(3);
 expect(docs.get(matching('/messageTransactions/')[0])).toMatchObject({source:'daily_check_in',delta:3});
 await send(); expect(balance()).toBe(2);
});
test('generic grant supports both consumers, all future sources, and idempotency',async()=>{
 for (const uid of ['c','c2']) await db.runTransaction(async(tx)=>{
  const grant=await M.prepareMessageGrant({tx,db,FieldValue,uid,amount:5,source:'signup',sourceId:uid,policyVersion:'test'}); grant();
 });
 await db.runTransaction(async(tx)=>(await M.prepareMessageGrant({tx,db,FieldValue,uid:'c',amount:5,source:'signup',sourceId:'c',policyVersion:'test'}))());
 expect(balance()).toBe(8); expect(balance('c2')).toBe(5); expect(M.messagePolicy().enableSignupMessages).toBe(false);
 expect([...M.GRANT_SOURCES]).toEqual(expect.arrayContaining(['task_reward','credit_purchase_bonus','vip','promotion','admin_adjustment']));
});


test('Chat Pass opens 24 hours; concurrent and later texts share one pass, another person costs one', async () => {
  await Promise.all([send('c','first'), send('c','second')]);
  expect(balance()).toBe(2);
  const window = docs.get('consumerRewards/c/chatWindows/c__h');
  expect(M.millis(window.expiresAt) - M.millis(window.openedAt)).toBe(M.CHAT_WINDOW_MS);
  await send('c','third'); expect(balance()).toBe(2);
  await api.sendText('c',{receiverId:'h2',messageId:'other',text:'Hi'}); expect(balance()).toBe(1);
  jest.advanceTimersByTime(M.CHAT_WINDOW_MS);
  await send('c','expired'); expect(balance()).toBe(0);
  jest.advanceTimersByTime(M.CHAT_WINDOW_MS);
  await expect(send('c','expired-zero')).rejects.toMatchObject({details:{reason:'paid_messaging_unavailable'}});
});
test('Host initiation is free and grants no Consumer reply access',async()=>{docs.get('consumerRewards/c').freeMessages=0;await send('h');expect(matching('/chatWindows/')).toHaveLength(0);await expect(send('c','reply')).rejects.toMatchObject({details:{reason:'paid_messaging_unavailable'}});});
test('paid config is authoritative, debits generic provenance once and opens exact 24h access',async()=>{
 docs.get('consumerRewards/c').freeMessages=0;docs.set('economyConfig/current',{paidMessaging:{enabled:true,priceCredits:7,version:'test-v1'}});
 const beforeLevel=clone(docs.get('consumerLevels/c'));const result=await api.sendText('c',{receiverId:'h',messageId:'paid',text:'Hello',priceCredits:1});
 expect(result).toMatchObject({chargedCredits:7,accessSource:'paid'});expect(docs.get('users/c').wallet.creditBalance).toBe(93);
 expect(docs.get('creditWallets/c')).toMatchObject({legacyCredits:100,unallocatedSpentCredits:7,totalBalance:93});expect(docs.get('consumerLevels/c')).toEqual(beforeLevel);
 const window=docs.get('consumerRewards/c/chatWindows/c__h');expect(M.millis(window.expiresAt)-M.millis(window.openedAt)).toBe(M.CHAT_WINDOW_MS);
 expect(matching('message_unlock_')).toHaveLength(1);expect(matching('/unlocks/')).toHaveLength(1);
 await api.sendText('c',{receiverId:'h',messageId:'paid-two',text:'Again'});expect(docs.get('users/c').wallet.creditBalance).toBe(93);
});
test('paid retry and simultaneous first sends charge once',async()=>{
 docs.get('consumerRewards/c').freeMessages=0;docs.set('economyConfig/current',{paidMessaging:{enabled:true,priceCredits:5}});
 await Promise.all([send('c','race','One'),send('c','race','One')]);expect(docs.get('users/c').wallet.creditBalance).toBe(95);
 expect(matching('message_unlock_')).toHaveLength(1);expect(matching('/unlocks/')).toHaveLength(1);expect(matching('/messages/')).toHaveLength(1);
});
test('insufficient paid send creates no message, access or debit',async()=>{
 docs.get('consumerRewards/c').freeMessages=0;docs.get('users/c').wallet.creditBalance=4;docs.set('economyConfig/current',{paidMessaging:{enabled:true,priceCredits:5}});
 await expect(send()).rejects.toMatchObject({details:{reason:'insufficient_credits',requiredCredits:5}});expect(matching('/messages/')).toHaveLength(0);expect(matching('/unlocks/')).toHaveLength(0);expect(docs.get('users/c').wallet.creditBalance).toBe(4);
});
test('timely genuine Host text prevents refund; Consumer and system events do not qualify',async()=>{
 docs.get('consumerRewards/c').freeMessages=0;docs.set('economyConfig/current',{paidMessaging:{enabled:true,priceCredits:5}});await send();
 await send('c','consumer-two','Still me');jest.advanceTimersByTime(M.NO_REPLY_MS-1);await send('h','host-reply','Reply');jest.advanceTimersByTime(2);
 expect(await api.reconcileNoReply('c','h')).toMatchObject({refunded:false,status:'replied'});expect(docs.get('users/c').wallet.creditBalance).toBe(95);
});
test('late/no reply refund is exact, idempotent, linked and keeps access active',async()=>{
 docs.get('consumerRewards/c').freeMessages=0;docs.set('economyConfig/current',{paidMessaging:{enabled:true,priceCredits:6}});await send();const window=clone(docs.get('consumerRewards/c/chatWindows/c__h'));
 jest.advanceTimersByTime(M.NO_REPLY_MS);expect(await api.reconcileNoReply('c','h')).toMatchObject({refunded:true,idempotent:false});expect(await api.reconcileNoReply('c','h')).toMatchObject({refunded:true});
 expect(docs.get('users/c').wallet.creditBalance).toBe(100);expect(docs.get('creditWallets/c').unallocatedSpentCredits).toBe(0);expect(M.millis(window.expiresAt)).toBeGreaterThan(Date.now());
 expect(matching('message_refund_')).toHaveLength(1);const unlock=docs.get(matching('/unlocks/')[0]);expect(unlock).toMatchObject({status:'refunded',chargeCredits:6});
 await send('h','late','Too late');expect(docs.get(matching('/unlocks/')[0]).status).toBe('refunded');
});
test('live mutual follows make texts free; ending friendship restores pass rules without clawback', async () => {
  mutual(); await api.syncFriendship('c','h'); expect(balance()).toBe(8);
  await send(); await send('c','two'); expect(balance()).toBe(8);
  expect(matching('/chatWindows/')).toHaveLength(0);
  docs.delete('users/h/following/c'); await send('c','three'); expect(balance()).toBe(7);
  mutual(); await api.syncFriendship('c','h'); expect(balance()).toBe(7);
});
test('existing window is not extended by texts, and blocks still reject', async () => {
  await send(); const expiry = M.millis(docs.get('consumerRewards/c/chatWindows/c__h').expiresAt);
  jest.advanceTimersByTime(10000); await send('c','two');
  expect(M.millis(docs.get('consumerRewards/c/chatWindows/c__h').expiresAt)).toBe(expiry);
  docs.set('users/h/blocked/c',{}); await expect(send('c','blocked')).rejects.toMatchObject({code:'permission-denied'});
  expect(balance()).toBe(2);
});
test('access query never consumes a pass and uses server time', async () => {
  const access = await api.getChatAccess('c','h'); expect(access.balance).toBe(3);
  expect(access.serverNowMs).toBe(Date.now()); expect(balance()).toBe(3);
  expect(matching('/chatWindows/')).toHaveLength(0);
});
test('friendship system message preserves unread counts', async () => {
  mutual(); await api.syncFriendship('c','h');
  expect(docs.get('conversations/c__h').unreadCounts).toEqual({c:0,h:0});
});

const reviews = require('../callReviews').createCallReviews({db,FieldValue,HttpsError});
const completedCall = (id) => docs.set(`calls/${id}`,{callerId:'c',receiverId:'h',participantIds:['c','h'],status:'ended',connectedAtMs:1000,durationSeconds:30});
test('review retries contribute once, average/count update and edits are rejected',async()=>{
 completedCall('call1'); completedCall('call2');
 await Promise.all([reviews.submit('c',{callId:'call1',rating:5}),reviews.submit('c',{callId:'call1',rating:5})]);
 await reviews.submit('c',{callId:'call2',rating:3,tags:['Friendly']});
 expect(docs.get('hostReputation/h')).toMatchObject({reviewCount:2,ratingSum:8,averageRating:4,tagCounts:{Friendly:1}});
 await expect(reviews.submit('c',{callId:'call1',rating:1})).rejects.toMatchObject({code:'already-exists'});
});
test.each(['missed','rejected','failed','ringing'])('ineligible call %s cannot affect reputation',async(status)=>{
 completedCall('call1');docs.get('calls/call1').status=status;
 await expect(reviews.submit('c',{callId:'call1',rating:5})).rejects.toMatchObject({code:'permission-denied'});
 expect(docs.has('hostReputation/h')).toBe(false);
});
test('unconnected, unrelated reviewer and blocked review are denied',async()=>{
 completedCall('call1');docs.get('calls/call1').connectedAtMs=null;
 await expect(reviews.submit('c',{callId:'call1',rating:5})).rejects.toMatchObject({code:'permission-denied'});
 completedCall('call1'); await expect(reviews.submit('c2',{callId:'call1',rating:5})).rejects.toMatchObject({code:'permission-denied'});
 docs.set('users/h/blocked/c',{});await expect(reviews.submit('c',{callId:'call1',rating:5})).rejects.toMatchObject({code:'permission-denied'});
});


test.each(['submitted','pending','under_review'])('%s applicant uses consumer messaging and rewards',async(status)=>{
 docs.get('users/c').role='host';docs.get('users/c').hostStatus={hasApplied:true,isApproved:false,verificationStatus:status};
 expect(M.resolveMessagingEntitlement(docs.get('users/c'),{freeMessages:0})).toMatchObject({allowed:false,consume:1,source:'chat_window'});
 expect(M.resolveMessagingEntitlement(docs.get('users/c'),{},undefined,{friends:true})).toMatchObject({allowed:true,consume:0,source:'friends'});
 await send();expect(balance()).toBe(2);await expect(rewards.dashboard('c')).resolves.toHaveProperty('balances');
});
test('approved host with historical consumer role cannot claim consumer rewards',async()=>{
 docs.get('users/h').role='consumer';
 expect(M.resolveMessagingEntitlement(docs.get('users/h'),{freeMessages:0})).toMatchObject({allowed:true,consume:0,source:'host'});
 await expect(rewards.claim('h')).rejects.toMatchObject({code:'permission-denied'});
});

test('unsupported Consumer-to-Consumer and Host-to-Host profile view directions are rejected',async()=>{await expect(api.trackProfileView('c','c2')).rejects.toMatchObject({code:'permission-denied'});docs.set('users/h2',clone(host));await expect(api.trackProfileView('h','h2')).rejects.toMatchObject({code:'permission-denied'});expect(matching('/profileViews/')).toHaveLength(0);});
