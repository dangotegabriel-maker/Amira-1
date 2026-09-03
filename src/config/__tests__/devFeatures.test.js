import { canUseDemoHosts } from '../devFeatures';

describe('development discovery fixtures', () => {
  it('is impossible to enable fixtures in a non-development build', () => {
    expect(canUseDemoHosts({ isDev: false, explicitlyDisabled: false })).toBe(false);
  });

  it('supports an explicit development opt-out', () => {
    expect(canUseDemoHosts({ isDev: true, explicitlyDisabled: true })).toBe(false);
    expect(canUseDemoHosts({ isDev: true, explicitlyDisabled: false })).toBe(true);
  });
});
