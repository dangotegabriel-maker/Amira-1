jest.mock('firebase/firestore',()=>({}));
jest.mock('../firebaseService',()=>({}));
const {resolveFollowLabel}=require('../followService');
test.each([
 [{following:false,followedBy:false},'Follow'],[{following:true,followedBy:false},'Following'],
 [{following:true,followedBy:true},'Friends'],[{following:false,followedBy:true},'Follow'],
 [{following:true,followedBy:true,blocked:true},'Follow'],[{following:true,followedBy:true,valid:false},'Follow'],
])('relationship state %# derives label', (state,label)=>expect(resolveFollowLabel(state)).toBe(label));
