import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

// Native phone verification is disabled at the auth service boundary.
// A direct route must not expose an obsolete verification/profile-write flow.
const OTPScreen = ({ navigation }) => <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
  <Text>Phone sign-in unavailable</Text>
  <Text>Phone sign-in is disabled until secure app verification is configured. Please use another sign-in method.</Text>
  <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}><Text>Back to sign in</Text></TouchableOpacity>
</View>;
export default OTPScreen;
