import { COUNTRIES, getCountryByCode, searchCountries } from '../countries';

describe('central country dataset', () => {
  test('contains the complete packaged dataset with reusable fields', () => {
    expect(COUNTRIES).toHaveLength(250);
    expect(getCountryByCode('GH')).toMatchObject({
      name: 'Ghana',
      callingCode: '233',
      currency: 'GHS',
    });
  });

  test.each([
    ['Gha', 'GH'],
    ['+233', 'GH'],
    ['Nig', 'NG'],
    ['US', 'US'],
  ])('searches %s by name, calling code, or ISO code', (query, expectedCode) => {
    expect(searchCountries(query).some((country) => country.cca2 === expectedCode)).toBe(true);
  });
});
