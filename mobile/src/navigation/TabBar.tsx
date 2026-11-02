// Floating tab bar from the design; the dealer's centre "+" raises a case.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../components/Icon';
import { colors, fonts } from '../theme';

export const TAB_META: Record<string, { label: string; icon: IconName }> = {
  Home: { label: 'Home', icon: 'home' },
  Cases: { label: 'Cases', icon: 'cases' },
  NewCase: { label: 'New case', icon: 'plus' },
  Updates: { label: 'Updates', icon: 'bell' },
  Assign: { label: 'Assign', icon: 'swap' },
  Account: { label: 'Account', icon: 'user' },
};

export function TabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { bottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name];
        const label = (descriptors[route.key].options.title as string | undefined) ?? meta.label;
        const onPress = () => {
          if (route.name === 'NewCase') {
            navigation.getParent()?.navigate('CreateType');
            return;
          }
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        };
        if (route.name === 'NewCase') {
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="button" accessibilityLabel="Raise a new case" testID="tabs.newCase" style={s.fab}>
              <Icon name="plus" color={colors.paper} size={26} />
            </Pressable>
          );
        }
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            testID={`tabs.${route.name.toLowerCase()}`}
            style={[s.tab, focused && s.tabOn]}
          >
            <Icon name={meta.icon} color={focused ? colors.primary : colors.inkMuted} />
            <Text style={[s.label, focused && { color: colors.primary }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute', left: 12, right: 12, height: 68, backgroundColor: colors.paper, borderRadius: 24,
    borderWidth: 1, borderColor: '#E4E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 6, elevation: 10, shadowColor: '#102048', shadowOpacity: 0.16, shadowRadius: 17, shadowOffset: { width: 0, height: 14 },
  },
  tab: { minWidth: 60, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 6 },
  tabOn: { backgroundColor: '#EAF1FB' },
  label: { fontFamily: fonts.bold, fontSize: 11, color: colors.inkMuted },
  fab: {
    width: 56, height: 56, borderRadius: 19, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: -28,
    elevation: 8, shadowColor: colors.brand, shadowOpacity: 0.35, shadowRadius: 11, shadowOffset: { width: 0, height: 12 },
  },
});
