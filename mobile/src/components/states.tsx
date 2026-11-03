// Loading, error, empty and per-section fallback states (SRS 9.3, 11.9.1, 18.5).
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, type } from '../theme';
import { Icon } from './Icon';
import { Button } from './ui';
import { displayLastRefreshed } from '../domain/display';

export function LoadingState({ testID }: { testID?: string }) {
  return (
    <View style={s.center} testID={testID} accessibilityLabel="Loading">
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

/** Full-screen error with retry. `message` must come from userMessageFor(). */
export function ErrorState({ message, onRetry, testID }: { message: string; onRetry: () => void; testID?: string }) {
  return (
    <View style={s.center} testID={testID}>
      <Icon name="info" color={colors.inkMuted} size={36} />
      <Text style={s.msg}>{message}</Text>
      <View style={s.retry}>
        <Button label="Try again" onPress={onRetry} variant="ghost" small testID={testID ? `${testID}.retry` : undefined} />
      </View>
    </View>
  );
}

export function EmptyState({ title, body, testID }: { title: string; body?: string; testID?: string }) {
  return (
    <View style={[s.center, { paddingVertical: spacing.xxxl }]} testID={testID}>
      <Icon name="cases" color={colors.inkSubtle} size={36} />
      <Text style={s.title}>{title}</Text>
      {body ? <Text style={s.msg}>{body}</Text> : null}
    </View>
  );
}

/** A section that could not load or has no data; the rest of the screen keeps working (11.9.1). */
export function SectionFallback({ message, testID }: { message: string; testID?: string }) {
  return (
    <View style={s.fallback} testID={testID}>
      <Icon name="info" color={colors.inkStrong} size={16} />
      <Text style={s.fallbackText}>{message}</Text>
    </View>
  );
}

/** "Last refreshed" line for order, part and tracking data (9.3.8, ORDER-03, DATA-02). */
export function LastRefreshed({ at, testID }: { at: string | null | undefined; testID?: string }) {
  return (
    <View style={s.refreshed} testID={testID}>
      <Icon name="clock" color={colors.inkMuted} size={16} />
      <Text style={s.refreshedText}>{displayLastRefreshed(at)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  retry: { alignSelf: 'center' },
  title: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink, textAlign: 'center' },
  msg: { ...type.bodySmall, color: colors.inkStrong, textAlign: 'center' },
  fallback: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: spacing.md, borderRadius: 14, backgroundColor: '#F1F4F9' },
  fallbackText: { ...type.bodySmall, color: colors.inkStrong, flex: 1 },
  refreshed: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refreshedText: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted },
});
