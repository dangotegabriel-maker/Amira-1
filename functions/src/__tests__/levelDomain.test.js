const L=require('../levelDomain');
const TEST_CONFIG={thresholds:Array.from({length:11},(_,level)=>level*100),milestones:{1:{freeMessages:2}}};
const account=total=>({lifetimeQualifyingPurchasedCredits:total});
test('exactly eleven Levels, no production thresholds or rewards',()=>{expect(L.LEVELS).toEqual([0,1,2,3,4,5,6,7,8,9,10]);expect(L.DEFAULT_LEVEL_CONFIG).toEqual({thresholds:null,milestones:{}});expect(L.deriveLevel(account(999999))).toBe(0);expect(L.milestoneReward({},1)).toBeNull();});
test.each([[0,0],[99,0],[100,1],[199,1],[1000,10],[1001,10]])('TEST threshold total %s -> Level %s',(total,level)=>expect(L.deriveLevel(account(total),TEST_CONFIG)).toBe(level));
test.each(L.LEVELS)('exact TEST threshold for Level %s',level=>{expect(L.deriveLevel(account(TEST_CONFIG.thresholds[level]),TEST_CONFIG)).toBe(level);if(level)expect(L.deriveLevel(account(TEST_CONFIG.thresholds[level]-1),TEST_CONFIG)).toBe(level-1);});
test.each([-1,NaN,Infinity,1.5,'100',Number.MAX_SAFE_INTEGER+1])('corrupt qualifying total %s safely resolves Level 0',total=>expect(L.deriveLevel(account(total),TEST_CONFIG)).toBe(0));
test.each([{},null,{thresholds:[0,100]},{thresholds:Array(11).fill(0)}])('unconfigured/invalid thresholds never unlock a Level',config=>expect(L.deriveLevel(account(1000),config||{})).toBe(0));
test('wallet spending, bonuses, rewards and forged cached Levels cannot determine Level',()=>{for(const fields of [{wallet:{creditBalance:10000}},{wallet:{creditBalance:0}},{bonusCredits:10000},{rewardCredits:10000},{freeMessages:10000},{freeVideoSeconds:10000},{quickMatchCount:10000},{level:10,amiraLevel:10}]){expect(L.deriveLevel({...account(200),...fields},TEST_CONFIG)).toBe(2);expect(L.deriveLevel(fields,TEST_CONFIG)).toBe(0);}});
test('verified future purchase/reversal contract is scoped, bounded and idempotent',()=>{
 const input={verified:true,purchaseId:'purchase',consumerUid:'c',qualifyingCredits:250};let state=L.recordVerifiedPurchase({},null,input);expect(L.deriveLevel(state.account,TEST_CONFIG)).toBe(2);
 expect(L.recordVerifiedPurchase(state.account,state.purchase,input)).toMatchObject({idempotent:true,account:state.account});
 expect(()=>L.recordVerifiedPurchase({},null,{...input,verified:false})).toThrow();expect(()=>L.recordVerifiedPurchase(state.account,state.purchase,{...input,qualifyingCredits:251})).toThrow();
 const reversal={verified:true,consumerUid:'c',reversalId:'refund',qualifyingCredits:200};state=L.reverseVerifiedPurchase(state.account,state.purchase,reversal);expect(L.deriveLevel(state.account,TEST_CONFIG)).toBe(0);expect(state.account.lifetimeQualifyingPurchasedCredits).toBe(50);
 expect(L.reverseVerifiedPurchase(state.account,state.purchase,reversal).idempotent).toBe(true);
 expect(()=>L.reverseVerifiedPurchase(state.account,state.purchase,{...reversal,qualifyingCredits:1})).toThrow('identity mismatch');
 expect(()=>L.reverseVerifiedPurchase(state.account,state.purchase,{...reversal,reversalId:'other',qualifyingCredits:51})).toThrow();expect(()=>L.reverseVerifiedPurchase(state.account,state.purchase,{...reversal,consumerUid:'other'})).toThrow();
});
test('gift and unsupported milestone rewards are rejected',()=>{for(const reward of [{promotionalGifts:{generic:1}},{bonusCredits:100},{freeMessages:-1}])expect(()=>L.milestoneReward({...TEST_CONFIG,milestones:{1:reward}},1)).toThrow();});


test('trusted preparation rejects corrupt totals and wrong account identity',()=>{
 const input={verified:true,purchaseId:'p',consumerUid:'c',qualifyingCredits:1};
 expect(()=>L.recordVerifiedPurchase({lifetimeQualifyingPurchasedCredits:-1},null,input)).toThrow('Invalid authoritative');
 expect(()=>L.recordVerifiedPurchase({consumerUid:'other'},null,input)).toThrow('Account identity');
});
