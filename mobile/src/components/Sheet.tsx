// Bottom sheet used for filters, reopen, assign and update forms.
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';
import { L } from './ui';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  testID?: string;
  right?: React.ReactNode;
};

export function Sheet({ visible, onClose, title, subtitle, children, testID, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={L.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" testID={testID ? `${testID}.scrim` : undefined} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.xl }]} testID={testID}>
          <View style={s.grab} />
          <View style={s.head}>
            <View style={L.flex1}>
              <Text style={s.title} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
            </View>
            {right}
          </View>
          <ScrollView contentContainerStyle={{ gap: spacing.lg }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(20,27,45,0.45)' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.xl, paddingTop: 10, maxHeight: '90%', gap: spacing.lg },
  grab: { width: 44, height: 5, borderRadius: 5, backgroundColor: '#D6DDE9', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.ink },
  sub: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.inkMuted, marginTop: 4 },
});
