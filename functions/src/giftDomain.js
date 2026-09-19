'use strict';
const C=require('./creditDomain');
const SOURCES=Object.freeze(['host_profile','messages','video_call','story','moment']);
const id=(value,name='Identifier')=>C.text(value,name);
const config=raw=>{
 if(!raw||raw.enabled!==true||typeof raw.version!=='string'||!raw.version.trim()||!Array.isArray(raw.gifts)||!raw.economics)throw new Error('Gifting is unavailable.');
 const hostShareBasisPoints=C.integer(raw.economics.hostShareBasisPoints,'Host share basis points');
 if(hostShareBasisPoints>10000||typeof raw.economics.version!=='string'||!raw.economics.version.trim())throw new Error('Gift economics are invalid.');
 const seen=new Set(),gifts={};
 for(const gift of raw.gifts){
  if(!gift||typeof gift!=='object'||Array.isArray(gift)||Object.keys(gift).some(key=>!['giftId','name','priceCredits','asset','enabled','displayOrder','economicsVersion'].includes(key)))throw new Error('Gift configuration is invalid.');
  const giftId=id(gift.giftId,'Gift ID');if(seen.has(giftId))throw new Error('Duplicate Gift ID.');seen.add(giftId);
  if(typeof gift.name!=='string'||!gift.name.trim()||gift.name.length>80||typeof gift.enabled!=='boolean')throw new Error('Gift configuration is invalid.');
  const priceCredits=C.integer(gift.priceCredits,'Gift price',{positive:true}),displayOrder=C.integer(gift.displayOrder,'Gift order');
  const asset=gift.asset&&typeof gift.asset==='object'&&!Array.isArray(gift.asset)?{key:String(gift.asset.key||'').slice(0,120),kind:String(gift.asset.kind||'').slice(0,40)}:{key:'',kind:''};
  if(gift.economicsVersion!==raw.economics.version)throw new Error('Gift economics version mismatch.');
  gifts[giftId]={giftId,name:gift.name.trim(),priceCredits,asset,enabled:gift.enabled,displayOrder,economicsVersion:gift.economicsVersion};
 }
 return {enabled:true,version:raw.version,gifts,economics:{version:raw.economics.version,hostShareBasisPoints}};
};
const allocation=(price,bps)=>{C.integer(price,'Gift price',{positive:true});C.integer(bps,'Host share basis points');if(bps>10000)throw new Error('Gift economics are invalid.');const host=Number(BigInt(price)*BigInt(bps)/10000n);return {hostCreditsEquivalent:host,platformCreditsEquivalent:price-host};};
const source=value=>{if(!SOURCES.includes(value))throw new Error('Gift source is invalid.');return value;};
module.exports={SOURCES,config,allocation,source};
