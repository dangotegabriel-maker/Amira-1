import {AppState} from 'react-native';
let mockFocused=true;
let mockAuthenticatedSession;
const mockNewSession=()=>{const token={isCurrent:()=>mockAuthenticatedSession===token};mockAuthenticatedSession=token;};
jest.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({bottom:24})}));
import React from 'react';
import {Alert} from 'react-native';
import {act,fireEvent,render} from '@testing-library/react-native';
jest.setTimeout(30000);
let mockUser;
const mockDiscovery={getApprovedHosts:jest.fn(),getNewHosts:jest.fn(),getFollowingHosts:jest.fn(),getBestMatch:(pool,_user,seen=[])=>pool.filter(host=>!seen.includes(host.uid)).sort((a,b)=>(b.hostStatus.availability==='online')-(a.hostStatus.availability==='online'))[0]||null};
const mockProfile={get:jest.fn(),setLiked:jest.fn(),hide:jest.fn()},mockCall=jest.fn(),mockFollow={isFollowing:async()=>false,subscribeRelationship:(_id,callback)=>{callback({following:true,followedBy:true,label:'Friends',blocked:false});return()=>{};},follow:jest.fn(),unfollow:jest.fn(),unfollowHost:jest.fn()};
jest.mock('../../../context/UserContext',()=>({useUser:()=>({authenticatedSession:mockAuthenticatedSession,user:mockUser})}));
jest.mock('@react-navigation/native',()=>({useIsFocused:()=>mockFocused,useFocusEffect:callback=>require('react').useEffect(()=>mockFocused?callback():undefined,[callback,mockFocused])}));
jest.mock('../../../services/discoveryService',()=>({discoveryService:mockDiscovery}));
jest.mock('../../../services/hostActivityService',()=>({hostActivityService:{}}));
jest.mock('../../../services/hostProfileService',()=>({hostProfileService:mockProfile}));
jest.mock('../../../services/callNavigationService',()=>({startVideoCall:mockCall}));
jest.mock('../../../services/quickMatchService',()=>({quickMatchService:{requestId:jest.fn(()=>"qm_test_request"),start:jest.fn(),cancel:jest.fn(),state:jest.fn()}}));
jest.mock('../../../services/sponsoredInviteService',()=>({sponsoredInviteService:{pending:jest.fn(async()=>({invites:[]})),send:jest.fn(),respond:jest.fn()}}));
jest.mock('../../../services/firebaseService',()=>({dbService:{}}));
jest.mock('../../../services/followService',()=>({canFollowProfile:()=>true,followService:mockFollow}));
jest.mock('../../../services/blockService',()=>({blockService:{getRelationship:async()=>({blocked:false}),block:async()=>{}}}));
jest.mock('../../../services/profileViewService',()=>({profileViewService:{track:async()=>{}}}));
jest.mock('../../../services/reportService',()=>({reportService:{}}));
jest.mock('../../../services/levelService',()=>({levelService:{}}));
jest.mock('../../../services/callReviewService',()=>({callReviewService:{subscribeReputation:()=>()=>{}}}));
jest.mock('../../../components/ReportUserModal',()=>()=>null);
jest.mock('../../../components/GiftTray',()=>()=>null);
jest.mock('../../../services/giftService',()=>({giftService:{publicHostGifts:async()=>({gifts:[]})}}));
jest.mock('expo-video',()=>({VideoView:()=>null,useVideoPlayer:()=>({})}));
const Home=require('../HomeScreen').default,Match=require('../MatchScreen').default,Profile=require('../UserProfileScreen').default;
const {setSessionDiscoveryFilters,EMPTY_DISCOVERY_FILTERS}=require('../../../hooks/useDiscoveryFilters');
const host=(uid,availability='online')=>({uid,username:uid,role:'host',age:25,countryCode:'GH',languages:['English'],hostStatus:{isApproved:true,availability},hostProfile:{videoRateCredits:37,interests:[],gallery:[]},social:{liked:false,following:false,followers:2,followingCount:1,likes:0}});
const flush=async()=>act(async()=>{for(let i=0;i<20;i++)await Promise.resolve();});
beforeEach(()=>{mockFocused=true;mockNewSession();jest.clearAllMocks();mockUser={uid:'consumer',role:'consumer',hostStatus:{isApproved:false}};setSessionDiscoveryFilters(mockUser.uid,EMPTY_DISCOVERY_FILTERS);mockDiscovery.getApprovedHosts.mockResolvedValue([host('online'),host('offline','offline')]);mockDiscovery.getNewHosts.mockResolvedValue([]);mockDiscovery.getFollowingHosts.mockResolvedValue([]);mockProfile.get.mockResolvedValue(host('h'));jest.spyOn(Alert,'alert').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());
test('Home tabs exactly For You/New/Following, no Search or fake Stories; filters survive tabs and Match and clear',async()=>{const nav={navigate:jest.fn()},screen=render(<Home navigation={nav}/>);await flush();for(const tab of ['FOR YOU','NEW','FOLLOWING'])expect(screen.getByText(tab)).toBeTruthy();expect(screen.queryByText(/Search/i)).toBeNull();expect(screen.queryByText('Stories')).toBeNull();act(()=>setSessionDiscoveryFilters('consumer',{...EMPTY_DISCOVERY_FILTERS,country:{cca2:'US'}}));expect(screen.queryByText('online')).toBeNull();fireEvent.press(screen.getByText('NEW'));await flush();expect(screen.getByText('No hosts were approved in the last 14 days.')).toBeTruthy();fireEvent.press(screen.getByText('FOLLOWING'));await flush();expect(screen.getByText('Follow approved hosts to browse them here.')).toBeTruthy();screen.unmount();const match=render(<Match navigation={nav}/>);await flush();expect(match.getByText('No eligible Hosts right now')).toBeTruthy();match.unmount();const home=render(<Home navigation={nav}/>);await flush();fireEvent.press(home.getByText('Clear filters'));expect(home.getByText('online')).toBeTruthy();home.unmount();});
test('normal Match Next is unlimited without repeats before exhaustion; Message and Video use existing paths',async()=>{const nav={navigate:jest.fn()},screen=render(<Match navigation={nav}/>);await flush();expect(screen.getByText('online')).toBeTruthy();fireEvent.press(screen.getByText('Message'));expect(nav.navigate).toHaveBeenCalledWith('ChatDetail',{userId:'online',name:'online'});fireEvent.press(screen.getByText('Video'));expect(mockCall).toHaveBeenCalledWith({navigation:nav,isCurrent:expect.any(Function),creator:expect.objectContaining({uid:'online'})});fireEvent.press(screen.getByText('Next Match'));expect(screen.getByText('offline')).toBeTruthy();fireEvent.press(screen.getByText('Next Match'));expect(screen.getByText('online')).toBeTruthy();for(let i=0;i<12;i++)fireEvent.press(screen.getByText('Next Match'));expect(mockDiscovery.getApprovedHosts).toHaveBeenCalledTimes(1);screen.unmount();});
test('Match error has retry; no successful fake match',async()=>{mockDiscovery.getApprovedHosts.mockRejectedValue(new Error('offline'));const screen=render(<Match navigation={{}}/>);await flush();expect(screen.getByText('Matches could not be loaded. Try again.')).toBeTruthy();expect(screen.getByText('Try Again')).toBeTruthy();expect(screen.queryByText('Next Match')).toBeNull();screen.unmount();});
test('full Host profile has real counts, mutual Friends, sticky actions, safe Gift and More without Share; Like/unlike refresh real counts',async()=>{const nav={navigate:jest.fn(),goBack:jest.fn()},screen=render(<Profile route={{params:{userId:'h'}}} navigation={nav}/>);await flush();expect(screen.getByText('Friends')).toBeTruthy();expect(screen.getByText('Followers')).toBeTruthy();expect(screen.getByText('Likes')).toBeTruthy();for(const text of ['Interests','Moments','Gifts','Share'])expect(screen.queryByText(text)).toBeNull();expect(screen.getByText('37 Credits/min')).toBeTruthy();expect(screen.getByText('Gift')).toBeTruthy();mockProfile.setLiked.mockResolvedValue({liked:true});mockProfile.get.mockResolvedValue({...host('h'),social:{...host('h').social,liked:true,likes:1}});fireEvent.press(screen.getByLabelText('Like Host'));await flush();expect(mockProfile.setLiked).toHaveBeenCalledWith('h',true);expect(screen.getByLabelText('Unlike Host')).toBeTruthy();mockProfile.setLiked.mockResolvedValue({liked:false});mockProfile.get.mockResolvedValue(host('h'));fireEvent.press(screen.getByLabelText('Unlike Host'));await flush();expect(mockProfile.setLiked).toHaveBeenCalledWith('h',false);fireEvent.press(screen.getByLabelText('More'));for(const text of ['Report','Block','Not Interested'])expect(screen.getByText(text)).toBeTruthy();expect(screen.queryByText('Share')).toBeNull();fireEvent.press(screen.getByText('Not Interested'));await flush();expect(mockProfile.hide).toHaveBeenCalledWith('h');expect(nav.goBack).toHaveBeenCalled();screen.unmount();});

test('failed social refresh displays unavailable rather than fabricated zero; counters are non-tappable',async()=>{const screen=render(<Profile route={{params:{userId:'h'}}} navigation={{}}/>);await flush();expect(screen.getByText('Followers').parent.props.onPress).toBeUndefined();mockProfile.setLiked.mockResolvedValue({liked:true});mockProfile.get.mockRejectedValue(new Error('network'));fireEvent.press(screen.getByLabelText('Like Host'));await flush();expect(screen.getAllByText('Unavailable')).toHaveLength(3);expect(screen.getByLabelText('Unlike Host')).toBeTruthy();screen.unmount();});


test('old profile action cannot navigate or alert after target/session replacement',async()=>{
 let resolve;mockProfile.hide.mockReturnValueOnce(new Promise(done=>{resolve=done;}));const nav={navigate:jest.fn(),goBack:jest.fn()},screen=render(<Profile route={{params:{userId:'h'}}} navigation={nav}/>);await flush();fireEvent.press(screen.getByLabelText('More'));act(()=>{fireEvent.press(screen.getByText('Not Interested'));});mockNewSession();screen.rerender(<Profile route={{params:{userId:'h2'}}} navigation={nav}/>);await act(async()=>resolve({}));expect(nav.goBack).not.toHaveBeenCalled();expect(Alert.alert).not.toHaveBeenCalled();
});


test('Consumer request poll survives leaving Match, serializes slow polls and navigates once',async()=>{
 jest.useFakeTimers();AppState.currentState='active';const service=require('../../../services/quickMatchService').quickMatchService;
 service.start.mockResolvedValue({requestId:'q',status:'offering'});let resolve;service.state.mockReturnValue(new Promise(done=>{resolve=done;}));
 const nav={navigate:jest.fn()},screen=render(<Match navigation={nav}/>);await flush();await act(async()=>{fireEvent.press(screen.getByText('Start Quick Match'));fireEvent.press(screen.getByText('Start Quick Match'));});expect(service.start).toHaveBeenCalledTimes(1);
 mockFocused=false;screen.rerender(<Match navigation={nav}/>);await act(async()=>jest.advanceTimersByTime(9000));expect(service.state).toHaveBeenCalledTimes(1);
 await act(async()=>resolve({requestId:'q',status:'connecting',callId:'call',host:{uid:'h'}}));await act(async()=>jest.advanceTimersByTime(6000));expect(nav.navigate).toHaveBeenCalledTimes(1);screen.unmount();jest.useRealTimers();
});
test('Consumer Quick Match start completion from obsolete same-UID session cannot navigate',async()=>{
 const service=require('../../../services/quickMatchService').quickMatchService;let resolve;service.start.mockReturnValueOnce(new Promise(done=>{resolve=done;}));const nav={navigate:jest.fn()},screen=render(<Match navigation={nav}/>);await flush();act(()=>{fireEvent.press(screen.getByText('Start Quick Match'));});mockNewSession();await act(async()=>resolve({status:'connecting',callId:'old',host:{uid:'old-host'}}));expect(nav.navigate).not.toHaveBeenCalled();screen.unmount();
});
test('Sponsored invite response cannot navigate after Home unmount',async()=>{
 const service=require('../../../services/sponsoredInviteService').sponsoredInviteService;service.pending.mockResolvedValueOnce({invites:[{inviteId:'invite',hostIdentity:{username:'Inviting Host'},sponsoredSeconds:30,consumerRatePerMinute:25}]});let resolve;service.respond.mockReturnValueOnce(new Promise(done=>{resolve=done;}));const nav={navigate:jest.fn()},screen=render(<Home navigation={nav}/>);await flush();act(()=>{fireEvent.press(screen.getByText('Accept'));});screen.unmount();await act(async()=>resolve({status:'connecting',callId:'old'}));expect(nav.navigate).not.toHaveBeenCalled();
});


test('same-frame Like and Follow mutations share a relationship lock and release on failure',async()=>{
 let reject;mockProfile.setLiked.mockReturnValueOnce(new Promise((_done,fail)=>{reject=fail;}));
 const screen=render(<Profile route={{params:{userId:'h'}}} navigation={{}}/>);await flush();
 act(()=>{fireEvent.press(screen.getByLabelText('Like Host'));fireEvent.press(screen.getByLabelText('Like Host'));fireEvent.press(screen.getByText('Friends'));});
 expect(mockProfile.setLiked).toHaveBeenCalledTimes(1);expect(mockFollow.unfollow).not.toHaveBeenCalled();
 await act(async()=>reject(new Error('offline')));
 await act(async()=>fireEvent.press(screen.getByText('Friends')));expect(mockFollow.follow).toHaveBeenCalledTimes(1);
});

test('Like completion from an old target cannot change a new profile',async()=>{
 let resolve;mockProfile.setLiked.mockReturnValueOnce(new Promise(done=>{resolve=done;}));
 const screen=render(<Profile route={{params:{userId:'h'}}} navigation={{}}/>);await flush();
 act(()=>{fireEvent.press(screen.getByLabelText('Like Host'));});
 mockProfile.get.mockResolvedValue(host('other'));screen.rerender(<Profile route={{params:{userId:'other'}}} navigation={{}}/>);await flush();
 await act(async()=>resolve({liked:true}));expect(screen.getByLabelText('Like Host')).toBeTruthy();expect(mockProfile.setLiked).toHaveBeenCalledWith('h',true);
});

test('Quick Match retry reuses request identity after an uncertain result',async()=>{
 const service=require('../../../services/quickMatchService').quickMatchService;
 service.start.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({requestId:'qm_test_request',status:'offering'});
 const screen=render(<Match navigation={{navigate:jest.fn()}}/>);await flush();
 await act(async()=>fireEvent.press(screen.getByText('Start Quick Match')));
 await act(async()=>fireEvent.press(screen.getByText('Start Quick Match')));
 expect(service.start.mock.calls.map(args=>args[0])).toEqual(['qm_test_request','qm_test_request']);expect(service.requestId).toHaveBeenCalledTimes(1);screen.unmount();
});

test('sponsored invite response failure keeps the same invitation retryable',async()=>{
 const service=require('../../../services/sponsoredInviteService').sponsoredInviteService;
 service.pending.mockResolvedValueOnce({invites:[{inviteId:'invite',hostIdentity:{username:'Host'},sponsoredSeconds:30,consumerRatePerMinute:25,termsFingerprint:'terms'}]});
 service.respond.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({status:'connecting',callId:'call'});
 const navigation={navigate:jest.fn()},screen=render(<Home navigation={navigation}/>);await flush();
 await act(async()=>fireEvent.press(screen.getByText('Accept')));expect(navigation.navigate).not.toHaveBeenCalled();expect(screen.getByText('Accept')).toBeTruthy();
 await act(async()=>fireEvent.press(screen.getByText('Accept')));expect(service.respond.mock.calls.map(args=>args[0])).toEqual(['invite','invite']);expect(navigation.navigate).toHaveBeenCalledTimes(1);
});


test('Following list serializes unfollow and keeps the row on failure',async()=>{
 const Following=require('../FollowingScreen').default;mockDiscovery.getFollowingHosts.mockResolvedValue([host('h')]);
 let reject;mockFollow.unfollowHost.mockReturnValueOnce(new Promise((_done,fail)=>{reject=fail;})).mockResolvedValueOnce(false);
 const screen=render(<Following navigation={{}}/>);await flush();
 act(()=>{fireEvent.press(screen.getByText('Unfollow'));fireEvent.press(screen.getByText('Unfollow'));});expect(mockFollow.unfollowHost).toHaveBeenCalledTimes(1);
 await act(async()=>reject(new Error('offline')));expect(screen.getByText('Unfollow')).toBeTruthy();expect(Alert.alert).toHaveBeenLastCalledWith('Unable to unfollow','Please try again.');
 await act(async()=>fireEvent.press(screen.getByText('Unfollow')));expect(mockFollow.unfollowHost).toHaveBeenCalledTimes(2);expect(screen.queryByText('Unfollow')).toBeNull();
});
