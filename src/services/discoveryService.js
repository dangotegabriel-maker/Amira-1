import { invokeSocial } from './socialBackend';
import { isNewHost, NEW_HOST_WINDOW_DAYS } from '../utils/hostRecency';

export { isNewHost, NEW_HOST_WINDOW_DAYS };

const rankForYou = (hosts) =>
  [...hosts].sort((a, b) => {
    const score = (host) =>
      (host.hostStatus?.availability === 'online' ? 100 : 0) +
      (isNewHost(host) ? 20 : 0);

    return score(b) - score(a) || a.uid.localeCompare(b.uid);
  });

export const discoveryService = {
  /**
   * Consumer-facing marketplace:
   * returns approved hosts.
   */
  getApprovedHosts: async () => rankForYou(await invokeSocial('getDiscoveryHosts', {tab:'For You'})),
  getNewHosts: async () => (await invokeSocial('getDiscoveryHosts', {tab:'New'})).sort((a,b)=>b.hostApprovedAt-a.hostApprovedAt||a.uid.localeCompare(b.uid)),

  /**
   * Host-facing discovery:
   * returns real consumer profiles for the Connect tab.
   *
   * No demo/fake consumers are injected here.
   */
  getConsumersForHosts: async () => (await invokeSocial('getHostConnectConsumers',{tab:'For You'})).people,
  getFollowingConsumers: async () => (await invokeSocial('getHostConnectConsumers',{tab:'Following'})).people,

  getFollowingHosts: async () => rankForYou(await invokeSocial('getDiscoveryHosts', {tab:'Following'})),

  searchAndFilter: (hosts, filters = {}) => {
    const search = String(filters.search || '')
      .trim()
      .toLocaleLowerCase();

    return hosts.filter((host) => {
      if (
        filters.onlineOnly &&
        host.hostStatus?.availability !== 'online'
      ) {
        return false;
      }

      if (
        filters.countryCode &&
        host.countryCode !== filters.countryCode
      ) {
        return false;
      }

      if (
        Number.isFinite(filters.minAge) &&
        host.age < filters.minAge
      ) {
        return false;
      }

      if (
        Number.isFinite(filters.maxAge) &&
        host.age > filters.maxAge
      ) {
        return false;
      }

      if (
        filters.interest &&
        !(host.hostProfile?.interests || []).some((interest) =>
          interest
            .toLocaleLowerCase()
            .includes(filters.interest.toLocaleLowerCase())
        )
      ) {
        return false;
      }

      if (
        filters.priceTier &&
        host.hostProfile?.rateTier !== filters.priceTier
      ) {
        return false;
      }

      if (!search) return true;

      const haystack = [
        host.username,
        host.countryName,
        ...(host.hostProfile?.interests || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();

      return haystack.includes(search);
    });
  },

  /**
   * Lightweight filtering for host-side consumer discovery.
   * This lets the future Connect screen filter locally without
   * performing a new Firestore query for every UI change.
   */
  searchConsumers: (consumers, filters = {}) => {
    const search = String(filters.search || '')
      .trim()
      .toLocaleLowerCase();

    return consumers.filter((consumer) => {
      if (
        filters.countryCode &&
        consumer.countryCode !== filters.countryCode
      ) {
        return false;
      }

      if (
        Number.isFinite(filters.minAge) &&
        consumer.age < filters.minAge
      ) {
        return false;
      }

      if (
        Number.isFinite(filters.maxAge) &&
        consumer.age > filters.maxAge
      ) {
        return false;
      }

      if (
        filters.gender &&
        consumer.gender !== filters.gender
      ) {
        return false;
      }

      if (
        filters.interest &&
        !(consumer.interests || []).some((interest) =>
          interest
            .toLocaleLowerCase()
            .includes(filters.interest.toLocaleLowerCase())
        )
      ) {
        return false;
      }

      if (!search) return true;

      const haystack = [
        consumer.username,
        consumer.countryName,
        consumer.bio,
        ...(consumer.interests || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();

      return haystack.includes(search);
    });
  },

  isNewHost,

  getBestMatch: (hosts, consumer, skippedIds = []) => {
    const skipped = new Set(skippedIds);

    return (
      hosts
        .filter((host) => host.hostStatus?.isApproved === true && !host.isDemo && host.hostStatus?.availability !== 'busy' && !skipped.has(host.uid))
        .map((host) => {
          let score =
            host.hostStatus?.availability === 'online'
              ? 100
              : 0;

          if (
            host.countryCode &&
            host.countryCode === consumer?.countryCode
          ) {
            score += 20;
          }

          const preferences =
            consumer?.preferences?.interests || [];

          const interests =
            host.hostProfile?.interests || [];

          score +=
            interests.filter((interest) =>
              preferences.includes(interest)
            ).length * 10;

          return { host, score };
        })
        .sort(
          (a, b) =>
            b.score - a.score ||
            a.host.uid.localeCompare(b.host.uid)
        )[0]?.host || null
    );
  },
};