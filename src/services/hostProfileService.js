import { invokeSocial } from './socialBackend';
export const hostProfileService = {
 get: hostId => invokeSocial('getPublicHostProfile',{hostId}),
 setLiked: (hostId,liked) => invokeSocial('setHostLike',{hostId,liked}),
 hide: hostId => invokeSocial('hideDiscoveryHost',{hostId}),
};
