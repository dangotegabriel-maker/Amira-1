export const filterDiscoveryHosts=(hosts,filters={})=>hosts.filter(host=>{
 if(host.hostStatus?.isApproved!==true || host.isDemo)return false;
 if(filters.onlineOnly && host.hostStatus.availability!=='online')return false;
 if(filters.country?.cca2 && host.countryCode!==filters.country.cca2)return false;
 if(filters.language && !(host.languages||[]).includes(filters.language))return false;
 const min=filters.minAge!==''&&filters.minAge!==undefined?Number(filters.minAge):null;
 const max=filters.maxAge!==''&&filters.maxAge!==undefined?Number(filters.maxAge):null;
 if((min!==null||max!==null)&&(!Number.isInteger(host.age)||host.age<18))return false;
 if(min!==null&&host.age<min)return false;
 if(max!==null&&host.age>max)return false;
 return !(filters.interests||[]).length || filters.interests.every(value=>(host.hostProfile?.interests||[]).includes(value));
});
export const discoveryFilterCount=filters=>[filters.country,filters.language,filters.minAge||filters.maxAge,filters.onlineOnly,filters.interests?.length].filter(Boolean).length;
