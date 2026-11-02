// Case registered (CREATE-12, SRS 9.1.7–8): the number shown is the one the server returned.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/ui';
import { SUPPORT_IDENTITY } from '../../domain/case-status';
import type { RootScreenProps } from '../../navigation/types';
import { colors, fonts, spacing, type } from '../../theme';

export function CaseCreatedScreen({ route, navigation }: RootScreenProps<'CaseCreated'>) {
  const insets = useSafeAreaInsets();
  const { caseId, caseNumber } = route.params;
  return (
    <View style={[s.root, { paddingTop: insets.top + 96, paddingBottom: insets.bottom + spacing.xl }]} testID="caseCreated">
      <View style={s.check}>
        <Icon name="check" color={colors.success} size={44} />
      </View>
      <Text style={s.h1} accessibilityRole="header">Case registered</Text>
      <View style={s.numberBox}>
        <Text style={s.cap}>Your case number</Text>
        <Text style={s.number} testID="caseCreated.caseNumber" selectable>{caseNumber}</Text>
      </View>
      <Text style={s.body}>{`${SUPPORT_IDENTITY} will pick it up shortly. You will get an update at every step, and you can follow it under My cases.`}</Text>
      <View style={s.actions}>
        <Button label="View case" onPress={() => navigation.replace('CaseDetail', { caseId })} testID="caseCreated.view" />
        <Button label="Back to home" variant="ghost" onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} testID="caseCreated.home" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', paddingHorizontal: spacing.xl, gap: 18 },
  check: { width: 88, height: 88, borderRadius: 30, backgroundColor: colors.successTint, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.ink },
  numberBox: { alignSelf: 'stretch', borderRadius: 20, backgroundColor: colors.canvas, borderWidth: 1, borderColor: '#E4E8F0', padding: spacing.lg, alignItems: 'center', gap: 4 },
  cap: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted },
  number: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: 0.5, color: colors.ink },
  body: { ...type.body, textAlign: 'center', color: colors.inkStrong, lineHeight: 23 },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: spacing.md },
});
