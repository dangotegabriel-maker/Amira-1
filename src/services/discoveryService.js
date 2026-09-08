import {
  collection,
  documentId,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

import { db } from './firebaseService';
import { normalizeUser } from '../models/userModel';
import { followService } from './followService';
import { DEV_FEATURES } from '../config/devFeatures';
import { DEMO_HOSTS } from '../data/demoHosts';
import { isNewHost, NEW_HOST_WINDOW_DAYS } from '../utils/hostRecency';
import { blockService } from './blockService';

const DISCOVERY_LIMIT = 60;

export { isNewHost, NEW_HOST_WINDOW_DAYS };

const includeDemoFallback = (hosts) =>
  !hosts.length && DEV_FEATURES.enableDemoHosts ? DEMO_HOSTS : hosts;

const rankForYou = (hosts) =>
  [...hosts].sort((a, b) => {
    const score = (host) =>
      (host.hostStatus?.availability === 'online' ? 100 : 0) +
      (isNewHost(host) ? 20 : 0);

    return score(b) - score(a) || a.uid.localeCompare(b.uid);
  });

const normalizeHostDocs = (snapshot) =>
  snapshot.docs
    .map((entry) => normalizeUser(entry.id, entry.data()))
    .filter(
      (host) =>
        host.role === 'host' &&
        host.hostStatus?.isApproved === true
    );

/**
 * Consumer cards shown to approved hosts.
 *
 * Deliberately returns only fields needed by the discovery UI.
 * Do not expose wallet, earnings, email or phone through host Connect cards.
 */
const toPublicConsumerCard = (consumer) => ({
  uid: consumer.uid,
  username: consumer.username,
  profilePic: consumer.profilePic,
  age: consumer.age,
  gender: consumer.gender,
  countryCode: consumer.countryCode,
  countryName: consumer.countryName,
  bio: consumer.hostProfile?.bio || consumer.bio || '',
  interests: consumer.hostProfile?.interests || consumer.interests || [],
  role: consumer.role,
  isProfileComplete: consumer.isProfileComplete,
  createdAt: consumer.createdAt || null,
});

const normalizeConsumerDocs = (snapshot, currentUid = '') =>
  snapshot.docs
    .map((entry) => normalizeUser(entry.id, entry.data()))
    .filter(
      (consumer) =>
        consumer.role === 'consumer' &&
        consumer.uid !== currentUid &&
        consumer.isProfileComplete === true
    )
    .map(toPublicConsumerCard);

export const discoveryService = {
  /**
   * Consumer-facing marketplace:
   * returns approved hosts.
   */
  getApprovedHosts: async ({ onlineOnly = false } = {}) => {
    const constraints = [
      where('role', '==', 'host'),
      where('hostStatus.isApproved', '==', true),
    ];

    if (onlineOnly) {
      constraints.push(
        where('hostStatus.availability', '==', 'online')
      );
    }

    constraints.push(limit(DISCOVERY_LIMIT));

    const [snapshot, blockedIds] = await Promise.all([
      getDocs(
        query(
          collection(db, 'users'),
          ...constraints
        )
      ),
      blockService.getBlockedIds(),
    ]);

    const blocked = new Set(blockedIds);

    const realHosts = normalizeHostDocs(snapshot).filter(
      (host) => !blocked.has(host.uid)
    );

    const hosts = includeDemoFallback(realHosts).filter(
      (host) =>
        !blocked.has(host.uid) &&
        (!onlineOnly ||
          host.hostStatus?.availability === 'online')
    );

    return rankForYou(hosts);
  },

  /**
   * Host-facing discovery:
   * returns real consumer profiles for the Connect tab.
   *
   * No demo/fake consumers are injected here.
   */
  getConsumersForHosts: async (currentHostUid) => {
    if (!currentHostUid) return [];

    const [snapshot, blockedIds] = await Promise.all([
      getDocs(
        query(
          collection(db, 'users'),
          where('role', '==', 'consumer'),
          limit(DISCOVERY_LIMIT)
        )
      ),
      blockService.getBlockedIds(),
    ]);

    const blocked = new Set(blockedIds);

    return normalizeConsumerDocs(
      snapshot,
      currentHostUid
    ).filter(
      (consumer) => !blocked.has(consumer.uid)
    );
  },

  getFollowingConsumers: async (currentHostUid) => {
    if (!currentHostUid) return [];
    const [ids, blockedIds] = await Promise.all([
      followService.getFollowingConsumerIds(),
      blockService.getBlockedIds(),
    ]);
    const blocked = new Set(blockedIds);
    const snapshots = [];
    // Fetch followed IDs directly so the discovery limit does not hide follows.
    for (let index = 0; index < ids.length; index += 30) {
      snapshots.push(await getDocs(query(
        collection(db, 'users'), where(documentId(), 'in', ids.slice(index, index + 30)),
      )));
    }
    return snapshots.flatMap((snapshot) => normalizeConsumerDocs(snapshot, currentHostUid))
      .filter((consumer) => !blocked.has(consumer.uid));
  },

  getFollowingHosts: async () => {
    const [ids, blockedIds] = await Promise.all([
      followService.getFollowingHostIds(),
      blockService.getBlockedIds(),
    ]);

    const blocked = new Set(blockedIds);

    if (!ids.length) {
      return DEV_FEATURES.enableDemoHosts
        ? DEMO_HOSTS.filter((host) => host.demoFollowing)
        : [];
    }

    const chunks = [];

    for (let index = 0; index < ids.length; index += 30) {
      chunks.push(ids.slice(index, index + 30));
    }

    const snapshots = await Promise.all(
      chunks.map((chunk) =>
        getDocs(
          query(
            collection(db, 'users'),
            where(documentId(), 'in', chunk)
          )
        )
      )
    );

    const realHosts = snapshots
      .flatMap(normalizeHostDocs)
      .filter((host) => !blocked.has(host.uid));

    return !realHosts.length && DEV_FEATURES.enableDemoHosts
      ? DEMO_HOSTS.filter((host) => host.demoFollowing)
      : realHosts;
  },

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
        .filter((host) => !skipped.has(host.uid))
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