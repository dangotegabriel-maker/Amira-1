'use strict';

const TYPES=new Set(['FREE_MESSAGES','FREE_VIDEO_SECONDS','QUICK_MATCH_ENTITLEMENT','BONUS_CREDITS','NONE']);
const CRITERIA=new Set(['COMPLETE_PROFILE','ADD_BIO','FOLLOW_HOST','LIKE_HOST','SEND_ELIGIBLE_MESSAGE','CONNECTED_VIDEO_CALL','VIEW_HOST_PROFILE','QUICK_MATCH_CONNECTED']);
const MAX_REWARD=100000,MAX_TARGET=100;
const integer=(value,name,min=1,max=Number.MAX_SAFE_INTEGER)=>{if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`Invalid ${name}.`);return value;};
const id=value=>{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(value))throw new Error('Invalid task ID.');return value;};
const text=(value,name,max)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new Error(`Invalid ${name}.`);return value.trim();};
const definition=(raw,scope)=>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid task definition.');
 const allowed=['id','title','description','criterion','reward','active','sortOrder','version','target'];
 if(Object.keys(raw).some(k=>!allowed.includes(k)))throw new Error('Invalid task definition.');
 const reward=raw.reward;if(!reward||typeof reward!=='object'||Array.isArray(reward)||Object.keys(reward).some(k=>!['type','amount'].includes(k))||!TYPES.has(reward.type))throw new Error('Unsupported task reward.');
 const amount=reward.type==='NONE'?(reward.amount===undefined?0:integer(reward.amount,'reward amount',0,0)):integer(reward.amount,'reward amount',1,MAX_REWARD);
 return {id:id(raw.id),title:text(raw.title,'task title',80),description:text(raw.description,'task description',240),criterion:CRITERIA.has(raw.criterion)?raw.criterion:(()=>{throw new Error('Unsupported task criterion.');})(),reward:{type:reward.type,amount},active:raw.active===true,sortOrder:integer(raw.sortOrder??0,'sort order',0,10000),version:id(raw.version),target:integer(raw.target??1,'task target',1,MAX_TARGET),scope};
};
const config=raw=>{
 if(!raw)return {version:null,gettingStarted:[],daily:[],available:false};
 if(typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['version','gettingStarted','daily'].includes(k)))throw new Error('Invalid Consumer Rewards configuration.');
 const version=id(raw.version),parse=(items,scope)=>{if(!Array.isArray(items)||items.length>50)throw new Error('Invalid task catalogue.');const parsed=items.map(x=>definition(x,scope)).filter(x=>x.active);if(new Set(parsed.map(x=>x.id)).size!==parsed.length)throw new Error('Duplicate task ID.');return parsed.sort((a,b)=>a.sortOrder-b.sortOrder||a.id.localeCompare(b.id));};
 return {version,gettingStarted:parse(raw.gettingStarted||[],'getting_started'),daily:parse(raw.daily||[],'daily'),available:true};
};
const period=(scope,dateKey)=>scope==='daily'?dateKey:'once';
const claimId=(uid,task,dateKey)=>`${uid}__${task.scope}__${task.id}__${task.version}__${period(task.scope,dateKey)}`;
const rewardDescription=reward=>({FREE_MESSAGES:`${reward.amount} Chat Pass${reward.amount===1?'':'es'}`,FREE_VIDEO_SECONDS:`${reward.amount}s free video`,QUICK_MATCH_ENTITLEMENT:`${reward.amount} Quick Match${reward.amount===1?'':'es'}`,BONUS_CREDITS:`${reward.amount} Bonus Credit${reward.amount===1?'':'s'}`,NONE:'No economic reward'})[reward.type];
module.exports={TYPES,CRITERIA,MAX_REWARD,MAX_TARGET,config,period,claimId,rewardDescription};
