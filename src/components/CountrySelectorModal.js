import React, { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { searchCountries } from '../data/countries';
import { COLORS } from '../theme/COLORS';

const CountrySelectorModal = ({ visible, onClose, onSelect, title = 'Select country' }) => {
  const [query, setQuery] = useState('');
  const countries = useMemo(() => searchCountries(query), [query]);
  const close = () => { setQuery(''); onClose(); };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={close} accessibilityLabel="Close country selector"><X color={COLORS.text} size={25} /></TouchableOpacity>
        </View>
        <View style={styles.searchBox}>
          <Search color={COLORS.textSecondary} size={19} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Country, ISO code, or +calling code" placeholderTextColor={COLORS.textSecondary} style={styles.input} autoCapitalize="none" autoCorrect={false} />
        </View>
        <FlatList
          data={countries}
          keyExtractor={(item) => item.cca2}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={24}
          windowSize={9}
          ListEmptyComponent={<Text style={styles.empty}>No matching country</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.option} onPress={() => { onSelect(item); close(); }}>
              <Text style={styles.flag}>{item.flag}</Text>
              <View style={styles.optionText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.cca2}{item.currency ? ` · ${item.currency}` : ''}</Text>
              </View>
              <Text style={styles.callingCode}>{item.callingCode ? `+${item.callingCode}` : '—'}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white, paddingTop: 54 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  searchBox: { marginHorizontal: 16, marginBottom: 10, minHeight: 50, borderRadius: 15, backgroundColor: '#F4F4F6', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: COLORS.text, fontSize: 16, marginLeft: 10 },
  option: { minHeight: 66, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8E8EC' },
  flag: { fontSize: 27, width: 42 }, optionText: { flex: 1 },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  callingCode: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  empty: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 80, fontSize: 16 },
});
export default CountrySelectorModal;
