import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { creditWalletService } from '../../services/creditWalletService';

const WalletScreen = () => {
  const [wallet, setWallet] = useState(null); const [entries, setEntries] = useState([]); const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { const [next, history] = await Promise.all([creditWalletService.getWallet(), creditWalletService.listHistory()]); setWallet(next); setEntries(history.entries || []); } catch (_) { setError('Wallet information is unavailable. Please try again later.'); } }, []);
  useEffect(() => { load(); }, [load]);
  if (!wallet && !error) return <View style={styles.center}><ActivityIndicator color={COLORS.primary}/><Text style={styles.note}>Loading wallet…</Text></View>;
  return <View style={styles.container}><Text style={styles.title}>Wallet</Text>{error ? <Text style={styles.error}>{error}</Text> : <><View style={styles.balanceCard}><Wallet color={COLORS.white} size={28}/><Text style={styles.balanceLabel}>Available Credits</Text><Text style={styles.balanceValue}>{wallet.totalCredits.toLocaleString()}</Text></View><Text style={styles.historyTitle}>Credit history</Text><FlatList data={entries} keyExtractor={item=>item.id} ListEmptyComponent={<Text style={styles.note}>No Credit activity yet.</Text>} renderItem={({item})=><View style={styles.entry}><Text style={styles.entryType}>{item.type === 'recharge' ? 'Recharge' : item.type === 'bonus_grant' ? 'Bonus' : 'Adjustment'}</Text><Text style={styles.entryAmount}>{item.direction === 'debit' ? '−' : '+'}{item.credits} Credits</Text></View>}/></>}</View>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F7F7F9',padding:20,paddingTop:60},center:{flex:1,alignItems:'center',justifyContent:'center'},title:{color:COLORS.text,fontSize:28,fontWeight:'900',marginBottom:22},balanceCard:{backgroundColor:COLORS.primary,padding:28,borderRadius:22,alignItems:'center'},balanceLabel:{color:'rgba(255,255,255,0.8)',fontSize:15,marginTop:12},balanceValue:{color:COLORS.white,fontSize:34,fontWeight:'900',marginTop:6},historyTitle:{fontSize:20,fontWeight:'800',marginTop:28,marginBottom:12,color:COLORS.text},entry:{backgroundColor:COLORS.white,padding:16,borderRadius:12,marginBottom:8,flexDirection:'row',justifyContent:'space-between'},entryType:{color:COLORS.text,fontWeight:'700'},entryAmount:{color:COLORS.primary,fontWeight:'800'},note:{color:COLORS.textSecondary,textAlign:'center',marginTop:12},error:{color:'#B42318',textAlign:'center',marginTop:30}});
export default WalletScreen;
