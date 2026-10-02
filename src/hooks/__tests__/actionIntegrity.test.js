import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { useActionLock } from '../useActionLock';
import { useSessionGuard } from '../useSessionGuard';

let mockSession;
jest.mock('../../context/UserContext', () => ({ useUser: () => ({ authenticatedSession: mockSession }) }));
const newSession = () => { const token = { isCurrent: () => mockSession === token }; mockSession = token; };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const Action = ({ target, dispatch, complete, failure }) => {
  const current = useSessionGuard(target), run = useActionLock(current);
  return <TouchableOpacity onPress={() => run('save', async () => {
    try { const result = await dispatch(target); if (current()) complete(result); }
    catch (error) { if (current()) failure(error); }
  })}><Text>Save</Text></TouchableOpacity>;
};
beforeEach(newSession);
test('same-frame dispatch is single-flight and a real failure releases the lock', async () => {
  const pending = deferred(), dispatch = jest.fn().mockReturnValueOnce(pending.promise).mockResolvedValue('saved');
  const complete = jest.fn(), failure = jest.fn();
  const screen = render(<Action target="a" {...{ dispatch, complete, failure }} />);
  const press = screen.UNSAFE_getByType(TouchableOpacity).props.onPress;
  act(() => { press(); press(); });
  expect(dispatch).toHaveBeenCalledTimes(1);
  await act(async () => pending.reject(new Error('offline')));
  expect(complete).not.toHaveBeenCalled(); expect(failure).toHaveBeenCalledTimes(1);
  await act(async () => press());
  expect(dispatch).toHaveBeenCalledTimes(2); expect(complete).toHaveBeenCalledWith('saved');
});
test.each(['logout', 'same UID replacement', 'target replacement', 'unmount'])('%s suppresses old continuation without undoing the dispatched operation', async kind => {
  const pending = deferred(), dispatch = jest.fn(() => pending.promise), complete = jest.fn(), failure = jest.fn();
  const props = { dispatch, complete, failure };
  const screen = render(<Action target="a" {...props} />);
  const old = screen.UNSAFE_getByType(TouchableOpacity).props.onPress;
  act(() => { old(); }); expect(dispatch).toHaveBeenCalledWith('a');
  if (kind === 'unmount') screen.unmount();
  else if (kind === 'target replacement') screen.rerender(<Action target="b" {...props} />);
  else { if (kind === 'logout') mockSession = null; else newSession(); screen.rerender(<Action target="a" {...props} />); }
  await act(async () => pending.resolve('authoritative-success'));
  await act(async () => old());
  expect(dispatch).toHaveBeenCalledTimes(1); expect(complete).not.toHaveBeenCalled(); expect(failure).not.toHaveBeenCalled();
});
test('old finally cannot release a replacement target lock', async () => {
  const first = deferred(), second = deferred(), dispatch = jest.fn().mockReturnValueOnce(first.promise).mockReturnValue(second.promise);
  const props = { dispatch, complete: jest.fn(), failure: jest.fn() }, screen = render(<Action target="a" {...props} />);
  act(() => { screen.UNSAFE_getByType(TouchableOpacity).props.onPress(); });
  screen.rerender(<Action target="b" {...props} />);
  const press = screen.UNSAFE_getByType(TouchableOpacity).props.onPress;
  act(() => { press(); }); await act(async () => first.resolve());
  await act(async () => press()); expect(dispatch).toHaveBeenCalledTimes(2);
  await act(async () => second.resolve('b'));
  expect(props.complete).toHaveBeenCalledTimes(1);
});
