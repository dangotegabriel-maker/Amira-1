import {invokeSocial} from './socialBackend';
export const hostActivityService={
 list:tab=>invokeSocial('getHostActivity',{tab}),
 getConsumer:consumerUid=>invokeSocial('getPublicConsumerProfile',{consumerUid}),
};
