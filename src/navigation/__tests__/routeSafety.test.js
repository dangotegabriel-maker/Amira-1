import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { StackRouter, CommonActions } from '@react-navigation/routers';
import { chatRouteId, leaveCallRoute, withRouteSafety } from '../routeSafety';

let mockCurrent = true;
jest.mock('../../context/UserContext', () => ({ useUser: () => ({ user: { uid: 'consumer' } }) }));
jest.mock('../../hooks/useSessionGuard', () => ({ useSessionGuard: () => () => mockCurrent }));
beforeEach(() => { mockCurrent = true; });

test.each([
  ['ChatDetail', undefined], ['ChatDetail', { userId: 'consumer' }],
  ['ChatDetail', { userId: '../host' }], ['UserProfile', {}],
  ['VideoCall', undefined], ['VideoCall', { call: {} }],
  ['CallSummary', undefined], ['CallSummary', { duration: NaN }],
  ['GiftLedger', { type: 'invalid' }], ['StoryViewer', { stories: {} }],
  ['StoryViewer', { stories: [{ uri: 'https://example.com/private', type: 'image', visibility: 'private' }] }],
])('%s rejects unsafe params before mounting effects', (name, params) => {
  const mount = jest.fn(() => <Text>Protected screen</Text>);
  const Screen = withRouteSafety(name, mount);
  const navigation = { canGoBack: () => false, reset: jest.fn() };
  const screen = render(<Screen route={{ params }} navigation={navigation} />);
  expect(mount).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Go back'));
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'MainTabs' }] });
});

test('obsolete invalid-route exit cannot reset a replacement session', () => {
  const Screen = withRouteSafety('ChatDetail', () => null), navigation = { reset: jest.fn() };
  const screen = render(<Screen navigation={navigation} />);
  mockCurrent = false;
  fireEvent.press(screen.getByText('Go back'));
  expect(navigation.reset).not.toHaveBeenCalled();
});

const router = StackRouter({ initialRouteName: 'MainTabs' });
const options = { routeNames: ['MainTabs', 'ChatDetail', 'UserProfile', 'VideoCall', 'CallSummary'], routeParamList: {}, routeGetIdList: { ChatDetail: chatRouteId, UserProfile: chatRouteId } };
const stateFor = routes => router.getRehydratedState({ stale: true, routes, index: routes.length - 1 }, options);
test('in-call chat keeps the call mounted and repeated taps reuse the overlay', () => {
  let state = stateFor([{ name: 'MainTabs' }, { name: 'ChatDetail', params: { userId: 'host' } }, { name: 'VideoCall', params: { call: { callId: 'call-1' } } }]);
  const action = CommonActions.navigate('ChatDetail', { userId: 'host', activeCallId: 'call-1' });
  state = router.getStateForAction(state, action, options);
  expect(state.routes.map(route => route.name)).toEqual(['MainTabs', 'ChatDetail', 'VideoCall', 'ChatDetail']);
  const overlayKey = state.routes[3].key;
  state = router.getStateForAction(state, action, options);
  expect(state.routes).toHaveLength(4);
  expect(state.routes[3].key).toBe(overlayKey);
});

test('ending beneath a chat/profile overlay removes obsolete call routes and summary exits', () => {
  let state = stateFor([{ name: 'MainTabs' }, { name: 'ChatDetail', params: { userId: 'host' } }, { name: 'VideoCall' }, { name: 'ChatDetail', params: { userId: 'host', activeCallId: 'call-1' } }, { name: 'UserProfile', params: { userId: 'host' } }]);
  const navigation = { getState: () => state, reset: jest.fn(next => { state = router.getStateForAction(state, CommonActions.reset(next), options); }) };
  const callKey = state.routes[2].key;
  leaveCallRoute(navigation, callKey, { duration: 12, callId: 'call-1' });
  expect(state.routes.map(route => route.name)).toEqual(['MainTabs', 'ChatDetail', 'CallSummary']);
  expect(state.index).toBe(2);
  leaveCallRoute(navigation, callKey, { duration: 12 });
  expect(navigation.reset).toHaveBeenCalledTimes(1);
  state = router.getStateForAction(state, CommonActions.goBack(), options);
  expect(state.routes.map(route => route.name)).toEqual(['MainTabs', 'ChatDetail']);
});

test('profile to the same conversation returns to the existing chat', () => {
  const state = stateFor([{ name: 'MainTabs' }, { name: 'ChatDetail', params: { userId: 'host' } }, { name: 'UserProfile', params: { userId: 'host' } }]);
  const next = router.getStateForAction(state, CommonActions.navigate('ChatDetail', { userId: 'host' }), options);
  expect(next.routes.map(route => route.name)).toEqual(['MainTabs', 'ChatDetail']);
});

test('in-call chat to profile and back cannot pop a call started on that profile', () => {
  let state = stateFor([{ name: 'MainTabs' }, { name: 'UserProfile', params: { userId: 'host' } }, { name: 'VideoCall' }, { name: 'ChatDetail', params: { userId: 'host', activeCallId: 'call-1' } }]);
  state = router.getStateForAction(state, CommonActions.navigate('UserProfile', { userId: 'host', activeCallId: 'call-1' }), options);
  expect(state.routes.map(route => route.name)).toEqual(['MainTabs', 'UserProfile', 'VideoCall', 'ChatDetail', 'UserProfile']);
  state = router.getStateForAction(state, CommonActions.navigate('ChatDetail', { userId: 'host', activeCallId: 'call-1' }), options);
  expect(state.routes.map(route => route.name)).toEqual(['MainTabs', 'UserProfile', 'VideoCall', 'ChatDetail']);
});


jest.mock('expo-image',()=>({Image:({source})=>require('react').createElement(require('react-native').Text,null,source.uri)}));
jest.mock('expo-video',()=>({VideoView:()=>null,useVideoPlayer:()=>({})}));
jest.mock('lucide-react-native',()=>({X:()=>null}));
test('replacing the story collection resets its index and its empty state has a safe exit',()=>{
 const Story=require('../../screens/main/StoryViewerScreen').default;
 const story=id=>({id,uri:`https://example.com/${id}`,type:'image',visibility:'public'});
 const navigation={canGoBack:()=>false,reset:jest.fn()};
 const screen=render(<Story navigation={navigation} route={{params:{stories:[story('a'),story('b')]}}}/>);
 fireEvent.press(screen.UNSAFE_getAllByType(TouchableOpacity).find(node=>node.props.onPress?.name==='goNext'));
 expect(screen.getByText('https://example.com/b')).toBeTruthy();
 screen.rerender(<Story navigation={navigation} route={{params:{stories:[story('c')]}}}/>);
 expect(screen.getByText('https://example.com/c')).toBeTruthy();
 screen.rerender(<Story navigation={navigation}/>);
 expect(screen.getByText('No story available')).toBeTruthy();
 fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
 expect(navigation.reset).toHaveBeenCalledWith({index:0,routes:[{name:'MainTabs'}]});
});
