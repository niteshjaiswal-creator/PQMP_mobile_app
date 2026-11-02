// New case, step 1: category and sub-category (CREATE-01/02/03, SRS 6.2, 9.1.1–2). Values come from
// the portal masters; only creatable sub-types are offered.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, userMessageFor } from '../../api';
import { Screen } from '../../components/Screen';
import { ErrorState, LoadingState } from '../../components/states';
import { Button, Card, Chip, Divider, IconButton } from '../../components/ui';
import { useCreateCase } from '../../features/create/CreateCaseContext';
import { Steps, stepLabel } from '../../features/create/StepHeader';
import { useQuery } from '../../hooks/useQuery';
import type { RootScreenProps } from '../../navigation/types';
import { colors, fonts, spacing } from '../../theme';

export function CreateTypeScreen({ navigation }: RootScreenProps<'CreateType'>) {
  const { draft, start } = useCreateCase();
  const types = useQuery(() => api.getCaseTypes(), []);
  const [typeId, setTypeId] = useState(draft.caseTypeId);
  const [subTypeId, setSubTypeId] = useState(draft.subTypeId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = async () => {
    const t = types.data?.find(x => x.id === typeId);
    if (!t || !subTypeId) return setError('Choose a category and a sub-category.');
    setBusy(true);
    setError(null);
    try {
      const form = await api.getSubTypeForm(subTypeId);
      start(t, subTypeId, form);
      navigation.navigate(form.referenceStep.kinds.length ? 'CreateReference' : 'CreateDetails');
    } catch (err) {
      setError(userMessageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const close = <IconButton icon="close" label="Cancel new case" onPress={navigation.goBack} testID="createType.cancel" />;

  return (
    <Screen title="New case" left={close} right={stepLabel(1)} testID="createType" scroll={!types.loading && !types.error}
      footer={
        <View style={s.footer}>
          {error ? <Text style={s.err} testID="createType.error">{error}</Text> : null}
          <Button label="Continue" onPress={next} loading={busy} disabled={!subTypeId} testID="createType.continue" />
        </View>
      }
    >
      <Steps current={1} />
      <Text style={s.h1}>What is the case about?</Text>
      {types.loading ? (
        <LoadingState />
      ) : types.error || !types.data ? (
        <ErrorState message={types.error ?? ''} onRetry={types.reload} testID="createType.loadError" />
      ) : (
        <Card>
          {types.data.map((t, i) => {
            const on = t.id === typeId;
            const subs = t.subTypes.filter(st => st.creatable);
            return (
              <View key={t.id} style={on && { backgroundColor: colors.rowTint }}>
                {i ? <Divider /> : null}
                <Pressable
                  style={s.row}
                  onPress={() => {
                    setTypeId(t.id);
                    if (!on) setSubTypeId(subs.length === 1 ? subs[0].id : undefined);
                    setError(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={t.label}
                  testID={`createType.category.${t.id}`}
                >
                  <View style={[s.radio, on && s.radioOn]} />
                  <Text style={s.label}>{t.label}</Text>
                </Pressable>
                {on ? (
                  <View style={s.subs}>
                    <Text style={s.cap}>
                      Sub-category <Text style={{ color: colors.danger }}>*</Text>
                    </Text>
                    <View style={s.chips}>
                      {subs.map(st => (
                        <Chip key={st.id} label={st.label} selected={subTypeId === st.id} onPress={() => { setSubTypeId(st.id); setError(null); }} testID={`createType.subCategory.${st.id}`} />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  h1: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 56 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C9D6EA', backgroundColor: colors.paper },
  radioOn: { borderWidth: 7, borderColor: colors.primary },
  label: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink, flex: 1 },
  subs: { paddingLeft: 50, paddingRight: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  cap: { fontFamily: fonts.semibold, fontSize: 12, color: colors.inkMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { padding: spacing.lg, paddingHorizontal: spacing.xl, gap: spacing.sm, backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.divider },
  err: { fontFamily: fonts.semibold, fontSize: 12, color: colors.danger },
});
