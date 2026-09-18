// Lazy load the existing callable/emulator setup only when ensuring identity.
export const amiraIdentityService={ensure:async()=>require('./socialBackend').invokeSocial('ensureAmiraId',{})};
