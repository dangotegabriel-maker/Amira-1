export const initialCallUiState=(call={})=>({phase:call.status||'ringing',billingMode:call.billingMode||'preview',previewRemaining:30,remoteUid:null,muted:false,camera:'front',ended:false});
export const reduceCallUi=(state,event)=>{switch(event.type){case'CALL_STATUS':return{...state,phase:event.status,billingMode:event.billingMode||state.billingMode};case'REMOTE_JOINED':return{...state,remoteUid:event.uid};case'PREVIEW_TICK':return state.billingMode==='preview'?{...state,previewRemaining:Math.max(0,state.previewRemaining-1)}:state;case'PREVIEW_ENDED':return{...state,billingMode:'awaiting_paid_confirmation'};case'PAID_CONFIRMED':return{...state,billingMode:'paid'};case'MUTE_TOGGLED':return{...state,muted:!state.muted};case'CAMERA_SWITCHED':return{...state,camera:state.camera==='front'?'back':'front'};case'END':return{...state,ended:true,phase:'ended'};default:return state;}};
export const paidContinuationChoice=({balance,incrementCredits})=>balance>=incrementCredits?'continue':'insufficient_credits';

// Countdown is a projection of server deadlines, never a billing transition.
export const getCallPaymentPresentation = (call, nowMs) => {
  const previewRemaining = Number.isFinite(call?.previewEndsAtMs)
    ? Math.max(0, Math.ceil((call.previewEndsAtMs - nowMs) / 1000)) : null;
  const decisionExpired = Number.isFinite(call?.paymentDecisionDeadlineMs)
    && nowMs >= call.paymentDecisionDeadlineMs;
  const awaiting = call?.billingMode === 'awaiting_paid_confirmation';
  const previewExpired = call?.billingMode === 'preview' && previewRemaining === 0;
  return { previewRemaining, decisionExpired, awaiting,
    mediaPaused: call?.billingMode === 'ended' || awaiting || previewExpired,
  };
};
