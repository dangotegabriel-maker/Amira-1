'use strict';
const DAY_MS=86400000;
const dayNumber = (date) => {
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  const time=Date.parse(date+'T00:00:00Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===date?time/DAY_MS:null;
};
const nextCheckInDay=(checkIn={},dateKey)=>{
  const today=dayNumber(dateKey),last=dayNumber(checkIn.lastClaimDate);
  const recorded=checkIn.lastRewardDay ?? (Number.isSafeInteger(checkIn.totalClaims)&&checkIn.totalClaims>0 ? (checkIn.totalClaims-1)%7+1 : 0);
  if(today===null||last===null||![0,1].includes(today-last)||!Number.isInteger(recorded)||recorded<1||recorded>7)return 1;
  return recorded%7+1;
};
module.exports={nextCheckInDay};
