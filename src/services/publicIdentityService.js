import { auth } from './firebaseService';
// Do not retain identity across accounts or fall back to owner-private documents.
const invoke = async (name, data) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required.');
  const result = await require('./socialBackend').invokeSocial(name, data);
  if (auth.currentUser?.uid !== uid) throw new Error('Account changed. Please reload.');
  return result;
};
export const publicIdentityService = {
  relationship: targetUid => invoke('getRelationshipCapability', {targetUid}),
  message: async targetUid => {
    const result = await invoke('getMessageIdentity', {targetUid});
    return {...result.identity, hostStatus:result.hostStatus, canInteract:result.canInteract};
  },
  calls: async callIds => {
    const participants=[];
    for (let offset=0;offset<callIds.length;offset+=30) {
      const result=await invoke('getCallParticipantIdentities',{callIds:callIds.slice(offset,offset+30)});
      participants.push(...result.participants);
    }
    return participants;
  },
  blocked: async () => (await invoke('listOwnedBlockedIdentities', {})).people,
};
