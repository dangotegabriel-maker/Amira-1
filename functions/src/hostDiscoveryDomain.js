'use strict';
// Existing onboarding catalogue, shared by read-only discovery and profile UI.
const INTERESTS = Object.freeze(['Music','Travel','Food','Gaming','Art','Sports','Movies','Tech','Fashion','Fitness']);
const controlledInterests = values => Array.isArray(values) ? [...new Set(values.map(value => INTERESTS.find(item => typeof value === 'string' && item.toLowerCase() === value.trim().toLowerCase())).filter(Boolean))].slice(0,10) : [];
const millis = value => value?.toMillis?.() ?? (value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : typeof value === 'number' ? value : NaN);
const publicUrl = value => typeof value === 'string' && /^https:\/\/[^\s]+$/.test(value) ? value : '';
const publicPhotos = profile => [...new Set([publicUrl(profile.profilePic || profile.photoURL || profile.photo), ...(Array.isArray(profile.hostProfile?.gallery) ? profile.hostProfile.gallery : Array.isArray(profile.photos) ? profile.photos : []).map(item => typeof item === 'string' ? publicUrl(item) : item?.visibility === 'vip_only' || item?.visibility === 'VIP Only' || (item?.visibility && item.visibility !== 'public' && item.visibility !== 'Public') ? '' : publicUrl(item?.url))].filter(Boolean))].slice(0,10);
const publicMedia = (values, now, activeOnly) => (Array.isArray(values) ? values : []).filter(item => item && ['public','Public'].includes(item.visibility) && publicUrl(item.uri || item.url) && (!activeOnly || millis(item.expiresAt) > now)).slice(0,20).map(item => ({id: typeof item.id === 'string' ? item.id : publicUrl(item.uri || item.url), uri: publicUrl(item.uri || item.url), type: item.type === 'video' ? 'video' : 'image', visibility:'public'}));
const ageFromDob = (dob, now) => {
 if(typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob))return null;
 const birth = new Date(`${dob}T00:00:00Z`), today = new Date(now);
 if(!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0,10)!==dob || birth>today)return null;
 let age=today.getUTCFullYear()-birth.getUTCFullYear();
 if(today.getUTCMonth()<birth.getUTCMonth() || (today.getUTCMonth()===birth.getUTCMonth() && today.getUTCDate()<birth.getUTCDate()))age--;
 return age>=18 && age<=120 ? age : null;
};
const projectHost = (uid, profile, application, now=Date.now()) => {
 const photos=publicPhotos(profile), rate=profile.hostProfile?.videoRateCredits;
 const approvalMs=application?.status==='approved' ? millis(application.approvedAt) : NaN;
 const stories=publicMedia(profile.stories,now,true);
 return {uid,username:typeof (profile.username||profile.name)==='string'?(profile.username||profile.name):'',role:'host',profilePic:photos[0]||'',
 countryCode:typeof (profile.countryCode||profile.country_code)==='string'?(profile.countryCode||profile.country_code):'',age:ageFromDob(profile.dob,now),
 languages:(Array.isArray(profile.hostProfile?.languages)?profile.hostProfile.languages:Array.isArray(profile.languages)?profile.languages:[]).filter(value=>typeof value==='string' && value.length<=60).slice(0,10),
 hostApprovedAt:Number.isFinite(approvalMs)&&approvalMs<=now?approvalMs:null,
 hostStatus:{isApproved:true,availability:['online','offline','busy'].includes(profile.hostStatus?.availability)?profile.hostStatus.availability:'offline'},
 hostProfile:{bio:typeof profile.hostProfile?.bio==='string'?profile.hostProfile.bio:typeof profile.bio==='string'?profile.bio:'',interests:controlledInterests(profile.hostProfile?.interests||profile.interests),gallery:photos,videoRateCredits:Number.isSafeInteger(rate)&&rate>0?rate:null,introVideoUrl:publicUrl(profile.hostProfile?.introVideoUrl)},
 stories,hasActiveStory:stories.length>0,storyThumbnail:stories.find(item=>item.type==='image')?.uri||photos[0]||'',moments:publicMedia(profile.moments,now,false)};
};
module.exports={INTERESTS,controlledInterests,publicPhotos,projectHost,ageFromDob};
