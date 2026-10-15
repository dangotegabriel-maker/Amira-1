const mockEngine={initialize:jest.fn(),enableVideo:jest.fn(),registerEventHandler:jest.fn(),startPreview:jest.fn(),joinChannel:jest.fn(()=>0),stopPreview:jest.fn(),leaveChannel:jest.fn(),muteLocalVideoStream:jest.fn(()=>0),muteLocalAudioStream:jest.fn(()=>0),switchCamera:jest.fn(),unregisterEventHandler:jest.fn(),release:jest.fn()};
jest.mock('expo-camera',()=>({Camera:{requestCameraPermissionsAsync:jest.fn(),requestMicrophonePermissionsAsync:jest.fn()}}));
jest.mock('react-native-agora',()=>({createAgoraRtcEngine:jest.fn(()=>mockEngine)}));
describe('Agora RTC boundary',()=>{beforeEach(()=>{jest.resetModules();process.env.EXPO_PUBLIC_ENABLE_CALL_SIMULATOR='false';delete process.env.EXPO_PUBLIC_AGORA_APP_ID;Object.values(mockEngine).forEach(fn=>fn?.mockClear?.());});
 test('missing App ID fails securely',async()=>{const{rtcService}=require('../rtcService');await expect(rtcService.initialize()).rejects.toThrow('EXPO_PUBLIC_AGORA_APP_ID');});
 test('session invalidated during initialization cannot join or start preview',async()=>{process.env.EXPO_PUBLIC_AGORA_APP_ID='test-app-id';const{rtcService}=require('../rtcService');let current=true;const pending=rtcService.joinSession({token:'test',channelName:'call',rtcUid:1,appId:'test-app-id'},()=>current);current=false;await pending;expect(mockEngine.joinChannel).not.toHaveBeenCalled();expect(mockEngine.startPreview).not.toHaveBeenCalled();rtcService.destroy();});
 test('initializes official Agora engine',async()=>{process.env.EXPO_PUBLIC_AGORA_APP_ID='test-app-id';const{rtcService}=require('../rtcService');await expect(rtcService.initialize()).resolves.toEqual({provider:'agora'});expect(mockEngine.initialize).toHaveBeenCalledWith({appId:'test-app-id'});rtcService.destroy();});
 test('camera permission denial is explicit',async()=>{const{Camera}=require('expo-camera');Camera.requestCameraPermissionsAsync.mockResolvedValue({granted:false});Camera.requestMicrophonePermissionsAsync.mockResolvedValue({granted:true});const{rtcService}=require('../rtcService');await expect(rtcService.requestPermissions()).rejects.toThrow('Camera permission');});
 test('microphone permission denial is explicit',async()=>{const{Camera}=require('expo-camera');Camera.requestCameraPermissionsAsync.mockResolvedValue({granted:true});Camera.requestMicrophonePermissionsAsync.mockResolvedValue({granted:false});const{rtcService}=require('../rtcService');await expect(rtcService.requestPermissions()).rejects.toThrow('Microphone permission');});
 test('mute camera switch and leave delegate to provider',async()=>{process.env.EXPO_PUBLIC_AGORA_APP_ID='test-app-id';const{rtcService}=require('../rtcService');await rtcService.initialize();await rtcService.setMicrophoneMuted(true);await rtcService.switchCamera();await rtcService.leaveSession();expect(mockEngine.muteLocalAudioStream).toHaveBeenCalledWith(true);expect(mockEngine.switchCamera).toHaveBeenCalled();expect(mockEngine.leaveChannel).toHaveBeenCalled();rtcService.destroy();});});


test.each(['video','audio'])('native %s publishing failure rejects so the call can detach safely',async kind=>{
 jest.resetModules();process.env.EXPO_PUBLIC_ENABLE_CALL_SIMULATOR='false';process.env.EXPO_PUBLIC_AGORA_APP_ID='test-app-id';
 const {rtcService}=require('../rtcService');await rtcService.initialize();
 const method=kind==='video'?mockEngine.muteLocalVideoStream:mockEngine.muteLocalAudioStream;
 method.mockReturnValueOnce(-1);
 const change=()=>kind==='video'?rtcService.setCameraEnabled(false):rtcService.setMicrophoneMuted(true);
 await expect(change()).rejects.toThrow('publishing');await expect(change()).resolves.toBeUndefined();
 rtcService.destroy();
});
