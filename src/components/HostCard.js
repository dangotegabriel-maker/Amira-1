import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BadgeCheck, Coins, Video } from 'lucide-react-native';
import { getCountryByCode } from '../data/countries';
import { discoveryService } from '../services/discoveryService';

export const getHostCardLabels = (host, { showNewBadge = true, isDev = typeof __DEV__ !== 'undefined' && __DEV__ } = {}) => ({
  showNew: showNewBadge && discoveryService.isNewHost(host),
  showDemo: isDev && host.isDemo === true,
  rate: `${host.hostProfile?.videoRateCredits || 25}/min`,
});
const HostCard = ({ host, onPress, onStoryPress, onCallPress, showNewBadge = true, compact = false, autoCycle = false }) => {
  const country = getCountryByCode(host.countryCode);
  const images = useMemo(() => [host.profilePic, ...(host.hostProfile?.gallery || []).map((item) => typeof item === 'string' ? item : item.url)].filter((uri, index, all) => uri && all.indexOf(uri) === index), [host]);
  const [imageIndex, setImageIndex] = useState(0);
  const callPulse = useRef(new Animated.Value(1)).current;
  const availability = host.hostStatus?.availability || 'offline';
  const labels = getHostCardLabels(host, { showNewBadge });
  useEffect(() => {
    if (!autoCycle || images.length < 2) return undefined;
    const timer = setInterval(() => setImageIndex((current) => (current + 1) % images.length), 6500);
    return () => clearInterval(timer);
  }, [autoCycle, images.length]);
  useEffect(() => {
    if (availability !== 'online' || !onCallPress) return undefined;
    let timeout; let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion || cancelled) return;
      const animate = () => Animated.sequence([
        Animated.timing(callPulse, { toValue: 1.14, duration: 180, useNativeDriver: true }),
        Animated.timing(callPulse, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start(() => { if (!cancelled) timeout = setTimeout(animate, 4500); });
      timeout = setTimeout(animate, 900);
    });
    return () => { cancelled = true; clearTimeout(timeout); callPulse.stopAnimation(); };
  }, [availability, onCallPress, callPulse]);
  return <TouchableOpacity style={[styles.card, compact && styles.compact]} onPress={onPress} activeOpacity={0.9}>
    {images[imageIndex] ? <Image source={{ uri: images[imageIndex] }} style={styles.photo} /> : <View style={[styles.photo, styles.placeholder]}><Text style={styles.letter}>{host.username?.[0] || 'A'}</Text></View>}
    <View style={styles.scrim} />
    {host.hasActiveStory && <TouchableOpacity style={styles.storyRing} onPress={onStoryPress || onPress}><View style={styles.storyInner} /></TouchableOpacity>}
    {availability === 'online' && <View style={styles.online}><View style={styles.dot} /><Text style={styles.onlineText}>ONLINE</Text></View>}
    <View style={styles.badges}>{labels.showNew && <Text style={styles.newBadge}>NEW</Text>}{labels.showDemo && <Text style={styles.demoBadge}>DEMO</Text>}</View>
    <View style={styles.info}><View style={styles.nameRow}><Text style={styles.name} numberOfLines={1}>{host.username}, {host.age || '18+'}</Text><BadgeCheck color="#60A5FA" size={15} /></View><Text style={styles.country}>{country?.flag || ''} {host.countryName || country?.name}</Text><TouchableOpacity disabled={!onCallPress} onPress={onCallPress} style={styles.rate}><Coins color="#FACC15" size={12} />{availability === 'online' && onCallPress && <Animated.View style={{transform:[{scale:callPulse}]}}><Video color="white" size={12}/></Animated.View>}<Text style={styles.rateText}>{labels.rate}</Text></TouchableOpacity></View>
  </TouchableOpacity>;
};
const styles=StyleSheet.create({card:{width:'48.5%',height:245,borderRadius:18,overflow:'hidden',backgroundColor:'#DDD',marginBottom:10},compact:{width:'100%',height:280},photo:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},placeholder:{alignItems:'center',justifyContent:'center',backgroundColor:'#E9D5FF'},letter:{fontSize:50,fontWeight:'900',color:'#7C3AED'},scrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.15)'},storyRing:{position:'absolute',top:10,left:10,width:26,height:26,borderRadius:13,borderWidth:3,borderColor:'#FF2D55',padding:2},storyInner:{flex:1,borderRadius:10,borderWidth:1,borderColor:'white'},online:{position:'absolute',top:11,right:9,backgroundColor:'rgba(0,0,0,.55)',paddingHorizontal:7,paddingVertical:4,borderRadius:10,flexDirection:'row',alignItems:'center',gap:4},dot:{width:6,height:6,borderRadius:3,backgroundColor:'#22C55E'},onlineText:{color:'white',fontSize:8,fontWeight:'900'},badges:{position:'absolute',top:42,left:8,gap:4},newBadge:{backgroundColor:'#FF2D55',color:'white',fontSize:8,fontWeight:'900',paddingHorizontal:6,paddingVertical:3,borderRadius:7},demoBadge:{backgroundColor:'#7C3AED',color:'white',fontSize:8,fontWeight:'900',paddingHorizontal:6,paddingVertical:3,borderRadius:7},info:{position:'absolute',left:10,right:10,bottom:10},nameRow:{flexDirection:'row',alignItems:'center',gap:4},name:{color:'white',fontSize:17,fontWeight:'900',maxWidth:'88%'},country:{color:'white',fontSize:11,marginTop:2},rate:{alignSelf:'flex-start',flexDirection:'row',gap:3,alignItems:'center',marginTop:7,backgroundColor:'rgba(0,0,0,.52)',paddingHorizontal:7,paddingVertical:4,borderRadius:9},rateText:{color:'white',fontSize:9,fontWeight:'900'}});
export default HostCard;
