import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DEV_FEATURES } from '../config/devFeatures';
const Surface=({uid,local})=>{if(DEV_FEATURES.enableCallSimulator)return null;const{RtcSurfaceView}=require('react-native-agora');return <RtcSurfaceView style={StyleSheet.absoluteFill} canvas={{uid}} zOrderMediaOverlay={local}/>;};
export const LocalRtcVideoView=({style})=><View style={[styles.base,style]}><Surface uid={0} local /></View>;
export const RemoteRtcVideoView=({uid,style})=><View style={[styles.base,style]}>{uid?<Surface uid={uid}/>:null}</View>;
const styles=StyleSheet.create({base:{overflow:'hidden',backgroundColor:'#17121D'}});
