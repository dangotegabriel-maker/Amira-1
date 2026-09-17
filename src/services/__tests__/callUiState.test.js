import{initialCallUiState,paidContinuationChoice,reduceCallUi}from'../callUiState';
describe('call UI state',()=>{const update=(event,state=initialCallUiState())=>reduceCallUi(state,event);
 test('outgoing starts ringing',()=>expect(initialCallUiState().phase).toBe('ringing'));
 test('incoming accept enters connecting',()=>expect(update({type:'CALL_STATUS',status:'connecting'}).phase).toBe('connecting'));
 test('incoming reject ends as rejected',()=>expect(update({type:'CALL_STATUS',status:'rejected'}).phase).toBe('rejected'));
 test('remote participant connected is retained',()=>expect(update({type:'REMOTE_JOINED',uid:42}).remoteUid).toBe(42));
 test('preview countdown decrements',()=>expect(update({type:'PREVIEW_TICK'}).previewRemaining).toBe(29));
 test('preview end requires confirmation',()=>expect(update({type:'PREVIEW_ENDED'}).billingMode).toBe('awaiting_paid_confirmation'));
 test('paid confirmation enters paid mode',()=>expect(update({type:'PAID_CONFIRMED'}).billingMode).toBe('paid'));
 test('insufficient credits blocks continuation',()=>expect(paidContinuationChoice({balance:4,incrementCredits:5})).toBe('insufficient_credits'));
 test('mute toggles',()=>expect(update({type:'MUTE_TOGGLED'}).muted).toBe(true));
 test('camera switches',()=>expect(update({type:'CAMERA_SWITCHED'}).camera).toBe('back'));
 test('end marks cleanup state',()=>expect(update({type:'END'})).toMatchObject({ended:true,phase:'ended'}));
 test('disconnect status is visible',()=>expect(update({type:'CALL_STATUS',status:'reconnecting'}).phase).toBe('reconnecting'));
});


const {getCallPaymentPresentation}=require('../callUiState');
test('server reconnect checkpoint freezes free countdown and pauses media',()=>{
 const call={accountingVersion:2,billingMode:'preview',freeVideoAllowanceSeconds:30,connection:{state:'reconnecting',freeMs:7000,segmentStartedAtMs:null}};
 expect(getCallPaymentPresentation(call,10000)).toMatchObject({previewRemaining:23,mediaPaused:true});
 expect(getCallPaymentPresentation(call,19000)).toMatchObject({previewRemaining:23,mediaPaused:true});
});
test('same call resumes its remaining free countdown within connection lease',()=>{
 const call={accountingVersion:2,billingMode:'preview',freeVideoAllowanceSeconds:30,connection:{state:'connected',freeMs:7000,segmentStartedAtMs:20000,leaseUntilMs:32000}};
 expect(getCallPaymentPresentation(call,24000)).toMatchObject({previewRemaining:19,mediaPaused:false});
 expect(getCallPaymentPresentation(call,40000).previewRemaining).toBe(11);
});
