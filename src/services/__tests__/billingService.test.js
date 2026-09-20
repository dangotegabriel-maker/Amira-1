import { canContinuePaidCall, quoteChargeForState, quoteIncrement, quoteIncrementAt, quotePaidDuration } from '../billingService';
describe('fair billing',()=>{
  test('30 credits/minute is 5 credits per 10 seconds',()=>expect(quoteIncrement(30)).toBe(5));
  test('17 paid seconds uses two increments',()=>expect(quotePaidDuration(30,17)).toBe(10));
  test('awkward rate is deterministic and six increments equal the disclosed minute',()=>{expect(quoteIncrement(25)).toBe(4);expect([1,2,3,4,5,6].reduce((sum,n)=>sum+quoteIncrementAt(25,n),0)).toBe(25);expect(Number.isInteger(quotePaidDuration(25,27))).toBe(true);});
  test.each(['requesting','ringing','accepted','connecting','ended'])('no charge in %s',(status)=>expect(quoteChargeForState({status,ratePerMinute:30,paidSeconds:20})).toBe(0));
  test('connected paid duration is quoted',()=>expect(quoteChargeForState({status:'connected',ratePerMinute:30,paidSeconds:20})).toBe(10));
  test('insufficient credit continuation is rejected',()=>expect(canContinuePaidCall({balance:4,ratePerMinute:30})).toBe(false));
});
