import countriesRaw from 'react-native-country-picker-modal/lib/assets/data/countries-emoji.json';

export const countryCodeToFlag = (cca2 = '') => String(cca2)
  .toUpperCase()
  .replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)));

export const COUNTRIES = Object.entries(countriesRaw)
  .map(([cca2, country]) => ({
    cca2,
    flag: countryCodeToFlag(cca2),
    name: country?.name?.common || cca2,
    callingCode: country?.callingCode?.[0] || '',
    callingCodes: country?.callingCode || [],
    currency: country?.currency?.[0] || '',
    currencies: country?.currency || [],
    region: country?.region || '',
    subregion: country?.subregion || '',
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_COUNTRY = COUNTRIES.find((country) => country.cca2 === 'GH') || COUNTRIES[0];

export const getCountryByCode = (countryCode) => COUNTRIES.find(
  (country) => country.cca2 === String(countryCode || '').toUpperCase(),
);

export const searchCountries = (query) => {
  const normalized = String(query || '').trim().toLocaleLowerCase().replace(/^\+/, '');
  if (!normalized) return COUNTRIES;
  return COUNTRIES.filter((country) => (
    country.name.toLocaleLowerCase().includes(normalized) ||
    country.cca2.toLocaleLowerCase().includes(normalized) ||
    country.callingCodes.some((code) => String(code).includes(normalized))
  ));
};
