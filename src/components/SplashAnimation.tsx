import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet } from 'react-native';
import { C } from '../theme';

const { width } = Dimensions.get('window');

export default function SplashAnimation({ onDone }: { onDone: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fallback = setTimeout(onDone, 2000);

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: width + 200,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 350,
          delay: 180,
          useNativeDriver: true,
        }),
      ]).start(() => { clearTimeout(fallback); onDone(); });
    }, 900);

    return () => { clearTimeout(timer); clearTimeout(fallback); };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Animated.Image
        source={require('../../assets/icon.png')}
        style={[styles.icon, { transform: [{ translateX }] }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  icon: {
    width: 160,
    height: 160,
    borderRadius: 36,
  },
});
