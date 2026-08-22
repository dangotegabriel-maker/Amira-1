const isDevelopmentBuild = typeof __DEV__ !== 'undefined' && __DEV__ === true;

export const DEV_FEATURES = Object.freeze({
  enableTestTopUps: isDevelopmentBuild && process.env.EXPO_PUBLIC_ENABLE_TEST_TOPUPS === 'true',
  enableQuickLogin: isDevelopmentBuild,
});
