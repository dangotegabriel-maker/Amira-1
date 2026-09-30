import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useUser } from '../context/UserContext';
import { useSessionGuard } from '../hooks/useSessionGuard';
import { DEV_FEATURES } from '../config/devFeatures';

export const validRouteId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
export const backOrMain = navigation => {
  if (navigation.canGoBack?.() !== false && navigation.goBack) navigation.goBack();
  else navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
};
export const chatRouteId = ({ params }) => validRouteId(params?.userId)
  ? `${params.activeCallId || 'conversation'}:${params.userId}` : undefined;

export const routeIsValid = (name, params, user) => {
  if (name === 'ChatDetail' || name === 'UserProfile') return validRouteId(params?.userId) && params.userId !== user?.uid
    && (params.activeCallId === undefined || validRouteId(params.activeCallId));
  if (name === 'VideoCall') return validRouteId(params?.call?.callId || params?.call?.id)
    && (!params.call.simulated || DEV_FEATURES.enableCallSimulator);
  if (name === 'CallSummary') return Number.isFinite(params?.duration) && params.duration >= 0
    && (params.callId === undefined || validRouteId(params.callId))
    && (params.targetUserId === undefined || validRouteId(params.targetUserId));
  if (name === 'GiftLedger') return params?.type === undefined || ['sent', 'received'].includes(params.type);
  if (name === 'StoryViewer') return params?.stories === undefined || (Array.isArray(params.stories)
    && params.stories.every(story => story && typeof story.uri === 'string' && /^https:\/\/\S+$/.test(story.uri)
      && ['image', 'video'].includes(story.type) && story.visibility === 'public'));
  return true;
};

// Validate before mounting a screen whose hooks consume route identifiers.
// This is input validation; backend authorization still decides access.
export const withRouteSafety = (name, Screen) => function SafeRoute(props) {
  const { user } = useUser();
  const current = useSessionGuard();
  if (!routeIsValid(name, props.route?.params, user)) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
    <Text accessibilityRole="alert">This screen is unavailable. Please open it again from the app.</Text>
    <TouchableOpacity onPress={() => { if (current()) backOrMain(props.navigation); }}><Text>Go back</Text></TouchableOpacity>
  </View>;
  return <Screen {...props} />;
};

// Remove the call AND its overlays, preserving the route that started it.
export const leaveCallRoute = (navigation, routeKey, summary) => {
  const state = navigation.getState?.();
  const index = state?.routes?.findIndex(route => route.key === routeKey);
  if (index >= 0) {
    const routes = state.routes.slice(0, index);
    if (!routes.length) routes.push({ name: 'MainTabs' });
    if (summary) routes.push({ name: 'CallSummary', params: summary });
    navigation.reset({ routes, index: routes.length - 1 });
  } else if (state) return; // The call was already removed; leave the current stack alone.
  else if (summary) navigation.replace('CallSummary', summary);
  else backOrMain(navigation);
};
