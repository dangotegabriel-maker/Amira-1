import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Filter, Search, SlidersHorizontal } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { discoveryService } from '../../services/discoveryService';
import HostCard from '../../components/HostCard';
import CountrySelectorModal from '../../components/CountrySelectorModal';

const TABS = ['For You', 'Online', 'Following'];

const HomeScreen = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState('For You');
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState(null);
  const [showCountries, setShowCountries] = useState(false);

  useEffect(() => {
    if (TABS.includes(route.params?.initialTab)) {
      setActiveTab(route.params.initialTab);
      navigation.setParams({ initialTab: undefined });
    }
  }, [route.params?.initialTab]);

  const loadHosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = activeTab === 'Following'
        ? await discoveryService.getFollowingHosts()
        : await discoveryService.getApprovedHosts({ onlineOnly: activeTab === 'Online' });
      setHosts(result);
    } catch (loadError) {
      console.log('DISCOVERY ERROR:', loadError);
      setError('Marketplace profiles could not be loaded. Pull back and try again.');
      setHosts([]);
    } finally { setLoading(false); }
  }, [activeTab]);

  useFocusEffect(useCallback(() => { loadHosts(); }, [loadHosts]));

  const filteredHosts = useMemo(() => discoveryService.searchAndFilter(hosts, {
    search,
    countryCode: country?.cca2 || '',
    onlineOnly: activeTab === 'Online',
  }), [hosts, search, country, activeTab]);

  const emptyCopy = error || (activeTab === 'Following'
    ? 'Follow approved hosts to see them here.'
    : activeTab === 'Online'
      ? 'No approved hosts are online right now.'
      : 'No approved hosts are available yet.');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Real, approved Amira hosts</Text>
        <View style={styles.tabs}>{TABS.map((tab) => <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}><Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text></TouchableOpacity>)}</View>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}><Search color={COLORS.textSecondary} size={18} /><TextInput value={search} onChangeText={setSearch} style={styles.searchInput} placeholder="Search hosts or interests" placeholderTextColor={COLORS.textSecondary} /></View>
          <TouchableOpacity style={[styles.filterButton, country && styles.filterActive]} onPress={() => setShowCountries(true)}><Filter color={country ? 'white' : COLORS.text} size={20} /></TouchableOpacity>
        </View>
        {country && <View style={styles.activeFilter}><Text style={styles.activeFilterText}>{country.flag} {country.name}</Text><TouchableOpacity onPress={() => setCountry(null)}><Text style={styles.clear}>Clear</Text></TouchableOpacity></View>}
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View> : (
        <FlatList
          data={filteredHosts}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadHosts}
          renderItem={({ item }) => <HostCard host={item} onPress={() => navigation.navigate('UserProfile', { userId: item.uid })} />}
          ListEmptyComponent={<View style={styles.empty}><SlidersHorizontal color={COLORS.primary} size={38} /><Text style={styles.emptyTitle}>Nothing to show</Text><Text style={styles.emptyText}>{emptyCopy}</Text>{(search || country) && <TouchableOpacity onPress={() => { setSearch(''); setCountry(null); }}><Text style={styles.clearFilters}>Clear filters</Text></TouchableOpacity>}</View>}
        />
      )}
      <CountrySelectorModal visible={showCountries} onClose={() => setShowCountries(false)} onSelect={setCountry} title="Filter by country" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' }, header: { backgroundColor: 'white', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: COLORS.text, fontSize: 29, fontWeight: '900' }, subtitle: { color: COLORS.textSecondary, marginTop: 2 }, tabs: { flexDirection: 'row', gap: 8, marginTop: 18 }, tab: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 17, backgroundColor: '#F1F1F4' }, activeTab: { backgroundColor: COLORS.primary }, tabText: { color: COLORS.textSecondary, fontWeight: '800' }, activeTabText: { color: 'white' },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 13 }, searchBox: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F4F4F6', borderRadius: 15, paddingHorizontal: 13 }, searchInput: { flex: 1, color: COLORS.text, fontSize: 15 }, filterButton: { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F1F4' }, filterActive: { backgroundColor: COLORS.primary },
  activeFilter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }, activeFilterText: { color: COLORS.text, fontWeight: '700' }, clear: { color: COLORS.primary, fontWeight: '800' }, list: { padding: 14, paddingBottom: 100 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 28 }, emptyTitle: { color: COLORS.text, fontSize: 21, fontWeight: '900', marginTop: 13 }, emptyText: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: 7 }, clearFilters: { color: COLORS.primary, fontWeight: '900', marginTop: 15 },
});
export default HomeScreen;
