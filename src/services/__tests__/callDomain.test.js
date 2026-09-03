import { canTransitionCall, getPreviewEligibility, hasConflictingActiveCall, shouldConsumePreview, validateCallEligibility } from '../callDomain';

const creator = { uid:'host-1', role:'host', hostStatus:{isApproved:true,availability:'online'} };
describe('call lifecycle domain',()=>{
  test('validates allowed transitions',()=>{expect(canTransitionCall('requesting','ringing')).toBe(true);expect(canTransitionCall('ringing','connected')).toBe(false);expect(canTransitionCall('connected','ended')).toBe(true);});
  test('cannot call self',()=>expect(()=>validateCallEligibility({callerId:'host-1',creator})).toThrow('yourself'));
  test('blocked call is rejected',()=>expect(()=>validateCallEligibility({callerId:'user-1',creator,relationship:{blocked:true}})).toThrow('unavailable'));
  test('unapproved creator is rejected',()=>expect(()=>validateCallEligibility({callerId:'user-1',creator:{...creator,hostStatus:{...creator.hostStatus,isApproved:false}}})).toThrow('not approved'));
  test('unavailable creator is rejected',()=>expect(()=>validateCallEligibility({callerId:'user-1',creator:{...creator,hostStatus:{...creator.hostStatus,availability:'offline'}}})).toThrow('unavailable'));
  test('preview is available before consumption',()=>expect(getPreviewEligibility(null,new Date('2026-09-03T12:00:00Z')).eligible).toBe(true));
  test.each(['rejected','failed'])('%s call does not consume preview',(nextStatus)=>expect(shouldConsumePreview({previousStatus:'ringing',nextStatus,previewEligible:true,previewConsumed:false})).toBe(false));
  test('preview is consumed only on connecting to connected',()=>expect(shouldConsumePreview({previousStatus:'connecting',nextStatus:'connected',previewEligible:true,previewConsumed:false})).toBe(true));
  test('second creator on same UTC day gets no second preview',()=>expect(getPreviewEligibility({dateKey:'2026-09-03',consumed:true},new Date('2026-09-03T23:59:00Z')).eligible).toBe(false));
  test('next UTC day resets preview',()=>expect(getPreviewEligibility({dateKey:'2026-09-03',consumed:true},new Date('2026-09-04T00:00:00Z')).eligible).toBe(true));
  test('active call conflict is detected',()=>expect(hasConflictingActiveCall([{participantIds:['user-1','host-2'],status:'connecting'}],'user-1')).toBe(true));
});
