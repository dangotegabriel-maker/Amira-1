import React from 'react';
import {Alert,TouchableOpacity} from 'react-native';
import {act,fireEvent,render} from '@testing-library/react-native';
const mockUpload=jest.fn(),mockSave=jest.fn(async()=>{}),mockSubmit=jest.fn();
const mockSession={isCurrent:()=>true};
jest.mock('../../../context/UserContext',()=>({useUser:()=>({authenticatedSession:mockSession,user:{uid:'consumer',dob:'1990-01-01',hostStatus:{isApproved:false}}})}));
jest.mock('../../../services/hostApplicationService',()=>({hostApplicationService:{getApplication:async()=>({status:'in_progress',details:{bio:'A complete biography for the application'}}),saveDraft:mockSave,submit:mockSubmit}}));
jest.mock('../../../services/mediaService',()=>({mediaService:{uploadUserMedia:mockUpload}}));
jest.mock('../../../services/firebaseService',()=>({dbService:{}}));
jest.mock('expo-image-picker',()=>({}));
jest.mock('lucide-react-native',()=>Object.fromEntries(['Camera','CheckCircle2','ChevronLeft','ChevronRight','ImagePlus','Video','X'].map(name=>[name,()=>null])));
const previousFlag=process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS,previousDev=global.__DEV__;
process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS='false';global.__DEV__=false;
const Application=require('../HostApplicationScreen').default;
afterAll(()=>{global.__DEV__=previousDev;if(previousFlag===undefined)delete process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS;else process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS=previousFlag;});
test('production build with Storage disabled shows unavailable and cannot fake or bypass required media',async()=>{
 const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 try {
  const screen=render(<Application navigation={{goBack:jest.fn()}}/>);await act(async()=>{});
  for(let step=0;step<2;step++)await act(async()=>{fireEvent.press(screen.getByText('Continue'));});
  expect(screen.getByText('Media uploads unavailable')).toBeTruthy();
  expect(screen.UNSAFE_getAllByType(TouchableOpacity).find(node=>node.props.onPress?.name==='uploadMainPhoto').props.disabled).toBe(true);
  fireEvent.press(screen.getByText('Choose main photo'));
  await act(async()=>{fireEvent.press(screen.getByText('Continue'));});
  expect(alert).toHaveBeenCalledWith('Complete this step','A main profile photo is required.');
  expect(mockUpload).not.toHaveBeenCalled();expect(mockSubmit).not.toHaveBeenCalled();
  expect(mockSave.mock.calls.every(([patch])=>!patch.media)).toBe(true);
 } finally {alert.mockRestore();}
});
