import {invokeSocial} from './socialBackend';
export const hostConnectService={
 availability:()=>invokeSocial('getHostAvailability',{}),
 setAvailability:availability=>invokeSocial('setHostAvailability',{availability}),
 discover:tab=>invokeSocial('getHostConnectConsumers',{tab}),
 today:()=>invokeSocial('getHostConnectToday',{}),
};
