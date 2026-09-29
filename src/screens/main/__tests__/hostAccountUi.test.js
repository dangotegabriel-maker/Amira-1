let mockAuthenticatedSession;
const mockNewSession=()=>{const token={isCurrent:()=>mockAuthenticatedSession===token};mockAuthenticatedSession=token;};
import React from 'react';
import {act,fireEvent,render} from '@testing-library/react-native';
let mockUser,mockEarningsListener,mockEarningsError;
const mockStop=jest.fn(),mockSubscribe=jest.fn((value,error)=>{mockEarningsListener=value;mockEarningsError=error;return mockStop;});
const mockDiscovery={getFollowingConsumers:jest.fn(),getFollowingHosts:jest.fn()};
const mockUnfollow=jest.fn();
jest.mock('../../../context/UserContext',()=>({useUser:()=>({authenticatedSession:mockAuthenticatedSession,user:mockUser})}));
jest.mock('../../../services/hostEarningsService',()=>({hostEarningsService:{subscribe:mockSubscribe}}));
jest.mock('../../../services/discoveryService',()=>({discoveryService:mockDiscovery}));
jest.mock('../../../services/followService',()=>({followService:{unfollowHost:mockUnfollow}}));
jest.mock('@react-navigation/native',()=>({useIsFocused:()=>true,useFocusEffect:callback=>require('react').useEffect(callback,[callback])}));
jest.mock('lucide-react-native',()=>Object.fromEntries(['MessageCircle','Search','UserMinus','Camera','CheckCircle2','ChevronLeft','ChevronRight','ImagePlus','Video','X'].map(key=>[key,()=>null])));
jest.mock('expo-image-picker',()=>({}));
jest.mock('../../../services/mediaService',()=>({mediaService:{}}));
jest.mock('../../../services/hostApplicationService',()=>({hostApplicationService:{getApplication:async()=>({status:'pending'})}}));
jest.mock('../../../services/firebaseService',()=>({dbService:{}}));
const Earnings=require('../../host/HostEarningsScreen').default,Following=require('../FollowingScreen').default;
const flush=async()=>act(async()=>{for(let i=0;i<8;i++)await Promise.resolve();});
beforeEach(()=>{mockNewSession();jest.clearAllMocks();mockUser={uid:'h',role:'host',hostStatus:{isApproved:true},earnings:{available:999,currency:'GHS'}};mockDiscovery.getFollowingConsumers.mockResolvedValue([{uid:'c',username:'Real Consumer',countryName:'Ghana',role:'consumer'}]);mockDiscovery.getFollowingHosts.mockResolvedValue([{uid:'h2',username:'Real Host',countryName:'Ghana',role:'host',hostStatus:{isApproved:true,availability:'online'}}]);});
test('Earnings shows only authoritative pending credit equivalent and unsubscribes',async()=>{
 const screen=render(<Earnings/>);expect(screen.getByLabelText('Loading earnings')).toBeTruthy();
 await act(async()=>mockEarningsListener({pendingCreditsEquivalent:12.5}));
 expect(screen.getByText('12.5 credit equivalent')).toBeTruthy();expect(screen.getByText('Pending Earnings')).toBeTruthy();
 for(const text of ['GHS 999','Available balance','Withdraw','Lifetime Earnings'])expect(screen.queryByText(text)).toBeNull();
 expect(screen.getByText('Internal accounting only. Cash conversion and withdrawals are not available.')).toBeTruthy();screen.unmount();expect(mockStop).toHaveBeenCalledTimes(1);
});
test.each(['consumer','pending'])('%s cannot subscribe to Host earnings',async(state)=>{
 mockUser={uid:'p',role:state==='pending'?'host':'consumer',hostStatus:{isApproved:false}};
 const screen=render(<Earnings/>);expect(screen.toJSON()).toBeNull();expect(mockSubscribe).not.toHaveBeenCalled();screen.unmount();
});
test('earnings errors never invent a zero balance and retry resubscribes',async()=>{
 const screen=render(<Earnings/>);await act(async()=>mockEarningsError(new Error('denied')));
 expect(screen.getByText('Unable to load earnings.')).toBeTruthy();expect(screen.queryByText('0 credit equivalent')).toBeNull();fireEvent.press(screen.getByText('Try again'));expect(mockSubscribe).toHaveBeenCalledTimes(2);screen.unmount();
});
test('Host Following uses real followed Consumer discovery',async()=>{
 const screen=render(<Following navigation={{navigate:jest.fn()}}/>);await flush();expect(mockDiscovery.getFollowingConsumers).toHaveBeenCalledWith('h');expect(mockDiscovery.getFollowingHosts).not.toHaveBeenCalled();expect(screen.getByText('Real Consumer')).toBeTruthy();expect(screen.queryByText('Real Host')).toBeNull();
 fireEvent.press(screen.getByText('Unfollow'));await flush();expect(mockUnfollow).toHaveBeenCalledWith('c',expect.any(Function));expect(screen.getByText('You are not following any consumers yet.')).toBeTruthy();screen.unmount();
});
test.each(['consumer','pending'])('%s Following resolves followed Hosts',async(state)=>{
 mockUser={uid:'p',role:state==='pending'?'host':'consumer',hostStatus:{isApproved:false}};
 const screen=render(<Following navigation={{navigate:jest.fn()}}/>);await flush();expect(mockDiscovery.getFollowingHosts).toHaveBeenCalledTimes(1);expect(mockDiscovery.getFollowingConsumers).not.toHaveBeenCalled();expect(screen.getByText('Real Host')).toBeTruthy();screen.unmount();
});


test('pending application screen is read-only and keeps Consumer experience',async()=>{
 mockUser={uid:'p',role:'host',hostStatus:{isApproved:false,verificationStatus:'pending'}};
 const Application=require('../../host/HostApplicationScreen').default;
 const screen=render(<Application navigation={{goBack:jest.fn()}}/>);await flush();
 expect(screen.getByText('Application Under Review')).toBeTruthy();expect(screen.getByText('Your application is waiting for review. You can continue using Amira as a Consumer.')).toBeTruthy();expect(screen.queryByText('Submit for Review')).toBeNull();screen.unmount();
});


test('obsolete earnings snapshot/error cannot alter replacement same-UID screen',async()=>{
 const screen=render(<Earnings/>);const oldValue=mockEarningsListener,oldError=mockEarningsError;mockNewSession();screen.rerender(<Earnings/>);
 act(()=>{mockEarningsListener({pendingCreditsEquivalent:7});oldValue({pendingCreditsEquivalent:999});oldError(new Error('old'));});expect(screen.getByText('7 credit equivalent')).toBeTruthy();expect(screen.queryByText('999 credit equivalent')).toBeNull();expect(screen.queryByText('Unable to load earnings.')).toBeNull();expect(mockStop).toHaveBeenCalledTimes(1);
});
test('Following ignores late load after same-UID replacement',async()=>{
 let resolve;mockDiscovery.getFollowingConsumers.mockReturnValueOnce(new Promise(done=>{resolve=done;}));const screen=render(<Following navigation={{navigate:jest.fn()}}/>);mockNewSession();screen.rerender(<Following navigation={{navigate:jest.fn()}}/>);await flush();await act(async()=>resolve([{uid:'stale',username:'Obsolete person'}]));expect(screen.queryByText('Obsolete person')).toBeNull();expect(screen.getByText('Real Consumer')).toBeTruthy();
});
