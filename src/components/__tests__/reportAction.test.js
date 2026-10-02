import React from 'react';
import { TouchableOpacity } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
let mockSession;
jest.mock('../../context/UserContext', () => ({ useUser: () => ({ authenticatedSession: mockSession }) }));
jest.mock('../../services/reportService', () => ({ reportService: { requestId: () => 'report-stable' } }));
jest.mock('lucide-react-native', () => ({ X: () => null }));
const Report = require('../ReportUserModal').default;
beforeEach(() => { const token = { isCurrent: () => mockSession === token }; mockSession = token; });
test('report stays open through failure, prevents double submit, and closes only after confirmed retry', async () => {
  let resolve; const onReport = jest.fn().mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValue(true), onClose = jest.fn();
  const screen = render(<Report visible targetKey="a" userName="Alice" {...{ onReport, onClose }} />);
  fireEvent.press(screen.getByText('Harassment'));
  fireEvent.changeText(screen.getByPlaceholderText('Tell us more (optional)...'), 'Evidence');
  const send = screen.UNSAFE_getAllByType(TouchableOpacity).find(node => node.props.onPress?.name === 'handleReport').props.onPress;
  act(() => { send(); send(); }); expect(onReport).toHaveBeenCalledTimes(1); expect(onReport).toHaveBeenCalledWith('Harassment', 'Evidence', 'report-stable');
  expect(onClose).not.toHaveBeenCalled(); await act(async () => resolve(false));
  expect(onClose).not.toHaveBeenCalled(); expect(screen.getByDisplayValue('Evidence')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText('Send Report')));
  expect(onReport).toHaveBeenCalledTimes(2); expect(onReport.mock.calls.map(args=>args[2])).toEqual(['report-stable','report-stable']); expect(onClose).toHaveBeenCalledTimes(1);
});
test.each(['target', 'session', 'unmount'])('obsolete report success cannot close the replacement %s', async kind => {
  let resolve; const onReport = jest.fn(() => new Promise(done => { resolve = done; })), onClose = jest.fn();
  const props = { visible: true, targetKey: 'a', onReport, onClose }, screen = render(<Report {...props} />);
  fireEvent.press(screen.getByText('Spam')); act(() => { fireEvent.press(screen.getByText('Send Report')); });
  if (kind === 'unmount') screen.unmount(); else { if (kind === 'session') mockSession = { isCurrent: () => true }; screen.rerender(<Report {...props} targetKey={kind === 'target' ? 'b' : 'a'} />); }
  await act(async () => resolve(true)); expect(onClose).not.toHaveBeenCalled();
});
