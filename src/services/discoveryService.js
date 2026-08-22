import { collection, documentId, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from './firebaseService';
import { normalizeUser } from '../models/userModel';
import { followService } from './followService';

const DISCOVERY_LIMIT = 60;

const normalizeHostDocs = (snapshot) => snapshot.docs
  .map((entry) => normalizeUser(entry.id, entry.data()))
  .filter((host) => host.role === 'host' && host.hostStatus?.isApproved === true);

export const discoveryService = {
  getApprovedHosts: async ({ onlineOnly = false } = {}) => {
    const constraints = [
      where('role', '==', 'host'),
      where('hostStatus.isApproved', '==', true),
    ];
    if (onlineOnly) constraints.push(where('hostStatus.availability', '==', 'online'));
    constraints.push(limit(DISCOVERY_LIMIT));
    return normalizeHostDocs(await getDocs(query(collection(db, 'users'), ...constraints)));
  },
  getFollowingHosts: async () => {
    const ids = await followService.getFollowingHostIds();
    if (!ids.length) return [];
    const chunks = [];
    for (let index = 0; index < ids.length; index += 30) chunks.push(ids.slice(index, index + 30));
    const snapshots = await Promise.all(chunks.map((chunk) => getDocs(query(
      collection(db, 'users'), where(documentId(), 'in', chunk),
    ))));
    return snapshots.flatMap(normalizeHostDocs);
  },
  searchAndFilter: (hosts, filters = {}) => {
    const search = String(filters.search || '').trim().toLocaleLowerCase();
    return hosts.filter((host) => {
      if (filters.onlineOnly && host.hostStatus?.availability !== 'online') return false;
      if (filters.countryCode && host.countryCode !== filters.countryCode) return false;
      if (Number.isFinite(filters.minAge) && host.age < filters.minAge) return false;
      if (Number.isFinite(filters.maxAge) && host.age > filters.maxAge) return false;
      if (filters.interest && !(host.hostProfile?.interests || []).includes(filters.interest)) return false;
      if (!search) return true;
      const haystack = [host.username, host.countryName, ...(host.hostProfile?.interests || [])]
        .filter(Boolean).join(' ').toLocaleLowerCase();
      return haystack.includes(search);
    });
  },
  getBestMatch: (hosts, consumer, skippedIds = []) => {
    const skipped = new Set(skippedIds);
    return hosts
      .filter((host) => !skipped.has(host.uid))
      .map((host) => {
        let score = host.hostStatus?.availability === 'online' ? 100 : 0;
        if (host.countryCode && host.countryCode === consumer?.countryCode) score += 20;
        const preferences = consumer?.preferences?.interests || [];
        const interests = host.hostProfile?.interests || [];
        score += interests.filter((interest) => preferences.includes(interest)).length * 10;
        return { host, score };
      })
      .sort((a, b) => b.score - a.score || a.host.uid.localeCompare(b.host.uid))[0]?.host || null;
  },
};
