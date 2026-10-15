import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
const mockRead = jest.fn(), mockSave = jest.fn(), mockSubmit = jest.fn(), mockRefresh = jest.fn(), mockProfile = jest.fn();
const mockUpload = jest.fn(), mockDelete = jest.fn(), mockPermission = jest.fn(), mockPicker = jest.fn();
let mockSession;
jest.mock('../../../context/UserContext', () => ({ useUser: () => ({ authenticatedSession: mockSession, user: { uid: 'consumer', dob: '1990-01-01', hostStatus: { isApproved: false } }, refreshUser: mockRefresh }) }));
jest.mock('../../../services/hostApplicationService', () => ({ hostApplicationService: { getApplication: mockRead, saveDraft: mockSave, submit: mockSubmit } }));
jest.mock('../../../services/firebaseService', () => ({ dbService: { updateUserProfile: mockProfile } }));
jest.mock('../../../services/mediaService', () => ({ mediaService: { uploadUserMedia: mockUpload, deleteOwnedMedia: mockDelete } }));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: mockPermission, launchImageLibraryAsync: mockPicker, MediaTypeOptions: { Images: 'images' } }));
jest.mock('lucide-react-native', () => Object.fromEntries(['Camera','CheckCircle2','ChevronLeft','ChevronRight','ImagePlus','Video','X'].map(name => [name, () => null])));
// Mocked UI path only: no real Storage operation or project flag is enabled.
const previousFlag = process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS;
process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS = 'true';
const Application = require('../HostApplicationScreen').default;
afterAll(() => { if (previousFlag === undefined) delete process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS; else process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS = previousFlag; });
const draft = () => ({ status: 'in_progress', details: { bio: 'A complete creator biography for testing' }, media: { profilePhoto: { url: 'https://example.com/photo', path: 'users/consumer/old' }, gallery: [], introVideo: { url: 'https://example.com/video' } }, verification: { evidence: Array.from({ length: 5 }, (_, order) => ({ order, path: `users/consumer/${order}` })) }, payoutSetup: { method: 'Mobile Money' } });
beforeEach(() => { jest.clearAllMocks(); mockPermission.mockResolvedValue({granted:true});mockPicker.mockResolvedValue({canceled:false,assets:[{uri:'test-local-file'}]});const token = { isCurrent: () => mockSession === token }; mockSession = token; mockRead.mockResolvedValue(draft()); mockSave.mockResolvedValue(undefined); mockSubmit.mockResolvedValue({ success: true }); mockRefresh.mockResolvedValue(undefined); mockDelete.mockResolvedValue(undefined); mockUpload.mockResolvedValue({ url: 'https://example.com/new', path: 'users/consumer/new' }); jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());
const openAt = async steps => {
  const screen = render(<Application navigation={{ goBack: jest.fn() }} />); await act(async () => {});
  for (let i = 0; i < steps; i++) await act(async () => fireEvent.press(screen.getByText('Continue')));
  return screen;
};
test('Creator interests use the established vocabulary, allow all ten, and can be cleared', async () => {
  mockRead.mockResolvedValueOnce({...draft(),details:{...draft().details,interests:['music','unapproved text','Music']}});
  const screen = await openAt(1);
  expect(screen.getByText('Interests (1/10)')).toBeTruthy();
  const {INTERESTS} = require('../../../../functions/src/hostDiscoveryDomain');
  for (const interest of INTERESTS.filter(value => value !== 'Music')) fireEvent.press(screen.getByLabelText(interest));
  expect(screen.getByText('Interests (10/10)')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText('Continue')));
  expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({details:expect.objectContaining({interests:INTERESTS})}),expect.objectContaining({isCurrent:expect.any(Function)}));
  screen.unmount();
  const empty = await openAt(1);
  fireEvent.press(empty.getByLabelText('Music')); fireEvent.press(empty.getByLabelText('Music'));
  await act(async () => fireEvent.press(empty.getByText('Continue')));
  expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({details:expect.objectContaining({interests:[]})}),expect.objectContaining({isCurrent:expect.any(Function)}));
});
test.each(['draft response', 'profile mirror'])('failed %s never deletes media that may already be referenced by an authoritative draft', async failure => {
  const screen = await openAt(2);
  if (failure === 'draft response') mockSave.mockRejectedValueOnce(new Error('response lost'));
  else mockProfile.mockRejectedValueOnce(new Error('profile mirror failed'));
  await act(async () => fireEvent.press(screen.getByText('Replace main photo')));
  expect(mockUpload).toHaveBeenCalledTimes(1); expect(mockSave).toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith(failure === 'draft response' ? 'Application update not confirmed' : 'Application photo saved', expect.any(String));
  if(failure==='draft response'){expect(screen.getByText('Application could not be loaded.')).toBeTruthy();expect(screen.queryByText('Continue')).toBeNull();}
});
test('confirmed application submission is single-flight and remains submitted when profile refresh fails', async () => {
  const screen = await openAt(6); mockRefresh.mockRejectedValueOnce(new Error('offline'));
  let resolve; mockSubmit.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const send = screen.UNSAFE_getAllByType(TouchableOpacity).find(node => node.props.onPress?.name === 'submit').props.onPress;
  act(() => { send(); send(); }); expect(mockSubmit).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ success: true }));
  expect(screen.getByText('Application Under Review')).toBeTruthy();
  expect(Alert.alert).toHaveBeenLastCalledWith('Application submitted', expect.stringContaining('Profile refresh'));
  expect(mockProfile).not.toHaveBeenCalled();
});
test('session invalidation after submission dispatch suppresses continuation without compensation', async () => {
  const screen = await openAt(6); let resolve; mockSubmit.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  act(() => { fireEvent.press(screen.getByText('Submit for Review')); });
  mockSession = null; screen.unmount(); await act(async () => resolve({ success: true }));
  expect(mockSubmit).toHaveBeenCalledTimes(1); expect(mockRefresh).not.toHaveBeenCalled(); expect(mockDelete).not.toHaveBeenCalled(); expect(Alert.alert).not.toHaveBeenCalled();
});


test.each(['cancel','permission denied'])('Creator picker %s releases the action for retry without a metadata write',async kind=>{
 const screen=await openAt(2);mockSave.mockClear();
 if(kind==='cancel')mockPicker.mockResolvedValueOnce({canceled:true});else mockPermission.mockResolvedValueOnce({granted:false});
 await act(async()=>fireEvent.press(screen.getByText('Replace main photo')));
 expect(mockUpload).not.toHaveBeenCalled();expect(mockSave).not.toHaveBeenCalled();
 if(kind==='cancel')expect(Alert.alert).not.toHaveBeenCalled();
 await act(async()=>fireEvent.press(screen.getByText('Replace main photo')));
 expect(mockUpload).toHaveBeenCalledTimes(1);expect(mockSave).toHaveBeenCalledTimes(1);
});

test('confirmed draft photo remains selected when profile mirror fails',async()=>{
 const screen=await openAt(2);mockProfile.mockRejectedValueOnce(new Error('offline'));
 await act(async()=>fireEvent.press(screen.getByText('Replace main photo')));
 mockSave.mockClear();await act(async()=>fireEvent.press(screen.getByText('Continue')));
 expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({media:expect.objectContaining({profilePhoto:expect.objectContaining({path:'users/consumer/new'})})}),expect.objectContaining({isCurrent:expect.any(Function)}));
 expect(mockDelete).not.toHaveBeenCalled();
});


test('confirmed replacement deletes the previous photo only after draft and profile acknowledgements',async()=>{
 const screen=await openAt(2);let draftDone,profileDone;
 mockSave.mockReturnValueOnce(new Promise(resolve=>{draftDone=resolve;}));
 mockProfile.mockReturnValueOnce(new Promise(resolve=>{profileDone=resolve;}));
 act(()=>{fireEvent.press(screen.getByText('Replace main photo'));});await act(async()=>{});
 expect(mockDelete).not.toHaveBeenCalled();expect(mockProfile).not.toHaveBeenCalled();
 await act(async()=>draftDone());expect(mockDelete).not.toHaveBeenCalled();
 await act(async()=>profileDone());
 expect(mockDelete).toHaveBeenCalledWith('users/consumer/old',{isCurrent:expect.any(Function)});
 const guard=mockDelete.mock.calls[0][1].isCurrent;expect(guard()).toBe(true);mockSession=null;expect(guard()).toBe(false);
});
test('replacement session after acknowledged draft suppresses profile write and deletion',async()=>{
 const screen=await openAt(2);let done;mockSave.mockReturnValueOnce(new Promise(resolve=>{done=resolve;}));
 act(()=>{fireEvent.press(screen.getByText('Replace main photo'));});await act(async()=>{});
 mockSession=null;await act(async()=>done());
 expect(mockProfile).not.toHaveBeenCalled();expect(mockDelete).not.toHaveBeenCalled();
});
test('uncertain step save blocks editing until authoritative draft reload succeeds',async()=>{
 const screen=await openAt(3);mockSave.mockRejectedValueOnce(new Error('ack lost'));
 await act(async()=>fireEvent.press(screen.getByText('Continue')));
 expect(screen.getByText('Application could not be loaded.')).toBeTruthy();expect(mockDelete).not.toHaveBeenCalled();
 mockRead.mockRejectedValueOnce(new Error('offline'));
 await act(async()=>fireEvent.press(screen.getByText('Try again')));
 expect(screen.getByText('Application could not be loaded.')).toBeTruthy();
 expect(mockRead).toHaveBeenLastCalledWith({requireServer:true,isCurrent:expect.any(Function)});
 mockRead.mockResolvedValueOnce({...draft(),status:'submitted'});
 await act(async()=>fireEvent.press(screen.getByText('Try again')));
 expect(screen.getByText('Application Under Review')).toBeTruthy();expect(mockDelete).not.toHaveBeenCalled();
});

test('authoritative approved application does not expose draft editing while profile hydration lags',async()=>{
 mockRead.mockResolvedValueOnce({...draft(),status:'approved'});
 const screen=await openAt(0);
 expect(screen.getByText('Approved Host')).toBeTruthy();expect(screen.queryByText('Continue')).toBeNull();
 expect(mockSave).not.toHaveBeenCalled();expect(mockUpload).not.toHaveBeenCalled();
});
