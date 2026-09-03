import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { COLORS } from '../theme/COLORS';
import CountrySelectorModal from './CountrySelectorModal';

const EMPTY = { search: '', onlineOnly: false, country: null, minAge: '', maxAge: '', interest: '', priceTier: '' };

const DiscoveryFilterModal = ({ visible, value, onClose, onApply }) => {
  const [draft, setDraft] = useState(value || EMPTY);
  const [countriesOpen, setCountriesOpen] = useState(false);
  React.useEffect(() => { if (visible) setDraft(value || EMPTY); }, [visible, value]);
  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={styles.container}><View style={styles.header}><Text style={styles.title}>Search & Filters</Text><TouchableOpacity onPress={onClose}><X color={COLORS.text} /></TouchableOpacity></View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>SEARCH</Text><View style={styles.search}><Search color={COLORS.textSecondary} size={18} /><TextInput style={styles.searchInput} value={draft.search} onChangeText={(search) => update({ search })} placeholder="Host name or interest" /></View>
        <View style={styles.toggle}><View><Text style={styles.fieldTitle}>Online only</Text><Text style={styles.hint}>Show currently available hosts</Text></View><Switch value={draft.onlineOnly} onValueChange={(onlineOnly) => update({ onlineOnly })} trackColor={{ true: COLORS.primary }} /></View>
        <Text style={styles.label}>COUNTRY</Text><TouchableOpacity style={styles.select} onPress={() => setCountriesOpen(true)}><Text style={styles.fieldTitle}>{draft.country ? `${draft.country.flag} ${draft.country.name}` : 'Any country'}</Text></TouchableOpacity>
        <Text style={styles.label}>AGE RANGE</Text><View style={styles.row}><TextInput style={styles.half} keyboardType="number-pad" maxLength={2} value={draft.minAge} onChangeText={(minAge) => update({ minAge })} placeholder="Min" /><TextInput style={styles.half} keyboardType="number-pad" maxLength={2} value={draft.maxAge} onChangeText={(maxAge) => update({ maxAge })} placeholder="Max" /></View>
        <Text style={styles.label}>INTEREST / TAG</Text><TextInput style={styles.select} value={draft.interest} onChangeText={(interest) => update({ interest })} placeholder="Music, travel, movies..." />
        <Text style={styles.label}>PRICING TIER</Text><View style={styles.row}>{['ENTRY','STANDARD','PREMIUM'].map((tier) => <TouchableOpacity key={tier} style={[styles.chip, draft.priceTier === tier && styles.chipActive]} onPress={() => update({ priceTier: draft.priceTier === tier ? '' : tier })}><Text style={[styles.chipText, draft.priceTier === tier && styles.chipTextActive]}>{tier}</Text></TouchableOpacity>)}</View>
      </ScrollView>
      <View style={styles.footer}><TouchableOpacity style={styles.clear} onPress={() => setDraft(EMPTY)}><Text style={styles.clearText}>Clear</Text></TouchableOpacity><TouchableOpacity style={styles.apply} onPress={() => { onApply(draft); onClose(); }}><Text style={styles.applyText}>Apply</Text></TouchableOpacity></View>
    </View>
    <CountrySelectorModal visible={countriesOpen} onClose={() => setCountriesOpen(false)} onSelect={(country) => { update({ country }); setCountriesOpen(false); }} title="Choose country" />
  </Modal>;
};

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F7F7F9'},header:{paddingTop:55,paddingHorizontal:20,paddingBottom:16,backgroundColor:'white',flexDirection:'row',justifyContent:'space-between'},title:{fontSize:24,fontWeight:'900',color:COLORS.text},content:{padding:20,paddingBottom:110},label:{fontSize:12,fontWeight:'900',color:COLORS.textSecondary,letterSpacing:1,marginTop:20,marginBottom:8},search:{height:52,borderRadius:16,backgroundColor:'white',flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:8},searchInput:{flex:1,color:COLORS.text},toggle:{marginTop:18,backgroundColor:'white',borderRadius:16,padding:15,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},fieldTitle:{color:COLORS.text,fontWeight:'800'},hint:{color:COLORS.textSecondary,fontSize:12,marginTop:3},select:{minHeight:52,backgroundColor:'white',borderRadius:16,paddingHorizontal:14,justifyContent:'center',color:COLORS.text},row:{flexDirection:'row',gap:9},half:{flex:1,height:52,backgroundColor:'white',borderRadius:16,paddingHorizontal:14},chip:{flex:1,paddingVertical:12,borderRadius:14,backgroundColor:'white',alignItems:'center'},chipActive:{backgroundColor:COLORS.primary},chipText:{fontSize:11,fontWeight:'900',color:COLORS.textSecondary},chipTextActive:{color:'white'},footer:{position:'absolute',bottom:0,left:0,right:0,padding:16,backgroundColor:'white',flexDirection:'row',gap:10},clear:{flex:1,height:54,borderRadius:27,borderWidth:1,borderColor:COLORS.primary,alignItems:'center',justifyContent:'center'},clearText:{color:COLORS.primary,fontWeight:'900'},apply:{flex:2,height:54,borderRadius:27,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center'},applyText:{color:'white',fontWeight:'900'}
});
export { EMPTY as EMPTY_DISCOVERY_FILTERS };
export default DiscoveryFilterModal;
