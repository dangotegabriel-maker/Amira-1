const {validAmiraId,formatCandidate}=require('../amiraIdDomain');
test.each(['AMR-000000','AMR-999999','AMR-583921'])('canonical identity accepted %s',value=>expect(validAmiraId(value)).toBe(true));
test.each(['583921','amr-583921','AMR583921','AMR-12345','AMR-1234567','AMR-ABC123',null,undefined])('malformed identity is not silently normalized %p',value=>expect(validAmiraId(value)).toBe(false));
test('candidate formatter covers finite inclusive space without alternate formats',()=>{expect(formatCandidate(0)).toBe('AMR-000000');expect(formatCandidate(999999)).toBe('AMR-999999');for(const value of [-1,1000000,1.5,'123456'])expect(()=>formatCandidate(value)).toThrow(RangeError);});
