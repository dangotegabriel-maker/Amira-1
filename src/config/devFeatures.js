const isDevelopmentBuild = typeof __DEV__ !== 'undefined' && __DEV__ === true;

export const canUseDemoHosts = ({ isDev = false, explicitlyDisabled = false } = {}) => (
  isDev === true && explicitlyDisabled !== true
);
export const canUseCallSimulator = ({ isDev = false, enabled = false } = {}) => isDev === true && enabled === true;

export const DEV_FEATURES = Object.freeze({
  enableTestTopUps: isDevelopmentBuild && process.env.EXPO_PUBLIC_ENABLE_TEST_TOPUPS === 'true',
  enableDemoHosts: canUseDemoHosts({
    isDev: isDevelopmentBuild,
    explicitlyDisabled: process.env.EXPO_PUBLIC_ENABLE_DEMO_HOSTS === 'false',
  }),
  enableQuickLogin: isDevelopmentBuild,
  enableCallSimulator: canUseCallSimulator({ isDev: isDevelopmentBuild, enabled: process.env.EXPO_PUBLIC_ENABLE_CALL_SIMULATOR === 'true' }),
});
