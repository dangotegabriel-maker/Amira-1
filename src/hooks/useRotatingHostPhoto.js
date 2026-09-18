import {useEffect,useMemo,useState} from 'react';
const {publicPhotos}=require('../../functions/src/hostDiscoveryDomain');
export const useRotatingHostPhoto=(host,active=true)=>{
 const photoKey=JSON.stringify(publicPhotos(host||{}));
 const photos=useMemo(()=>JSON.parse(photoKey),[photoKey]);
 const [index,setIndex]=useState(0),[failed,setFailed]=useState([]);
 useEffect(()=>{setIndex(0);setFailed([]);},[host?.uid,photoKey]);
 const usable=photos.filter(uri=>!failed.includes(uri));
 useEffect(()=>{if(!active||usable.length<2)return undefined;const timer=setInterval(()=>setIndex(current=>(current+1)%usable.length),3000);return()=>clearInterval(timer);},[active,photoKey,usable.length,host?.uid]);
 const uri=usable.length?usable[index%usable.length]:'';
 return {uri,onError:()=>setFailed(current=>uri&&!current.includes(uri)?[...current,uri]:current)};
};
