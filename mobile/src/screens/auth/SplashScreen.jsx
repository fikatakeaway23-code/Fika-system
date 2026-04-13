import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fontSize } from '../../constants/theme.js';

export function SplashScreen({ navigation }) {
  const opacity = new Animated.Value(0);
  const scale   = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('UserSelect');
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrap, { opacity, transform: [{ scale }] }]}>
        {/* Coffee cup */}
        <Text style={styles.cup}>☕</Text>
        <Text style={styles.logo}>FIKA</Text>
        <Text style={styles.tagline}>Fast · Fresh · Consistent · Friendly</Text>
      </Animated.View>

      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.location}>📍 Dillibazar, Kathmandu</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  logoWrap:  { alignItems: 'center' },
  cup:       { fontSize: 72, marginBottom: 16 },
  logo:      { fontSize: fontSize['5xl'], fontWeight: '800', color: colors.secondary, letterSpacing: 4 },
  tagline:   { fontSize: fontSize.sm, color: colors.textInverse, opacity: 0.9, marginTop: 10, letterSpacing: 0.5 },

  dotsRow:   { flexDirection: 'row', gap: 8, marginTop: 80 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: colors.textInverse },

  location:  { position: 'absolute', bottom: 40, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)' },
});
