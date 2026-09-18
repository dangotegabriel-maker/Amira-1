import React, {useEffect,useState} from 'react';
import {Modal,ScrollView,StyleSheet,Switch,Text,TextInput,TouchableOpacity,View} from 'react-native';
import {X} from 'lucide-react-native';
import {COLORS} from '../theme/COLORS';
import CountrySelectorModal from './CountrySelectorModal';
import {EMPTY_DISCOVERY_FILTERS} from '../hooks/useDiscoveryFilters';
const {INTERESTS}=require('../../functions/src/hostDiscoveryDomain');
const DiscoveryFilterModal=({visible,value,onClose,onApply,languages=[]})=>{
 const [draft,setDraft]=useState(value||EMPTY_DISCOVERY_FILTERS),[countriesOpen,setCountriesOpen]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(visible){setDraft(value||EMPTY_DISCOVERY_FILTERS);setError('');}},[visible,value]);
 const update=patch=>setDraft(current=>({...current,...patch}));
 const apply=()=>{const min=draft.minAge===''?18:Number(draft.minAge),max=draft.maxAge===''?120:Number(draft.maxAge);if(!Number.isInteger(min)||!Number.isInteger(max)||min<18||max>120||min>max){setError('Choose an age range between 18 and 120.');return;}onApply(draft);onClose();};
 return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><View style={styles.container}>
 <View style={styles.header}><Text style={styles.title}>Discovery Filters</Text><TouchableOpacity accessibilityLabel="Close filters" onPress={onClose}><X color={COLORS.text}/></TouchableOpacity></View>
 <ScrollView contentContainerStyle={styles.content}>
 <Text style={styles.label}>Country</Text><TouchableOpacity style={styles.select} onPress={()=>setCountriesOpen(true)}><Text>{draft.country?`${draft.country.flag} ${draft.country.name}`:'Any country'}</Text></TouchableOpacity>
 <Text style={styles.label}>Language</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{['',...new Set([draft.language,...languages].filter(Boolean))].map(language=><TouchableOpacity key={language} style={[styles.chip,draft.language===language&&styles.chipActive]} onPress={()=>update({language})}><Text style={[styles.chipText,draft.language===language&&styles.chipTextActive]}>{language||'Any language'}</Text></TouchableOpacity>)}</View>{!languages.length&&<Text style={styles.hint}>Languages appear when Hosts share them.</Text>}
 <Text style={styles.label}>Age Range</Text><View style={styles.row}><TextInput accessibilityLabel="Minimum age" style={styles.half} keyboardType="number-pad" maxLength={3} value={draft.minAge} onChangeText={minAge=>update({minAge})} placeholder="Min"/><TextInput accessibilityLabel="Maximum age" style={styles.half} keyboardType="number-pad" maxLength={3} value={draft.maxAge} onChangeText={maxAge=>update({maxAge})} placeholder="Max"/></View>
 <View style={styles.toggle}><Text style={styles.fieldTitle}>Online Now</Text><Switch accessibilityLabel="Online Now" value={draft.onlineOnly} onValueChange={onlineOnly=>update({onlineOnly})}/></View>
 <Text style={styles.label}>Interests</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{INTERESTS.map(interest=><TouchableOpacity key={interest} style={[styles.chip,draft.interests.includes(interest)&&styles.chipActive]} onPress={()=>update({interests:draft.interests.includes(interest)?draft.interests.filter(item=>item!==interest):[...draft.interests,interest]})}><Text style={[styles.chipText,draft.interests.includes(interest)&&styles.chipTextActive]}>{interest}</Text></TouchableOpacity>)}</View>
 {error&&<Text accessibilityRole="alert" style={{color:'#DC2626',marginTop:12}}>{error}</Text>}</ScrollView>
 <View style={styles.footer}><TouchableOpacity style={styles.clear} onPress={()=>{setDraft(EMPTY_DISCOVERY_FILTERS);onApply(EMPTY_DISCOVERY_FILTERS);setError('');}}><Text style={styles.clearText}>Clear Filters</Text></TouchableOpacity><TouchableOpacity style={styles.apply} onPress={apply}><Text style={styles.applyText}>Apply</Text></TouchableOpacity></View></View>
 <CountrySelectorModal visible={countriesOpen} onClose={()=>setCountriesOpen(false)} onSelect={country=>{update({country});setCountriesOpen(false);}} title="Choose country"/></Modal>;
};
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F7F7F9'},header:{paddingTop:55,paddingHorizontal:20,paddingBottom:16,backgroundColor:'white',flexDirection:'row',justifyContent:'space-between'},title:{fontSize:24,fontWeight:'900',color:COLORS.text},content:{padding:20,paddingBottom:110},label:{fontSize:12,fontWeight:'900',color:COLORS.textSecondary,letterSpacing:1,marginTop:20,marginBottom:8},search:{height:52,borderRadius:16,backgroundColor:'white',flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:8},searchInput:{flex:1,color:COLORS.text},toggle:{marginTop:18,backgroundColor:'white',borderRadius:16,padding:15,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},fieldTitle:{color:COLORS.text,fontWeight:'800'},hint:{color:COLORS.textSecondary,fontSize:12,marginTop:3},select:{minHeight:52,backgroundColor:'white',borderRadius:16,paddingHorizontal:14,justifyContent:'center',color:COLORS.text},row:{flexDirection:'row',gap:9},half:{flex:1,height:52,backgroundColor:'white',borderRadius:16,paddingHorizontal:14},chip:{paddingHorizontal:12,paddingVertical:12,borderRadius:14,backgroundColor:'white',alignItems:'center'},chipActive:{backgroundColor:COLORS.primary},chipText:{fontSize:11,fontWeight:'900',color:COLORS.textSecondary},chipTextActive:{color:'white'},footer:{position:'absolute',bottom:0,left:0,right:0,padding:16,backgroundColor:'white',flexDirection:'row',gap:10},clear:{flex:1,height:54,borderRadius:27,borderWidth:1,borderColor:COLORS.primary,alignItems:'center',justifyContent:'center'},clearText:{color:COLORS.primary,fontWeight:'900'},apply:{flex:2,height:54,borderRadius:27,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center'},applyText:{color:'white',fontWeight:'900'}
});

export {EMPTY_DISCOVERY_FILTERS};
export default DiscoveryFilterModal;
