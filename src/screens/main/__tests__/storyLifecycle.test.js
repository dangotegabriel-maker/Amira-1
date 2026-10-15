import React from 'react';
import { AppState } from 'react-native';
import { act, render } from '@testing-library/react-native';

let mockFocused = true;
const mockPlayer = { play: jest.fn(), pause: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('../../../navigation/routeSafety', () => ({ withRouteSafety: (_name, Screen) => Screen, backOrMain: jest.fn() }));
jest.mock('expo-video', () => ({ VideoView: () => null, useVideoPlayer: () => mockPlayer }));
jest.mock('expo-image', () => ({ Image: () => null }));
const Story = require('../StoryViewerScreen').default;
const route = { params: { stories: [{ uri: 'https://example.test/story.mp4', type: 'video', visibility: 'public', expiresAtMs: Date.now() + 60000 }] } };

afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
test('video pauses on background, blur and unmount; foreground cannot resume a hidden Story', () => {
  mockFocused = true; AppState.currentState = 'active'; jest.clearAllMocks();
  const callbacks = new Set();
  const change = state => callbacks.forEach(callback => callback(state));
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => { callbacks.add(callback); return { remove: () => { callbacks.delete(callback); remove(); } }; });
  const screen = render(<Story route={route} navigation={{}} />);
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  act(() => change('background'));
  expect(mockPlayer.pause).toHaveBeenCalled();
  mockFocused = false; screen.rerender(<Story route={route} navigation={{}} />);
  mockPlayer.play.mockClear(); act(() => change('active'));
  expect(mockPlayer.play).not.toHaveBeenCalled();
  mockFocused = true; screen.rerender(<Story route={route} navigation={{}} />);
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  mockPlayer.pause.mockClear(); screen.unmount();
  expect(mockPlayer.pause).toHaveBeenCalled(); expect(remove).toHaveBeenCalledTimes(2);
});

test('mounting in background never starts playback', () => {
  mockFocused = true; AppState.currentState = 'background'; jest.clearAllMocks();
  const screen = render(<Story route={route} navigation={{}} />);
  expect(mockPlayer.play).not.toHaveBeenCalled(); screen.unmount();
});


test('expired or undated Story routes never play and a live Story stops at authoritative expiry', () => {
 jest.useFakeTimers(); mockFocused=true;AppState.currentState='active';jest.clearAllMocks();
 const story={uri:'https://example.test/story.mp4',type:'video',visibility:'public',expiresAtMs:Date.now()+1000};
 const screen=render(<Story route={{params:{stories:[story]}}} navigation={{}}/>);
 expect(mockPlayer.play).toHaveBeenCalledTimes(1);
 act(()=>jest.advanceTimersByTime(1000));
 expect(screen.getByText('No story available')).toBeTruthy();expect(mockPlayer.pause).toHaveBeenCalled();
 screen.unmount();mockPlayer.play.mockClear();
 const old=render(<Story route={{params:{stories:[story]}}} navigation={{}}/>);
 expect(old.getByText('No story available')).toBeTruthy();expect(mockPlayer.play).not.toHaveBeenCalled();old.unmount();
 const undated=render(<Story route={{params:{stories:[{...story,expiresAtMs:undefined}]}}} navigation={{}}/>);
 expect(undated.getByText('No story available')).toBeTruthy();expect(mockPlayer.play).not.toHaveBeenCalled();undated.unmount();
});

test('foreground resume rechecks Story expiration when background timers did not run', () => {
 jest.useFakeTimers();mockFocused=true;AppState.currentState='active';jest.clearAllMocks();
 const callbacks=new Set();
 jest.spyOn(AppState,'addEventListener').mockImplementation((_event,callback)=>{callbacks.add(callback);return {remove:()=>callbacks.delete(callback)};});
 const expiresAtMs=Date.now()+1000;
 const screen=render(<Story route={{params:{stories:[{uri:'https://example.test/story.mp4',type:'video',visibility:'public',expiresAtMs}]}}} navigation={{}}/>);
 act(()=>callbacks.forEach(callback=>callback('background')));
 mockPlayer.play.mockClear();jest.setSystemTime(expiresAtMs+1);
 act(()=>callbacks.forEach(callback=>callback('active')));
 expect(screen.getByText('No story available')).toBeTruthy();
 expect(mockPlayer.play).not.toHaveBeenCalled();screen.unmount();
});
