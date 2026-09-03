import { followingSnapshotToIds } from '../followService';
jest.mock('firebase/firestore',()=>({collection:jest.fn(),deleteDoc:jest.fn(),doc:jest.fn(),getDoc:jest.fn(),getDocs:jest.fn(),serverTimestamp:jest.fn(),setDoc:jest.fn()}));
jest.mock('../firebaseService',()=>({auth:{currentUser:null},db:{},dbService:{}}));
test('following snapshots transform into stable host IDs',()=>expect(followingSnapshotToIds({docs:[{id:'host-a'},{id:'host-b'}]})).toEqual(['host-a','host-b']));
