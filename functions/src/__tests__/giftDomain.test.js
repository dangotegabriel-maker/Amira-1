'use strict';
const G=require('../giftDomain');
const valid=()=>({enabled:true,version:'catalog-test-1',economics:{version:'econ-test-1',hostShareBasisPoints:3750},gifts:[{giftId:'test_rose',name:'Test Rose',priceCredits:8,asset:{kind:'emoji',key:'test'},enabled:true,displayOrder:1,economicsVersion:'econ-test-1'}]});
test('valid protected config is normalized',()=>expect(G.config(valid()).gifts.test_rose).toMatchObject({priceCredits:8,enabled:true}));
test.each([null,{}, {...valid(),enabled:false},{...valid(),economics:{version:'econ-test-1',hostShareBasisPoints:10001}},{...valid(),gifts:[{...valid().gifts[0],economicsVersion:'stale'}]}])('missing or invalid production config fails closed',value=>expect(()=>G.config(value)).toThrow());
test('allocation is exact, integral and preserves price',()=>{const value=G.allocation(11,3750);expect(value).toEqual({hostCreditsEquivalent:4,platformCreditsEquivalent:7});expect(value.hostCreditsEquivalent+value.platformCreditsEquivalent).toBe(11);});
test.each(['host_profile','messages','video_call','story','moment'])('source %s is allowlisted',source=>expect(G.source(source)).toBe(source));
test('arbitrary source is denied',()=>expect(()=>G.source('forged')).toThrow(/source/));
