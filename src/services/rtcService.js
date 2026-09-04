import { Camera } from 'expo-camera';
import { DEV_FEATURES } from '../config/devFeatures';

let engine=null,handler=null,remoteUid=null,initializedAppId=null;
const listeners=new Set();
const emit=(type,payload={})=>listeners.forEach((listener)=>listener({type,...payload}));
const getAgora=()=>{try{return require('react-native-agora');}catch(error){throw new Error(__DEV__?'Agora native module is unavailable. Install an Expo development build.':'Video calling is temporarily unavailable.');}};
const requireAppId=()=>{const appId=process.env.EXPO_PUBLIC_AGORA_APP_ID;if(!appId)throw new Error(__DEV__?'EXPO_PUBLIC_AGORA_APP_ID is missing.':'Video calling is temporarily unavailable.');return appId;};
const initialize=async()=>{if(DEV_FEATURES.enableCallSimulator)return {provider:'development-simulator'};const appId=requireAppId();if(engine&&initializedAppId===appId)return {provider:'agora'};const agora=getAgora();engine=agora.createAgoraRtcEngine();engine.initialize({appId});engine.enableVideo();handler={onJoinChannelSuccess:()=>emit('localJoined'),onUserJoined:(_connection,uid)=>{remoteUid=uid;emit('remoteJoined',{uid});},onUserOffline:(_connection,uid,reason)=>{if(uid===remoteUid)remoteUid=null;emit('remoteLeft',{uid,reason});},onConnectionStateChanged:(_connection,state,reason)=>emit('connectionState',{state,reason}),onConnectionLost:()=>emit('connectionLost'),onRejoinChannelSuccess:()=>emit('reconnected'),onError:(code,message)=>emit('error',{code,message})};engine.registerEventHandler(handler);initializedAppId=appId;return {provider:'agora'};};
export const rtcService=Object.freeze({
  provider:DEV_FEATURES.enableCallSimulator?'development-simulator':'agora',initialize,
  requestPermissions:async()=>{const [camera,microphone]=await Promise.all([Camera.requestCameraPermissionsAsync(),Camera.requestMicrophonePermissionsAsync()]);if(!camera.granted)throw new Error('Camera permission is required for video calling.');if(!microphone.granted)throw new Error('Microphone permission is required for video calling.');return true;},
  joinSession:async(credentials)=>{if(DEV_FEATURES.enableCallSimulator){emit('localJoined');setTimeout(()=>emit('remoteJoined',{uid:2}),500);return {simulated:true};}await initialize();if(!credentials?.token||!credentials?.channelName||!credentials?.rtcUid||credentials.appId!==initializedAppId)throw new Error('Secure RTC credentials are unavailable.');engine.startPreview();const result=engine.joinChannel(credentials.token,credentials.channelName,credentials.rtcUid,{channelProfile:0,clientRoleType:1,publishMicrophoneTrack:true,publishCameraTrack:true,autoSubscribeAudio:true,autoSubscribeVideo:true});if(result!==0)throw new Error('Unable to connect to the video call.');return {simulated:false};},
  leaveSession:async()=>{if(engine){engine.stopPreview();engine.leaveChannel();}remoteUid=null;emit('disconnected');},
  destroy:()=>{if(engine){if(handler)engine.unregisterEventHandler(handler);engine.release();}engine=null;handler=null;remoteUid=null;initializedAppId=null;},
  setCameraEnabled:async(enabled)=>{engine?.muteLocalVideoStream(!enabled);},setMicrophoneMuted:async(muted)=>{engine?.muteLocalAudioStream(muted);},switchCamera:async()=>engine?.switchCamera(),
  subscribe:(listener)=>{listeners.add(listener);return()=>listeners.delete(listener);},getRemoteUid:()=>remoteUid,
});
