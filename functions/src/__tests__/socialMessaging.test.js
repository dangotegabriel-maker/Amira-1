const { createSocialMessaging } = require('../socialMessaging');
const M = require('../messageEntitlements');
const { createConsumerRewards } = require('../consumerRewards');
const docs = new Map();
const clone = (v) => v === undefined ? undefined : structuredClone(v);
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
const FieldValue = { serverTimestamp: () => Date.now() };
class HttpsError extends Error { constructor(code,message,details) { super(message); this.code=code; this.details=details; } }
const api = createSocialMessaging({ db, FieldValue, HttpsError });
const rewards = createConsumerRewards({ db, FieldValue, HttpsError });
const consumer = { role: 'consumer', isProfileComplete: true, vip: { status: 'inactive', tier: 'FREE' } };
const host = { role: 'host', isProfileComplete: true, hostStatus: { isApproved: true } };
const balance = (uid='c') => docs.get(`consumerRewards/${uid}`)?.freeMessages;
const matching = (part) => [...docs.keys()].filter(k => k.includes(part));
const send = (uid='c', messageId='one', text='Hello') => api.sendText(uid,{ receiverId: uid==='h'?'c':'h', messageId, text });
const follow = () => docs.set('users/c/following/h', { consumerId:'c',hostId:'h' });
const mutual = () => { follow(); docs.set('users/h/following/c',{ sourceId:'h',targetId:'c',sourceRole:'host',targetRole:'consumer' }); };
beforeEach(() => {
 jest.useFakeTimers().setSystemTime(new Date('2026-09-11T12:00:00Z')); docs.clear(); queue=Promise.resolve();
 docs.set('users/c',clone(consumer)); docs.set('users/h',clone(host)); docs.set('users/c2',clone(consumer));
 docs.set('consumerRewards/c',{freeMessages:3,freeVideoSeconds:10});
});
afterEach(() => jest.useRealTimers());
test.each([['c','h'],['h','c'],['c','c2']])('profile view %s to %s uses existing records',async(a,b)=>{
 expect(await api.trackProfileView(a,b)).toEqual({counted:true});
 expect(docs.get(`users/${b}/profileViews/${a}`).viewCount).toBe(1);
 expect((await api.listProfileViews(b)).count).toBe(1);
});
test('host identities are standard; consumer identities require unexpired VIP',async()=>{
 await api.trackProfileView('c','h'); await api.trackProfileView('h','c');
 expect((await api.listProfileViews('h')).views[0].viewerUid).toBe('c');
 expect((await api.listProfileViews('c')).views).toEqual([]);
 docs.get('users/c').vip={status:'active',tier:'VIP_1',expiresAt:Date.now()+1000};
 expect((await api.listProfileViews('c')).views[0].viewerUid).toBe('h');
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
 expect(docs.get('conversations/c__h')).toMatchObject({unreadCounts:{c:0,h:1},lastReadAt:{c:Date.now(),h:null}});
 expect(docs.get(matching('/messageTransactions/')[0])).toMatchObject({delta:-1,source:'message_send',resultingBalance:n-1});
});
test('zero entitlement has typed failure and no conversation artifacts',async()=>{
 docs.get('consumerRewards/c').freeMessages=0;
 await expect(send()).rejects.toMatchObject({details:{reason:'insufficient_messages'}});
 expect(matching('conversations/')).toHaveLength(0); expect(balance()).toBe(0);
});
test('duplicate retry at zero costs once; changed payload with same ID rejected',async()=>{
 docs.get('consumerRewards/c').freeMessages=1; await Promise.all([send(),send()]);
 expect(balance()).toBe(0); expect(matching('/messages/')).toHaveLength(1);
 await expect(send('c','one','Changed')).rejects.toMatchObject({code:'already-exists'});
});
test('distinct sends preserve conversation and recipient read marker',async()=>{
 await send(); docs.get('conversations/c__h').lastReadAt.h=123;
 await send('c','two'); expect(balance()).toBe(1);
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
test('host reply and receiving consume no consumer entitlement; pending host rejected',async()=>{
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
