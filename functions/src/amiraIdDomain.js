'use strict';
const validAmiraId=value=>typeof value==='string'&&/^AMR-[0-9]{6}$/.test(value);
const formatCandidate=value=>{if(!Number.isInteger(value)||value<0||value>999999)throw new RangeError('Invalid identity candidate.');return `AMR-${String(value).padStart(6,'0')}`;};
module.exports={validAmiraId,formatCandidate};
