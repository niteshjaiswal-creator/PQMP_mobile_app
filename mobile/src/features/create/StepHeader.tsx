import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../theme';

/** Step indicator for the 3-step create flow. */
export function Steps({ current, total = 3 }: { current: number; total?: number }) {
  return (
    <View style={s.row} accessibilityLabel={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[s.bar, i < current && s.on]} />
      ))}
    </View>
  );
}

export const stepLabel = (n: number, total = 3) => <Text style={s.cap}>{`Step ${n} of ${total}`}</Text>;

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 5, borderRadius: 5, backgroundColor: '#E4E8F0' },
  on: { backgroundColor: colors.primary },
  cap: { fontFamily: fonts.semibold, fontSize: 12, color: colors.inkMuted, marginLeft: spacing.sm },
});
