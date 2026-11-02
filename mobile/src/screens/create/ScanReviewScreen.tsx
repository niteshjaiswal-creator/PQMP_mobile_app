// Check document details and choose parts (CREATE-09/10, SCAN-02/03/04, SRS 6.6, 9.1.9–10).
// Values from the lookup (or a scan, once the camera step lands) are editable; missing ones can be typed.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Button, Card, Divider, TextField, L } from '../../components/ui';
import type { ScanValues } from '../../domain/case-validation';
import { displayQuantity, displayText } from '../../domain/display';
import { useCreateCase } from '../../features/create/CreateCaseContext';
import type { RootScreenProps } from '../../navigation/types';
import { colors, fonts, spacing, type } from '../../theme';

export function ScanReviewScreen({ navigation }: RootScreenProps<'ScanReview'>) {
  const { lookup, draft, form, update } = useCreateCase();
  const [values, setValues] = useState<ScanValues>(() => ({
    documentNo: draft.scan?.documentNo ?? lookup?.documentNo ?? '',
    gstNumber: draft.scan?.gstNumber ?? lookup?.gstNumber ?? '',
    sellerGstNumber: draft.scan?.sellerGstNumber ?? lookup?.sellerGstNumber ?? '',
    invoiceReference: draft.scan?.invoiceReference ?? lookup?.invoiceReference ?? '',
  }));
  const parts = lookup?.parts ?? [];
  const [selected, setSelected] = useState<string[]>(() =>
    draft.parts.length ? draft.parts.map(p => p.partNumber) : parts.length === 1 ? [parts[0].partNumber] : [],
  );

  useEffect(() => {
    if (!lookup) navigation.replace('CreateDetails');
  }, [lookup, navigation]);
  if (!lookup) return null;

  const toggle = (no: string) => setSelected(s => (s.includes(no) ? s.filter(x => x !== no) : [...s, no]));
  const set = (k: keyof ScanValues) => (v: string) => setValues(x => ({ ...x, [k]: v }));
  const partsOptional = !form?.parts.required;

  const next = (useParts: boolean) => {
    update(d => ({
      ...d,
      scan: values,
      parts: useParts
        ? parts.filter(p => selected.includes(p.partNumber)).map(p => ({ partNumber: p.partNumber, description: p.description, quantity: p.quantity, hsnCode: p.hsnCode }))
        : [],
    }));
    navigation.navigate('CreateDetails');
  };

  return (
    <Screen
      title="Check details"
      onBack={navigation.goBack}
      testID="scanReview"
      footer={
        <View style={s.footer}>
          <Button label={selected.length ? `Use ${selected.length} part${selected.length > 1 ? 's' : ''}` : 'Choose at least one part'} disabled={!selected.length} onPress={() => next(true)} testID="scanReview.useParts" />
          {partsOptional ? <Button label="Continue without parts" variant="ghost" onPress={() => next(false)} testID="scanReview.skipParts" /> : null}
        </View>
      }
    >
      <Card style={s.ok}>
        <Icon name="check" color={colors.success} />
        <Text style={s.okText}>{`${displayText(lookup.documentType.label)} found. Correct anything that looks wrong.`}</Text>
      </Card>

      <TextField label="Document number" value={values.documentNo} onChangeText={set('documentNo')} autoCapitalize="characters" testID="scanReview.documentNo" />
      <View style={s.two}>
        <View style={L.flex1}>
          <TextField label="GST number" value={values.gstNumber} onChangeText={set('gstNumber')} autoCapitalize="characters" placeholder="Not found: type it" testID="scanReview.gst" />
        </View>
        <View style={L.flex1}>
          <TextField label="Seller GST" value={values.sellerGstNumber} onChangeText={set('sellerGstNumber')} autoCapitalize="characters" placeholder="Not found: type it" testID="scanReview.sellerGst" />
        </View>
      </View>
      <TextField label="Invoice reference" value={values.invoiceReference} onChangeText={set('invoiceReference')} placeholder="Not found: type it if you have it" testID="scanReview.invoiceRef" />

      <View style={{ gap: spacing.sm }}>
        <Text style={s.h2}>Which parts is this case about?</Text>
        <Text style={s.cap}>{`${parts.length} part${parts.length === 1 ? '' : 's'} found · ${selected.length} selected`}</Text>
      </View>
      <Card>
        {parts.map((p, i) => {
          const on = selected.includes(p.partNumber);
          return (
            <React.Fragment key={p.partNumber}>
              {i ? <Divider /> : null}
              <Pressable
                style={s.row}
                onPress={() => toggle(p.partNumber)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${p.partNumber}, ${displayText(p.description)}`}
                testID={`scanReview.part.${i}`}
              >
                <View style={[s.box, on && s.boxOn]}>{on ? <Icon name="check" color={colors.paper} size={16} /> : null}</View>
                <View style={L.flex1}>
                  <Text style={s.partNo}>{p.partNumber}</Text>
                  <Text style={s.cap}>
                    {[displayText(p.description), p.hsnCode ? `HSN ${p.hsnCode}` : null, `Qty ${displayQuantity(p.quantity)}`].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            </React.Fragment>
          );
        })}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  ok: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: '#F3FAF5', borderColor: '#CFE9D6' },
  okText: { ...type.bodySmall, fontFamily: fonts.bold, color: colors.ink, flex: 1 },
  two: { flexDirection: 'row', gap: 10 },
  h2: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  cap: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#C9D6EA', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  partNo: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.sm, backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.divider },
});
