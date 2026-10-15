import { withRouteSafety, backOrMain } from '../../navigation/routeSafety';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState, View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const VideoStoryMedia = ({ uri }) => {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const player = useVideoPlayer(uri || '', (playerInstance) => {
    playerInstance.loop = false;
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      // Pause immediately, before a render/effect can resume playback.
      if (state !== 'active') player.pause();
      setForeground(state === 'active');
    });
    return () => subscription.remove();
  }, [player]);
  useEffect(() => {
    if (focused && foreground) player.play();
    else player.pause();
    return () => player.pause();
  }, [player, focused, foreground]);

  return (
    <VideoView
      style={styles.media}
      player={player}
      contentFit="cover"
      nativeControls={false}
    />
  );
};

const StoryMedia = ({ story }) => {
  if (story?.type === 'video') {
    return <VideoStoryMedia uri={story?.uri} />;
  }

  return <Image source={{ uri: story?.uri }} style={styles.media} contentFit="cover" />;
};

const StoryViewerScreen = ({ route = {}, navigation }) => {
  const stories = useMemo(() => route.params?.stories || [], [route.params?.stories]);
  const userName = route.params?.userName || 'Story';
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { setIndex(0); }, [stories]);

  const selectedStory = stories[index];
  const currentStory = Number.isFinite(selectedStory?.expiresAtMs) && selectedStory.expiresAtMs > now ? selectedStory : null;
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const remaining = selectedStory?.expiresAtMs - Date.now();
    const timer = remaining > 0 ? setTimeout(update, Math.min(remaining, 2147483647)) : undefined;
    const subscription = AppState.addEventListener('change', update);
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [selectedStory]);

  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    backOrMain(navigation);
  };

  const goPrevious = () => {
    if (index > 0) {
      setIndex((current) => current - 1);
    }
  };

  if (!currentStory) {
    return (
      <View style={styles.emptyContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={() => backOrMain(navigation)}>
          <X color="white" size={26} />
        </TouchableOpacity>
        <Text style={styles.emptyText}>No story available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StoryMedia key={currentStory.id || currentStory.uri || index} story={currentStory} />

      <View style={styles.progressRow}>
        {stories.map((story, storyIndex) => (
          <View key={story.id || story.uri || storyIndex} style={styles.progressTrack}>
            <View style={[styles.progressFill, storyIndex <= index && styles.progressFillActive]} />
          </View>
        ))}
      </View>

      <View style={styles.header}>
        <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
        <TouchableOpacity style={styles.closeTap} onPress={() => backOrMain(navigation)}>
          <X color="white" size={26} />
        </TouchableOpacity>
      </View>

      <View style={styles.tapRow}>
        <TouchableOpacity style={styles.tapZone} onPress={goPrevious} activeOpacity={1} />
        <TouchableOpacity style={styles.tapZone} onPress={goNext} activeOpacity={1} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  media: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  progressRow: { position: 'absolute', top: 48, left: 12, right: 12, flexDirection: 'row' },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', marginHorizontal: 2, overflow: 'hidden' },
  progressFill: { height: '100%', width: 0, backgroundColor: 'white' },
  progressFillActive: { width: '100%' },
  header: { position: 'absolute', top: 58, left: 16, right: 12, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userName: { color: 'white', fontSize: 16, fontWeight: '700', maxWidth: width - 80, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  closeTap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  tapRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', paddingTop: 110 },
  tapZone: { flex: 1 },
  emptyContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', top: 54, right: 14, padding: 8 },
  emptyText: { color: 'white', fontSize: 16 },
});

export default withRouteSafety('StoryViewer', StoryViewerScreen);
