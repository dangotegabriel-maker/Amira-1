import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../theme/COLORS';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * width;

const CardStack = ({ data, onSwipeLeft, onSwipeRight, renderCard }) => {
  const [index, setIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (event, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      }
    })
  ).current;

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? width : -width;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction) => {
    const item = data[index];
    direction === 'right' ? onSwipeRight(item) : onSwipeLeft(item);
    position.setValue({ x: 0, y: 0 });
    setIndex(index + 1);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false
    }).start();
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-width * 1.5, 0, width * 1.5],
      outputRange: ['-120deg', '0deg', '120deg']
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }]
    };
  };

  const renderCards = () => {
    if (index >= data.length) {
      return <Text style={styles.noMore}>No more profiles nearby!</Text>;
    }

    return data.map((item, i) => {
      if (i < index) return null;

      if (i === index) {
        return (
          <Animated.View
            key={item.id}
            style={[getCardStyle(), styles.cardStyle, { zIndex: 99 }]}
            {...panResponder.panHandlers}
          >
            {renderCard(item)}
          </Animated.View>
        );
      }

      return (
        <Animated.View key={item.id} style={[styles.cardStyle, { zIndex: -i, top: 10 * (i - index) }]}>
          {renderCard(item)}
        </Animated.View>
      );
    }).reverse();
  };

  return <View style={styles.container}>{renderCards()}</View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', alignItems: 'center' },
  cardStyle: { position: 'absolute', width: width * 0.9, height: height * 0.6, borderRadius: 20, overflow: 'hidden' },
  noMore: { marginTop: 100, fontSize: 18, color: COLORS.textSecondary }
});

export default CardStack;
