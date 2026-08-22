import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BadgeCheck, Coins } from 'lucide-react-native';
import { getCountryByCode } from '../data/countries';
import { COLORS } from '../theme/COLORS';

const HostCard = ({ host, onPress, compact = false }) => {
  const country = getCountryByCode(host.countryCode);
  const availability = host.hostStatus?.availability || 'offline';
  const rate = host.hostProfile?.videoRateCredits || 50;
  return (
    <TouchableOpacity style={[styles.card, compact && styles.compact]} onPress={onPress}>
      {host.profilePic ? <Image source={{ uri: host.profilePic }} style={styles.photo} /> : <View style={[styles.photo, styles.placeholder]}><Text style={styles.placeholderText}>{host.username?.slice(0, 1)?.toUpperCase() || 'A'}</Text></View>}
      <View style={styles.overlay} />
      <View style={[styles.availability, styles[availability] || styles.offline]}><Text style={styles.availabilityText}>{availability}</Text></View>
      <View style={styles.info}>
        <View style={styles.nameRow}><Text style={styles.name} numberOfLines={1}>{host.username}</Text><BadgeCheck color="#60A5FA" fill="#EFF6FF" size={18} /></View>
        <Text style={styles.meta}>{host.age || '18+'} · {country?.flag || ''} {host.countryName || country?.name || host.countryCode}</Text>
        <View style={styles.tags}>{(host.hostProfile?.interests || []).slice(0, 2).map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
        <View style={styles.rate}><Coins color="#FACC15" size={14} /><Text style={styles.rateText}>{rate}/min</Text></View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { minHeight: 310, borderRadius: 20, overflow: 'hidden', backgroundColor: '#DDD', marginBottom: 14 },
  compact: { minHeight: 270 }, photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  placeholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E9D5FF' }, placeholderText: { color: '#7C3AED', fontSize: 60, fontWeight: '900' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  availability: { position: 'absolute', top: 13, left: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }, online: { backgroundColor: '#16A34A' }, busy: { backgroundColor: '#F59E0B' }, offline: { backgroundColor: '#64748B' }, availabilityText: { color: 'white', textTransform: 'capitalize', fontSize: 11, fontWeight: '900' },
  info: { position: 'absolute', left: 14, right: 14, bottom: 14 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, name: { color: 'white', fontSize: 23, fontWeight: '900', maxWidth: '84%' }, meta: { color: 'white', fontSize: 14, marginTop: 3 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 8 }, tag: { color: 'white', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.42)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  rate: { position: 'absolute', right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.48)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 }, rateText: { color: 'white', fontWeight: '800', fontSize: 12 },
});
export default HostCard;
