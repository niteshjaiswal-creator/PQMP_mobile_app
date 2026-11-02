// Screen frame: safe area, optional header with back button, pull-to-refresh scroll body.
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';
import { IconButton, L } from './ui';

type Props = {
  title?: string;
  /** Large page title (tab roots) instead of a compact header title. */
  large?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Rendered below the scroll view, e.g. a composer or action bar. */
  footer?: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
  /** Extra bottom padding for the floating tab bar. */
  tabBarSpace?: boolean;
};

export function Screen({ title, large, onBack, right, left, children, refreshing, onRefresh, footer, scroll = true, contentStyle, testID, tabBarSpace }: Props) {
  const insets = useSafeAreaInsets();
  const header =
    title || onBack || right || left ? (
      <View style={[s.header, { paddingTop: insets.top + spacing.md }]}>
        {onBack ? <IconButton icon="back" label="Back" onPress={onBack} testID={testID ? `${testID}.back` : undefined} /> : left}
        {title ? (
          <Text style={large ? s.large : s.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ) : left && !onBack ? null : (
          <View style={L.flex1} />
        )}
        {right}
      </View>
    ) : (
      <View style={{ height: insets.top }} />
    );

  const pad = { paddingBottom: (tabBarSpace ? 110 : spacing.xxl) + (footer ? 0 : insets.bottom) };
  return (
    <View style={s.root} testID={testID}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[s.body, pad, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[s.body, L.flex1, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={{ paddingBottom: insets.bottom }}>{footer}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, backgroundColor: colors.canvas },
  title: { flex: 1, fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  large: { flex: 1, fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.5, color: colors.ink },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg },
});
