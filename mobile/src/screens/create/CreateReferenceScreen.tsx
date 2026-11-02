// New case, step 2: order references (CREATE-06, SCAN-04, SRS 6.2.7, 9.1.4). The main reference is
// looked up so the user can review the document's details and pick parts (SCAN-02/03). If the
// lookup service is down the user may still continue (SRS 6.6.8 manual entry is never blocked).
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api, ApiError, userMessageFor } from '../../api';
import type { DocumentLookup } from '../../api/types';
import { Screen } from '../../components/Screen';
import { Button, Card, TextField } from '../../components/ui';
import { REF_FIELD, validateReferences, type RefKind } from '../../domain/case-validation';
import { useCreateCase } from '../../features/create/CreateCaseContext';
import { Steps, stepLabel } from '../../features/create/StepHeader';
import type { RootScreenProps } from '../../navigation/types';
import { colors, fonts, spacing, type } from '../../theme';

const LOOKUP: Partial<Record<RefKind, (no: string) => Promise<DocumentLookup>>> = {
  sales_order: api.lookupSalesOrder,
  invoice: api.lookupInvoice,
  sap_document: api.lookupSapDocument,
};

export function CreateReferenceScreen({ navigation }: RootScreenProps<'CreateReference'>) {
  const { draft, form, caseType, update, setLookup } = useCreateCase();
  const [errors, setErrors] = useState<Partial<Record<RefKind, string>>>({});
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<DocumentLookup | null>(null);
  const [unverified, setUnverified] = useState(false);

  if (!form) return null;
  const sub = caseType?.subTypes.find(s => s.id === draft.subTypeId);

  const setRef = (k: RefKind) => (v: string) => {
    update(d => ({ ...d, references: { ...d.references, [k]: v }, captureMethod: { ...d.captureMethod, [k]: 'manual' } }));
    setErrors(e => ({ ...e, [k]: undefined }));
    setFound(null);
    setUnverified(false);
  };

  const goOn = (doc: DocumentLookup | null) => {
    setLookup(doc);
    if (doc?.poNumber && form.referenceStep.kinds.includes('po_number') && !draft.references.po_number) {
      update(d => ({ ...d, references: { ...d.references, po_number: doc.poNumber! } }));
    }
    navigation.navigate(doc && doc.parts.length ? 'ScanReview' : 'CreateDetails');
  };

  const next = async () => {
    if (found) return goOn(found); // duplicate warning acknowledged
    if (unverified) return goOn(null);
    const errs = validateReferences(draft, form);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    const kind = form.referenceStep.kinds.find(k => LOOKUP[k] && draft.references[k]?.trim());
    if (!kind) return goOn(null);
    setBusy(true);
    try {
      const doc = await LOOKUP[kind]!(draft.references[kind]!.trim());
      if (doc.openCase) setFound(doc);
      else goOn(doc);
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'not-found') setErrors({ [kind]: "We couldn't find this number. Check it and try again." });
      else if (err instanceof ApiError && (err.kind === 'timeout' || err.kind === 'server')) setUnverified(true);
      else setErrors({ [kind]: userMessageFor(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="New case"
      onBack={navigation.goBack}
      right={stepLabel(2)}
      testID="createReference"
      footer={
        <View style={s.footer}>
          <Button
            label={found ? 'Continue anyway' : unverified ? 'Continue without checking' : 'Continue'}
            onPress={next}
            loading={busy}
            testID="createReference.continue"
          />
        </View>
      }
    >
      <Steps current={2} />
      <View>
        <Text style={s.h1}>Which order is it?</Text>
        <Text style={s.cap}>{[caseType?.label, sub?.label].filter(Boolean).join(' · ')}</Text>
      </View>
      <Text style={s.hint}>Type the number from your invoice or order. We'll fetch its details so you can check them.</Text>

      {form.referenceStep.kinds.map((k, i) => (
        <TextField
          key={k}
          label={REF_FIELD[k].label}
          required={form.referenceStep.required && i === 0}
          value={draft.references[k] ?? ''}
          onChangeText={setRef(k)}
          keyboardType={REF_FIELD[k].keyboard}
          maxLength={REF_FIELD[k].max}
          autoCapitalize="characters"
          placeholder={REF_FIELD[k].example}
          error={errors[k]}
          testID={`createReference.${k}`}
        />
      ))}

      {unverified ? (
        <Card style={s.notice} testID="createReference.unverified">
          <Text style={s.noticeText}>We can't check this number right now. You can continue and support will verify it.</Text>
        </Card>
      ) : null}

      {found?.openCase ? (
        <Card style={[s.notice, s.warn]} testID="createReference.duplicate">
          <Text style={s.warnTitle}>A case is already open for this</Text>
          <Text style={s.noticeText}>
            {found.openCase.caseNumber} · {found.openCase.subTypeLabel}. You can follow that case instead of raising a new one.
          </Text>
          <Button
            label="Open existing case"
            variant="ghost"
            small
            // TODO(api-contract): CREATE-06 — openCase carries only the case number; GET /cases/{id} must accept it.
            onPress={() => navigation.navigate('CaseDetail', { caseId: found.openCase!.caseNumber })}
            testID="createReference.openExisting"
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  h1: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  cap: { fontFamily: fonts.semibold, fontSize: 12, color: colors.inkMuted, marginTop: 4 },
  hint: { ...type.bodySmall, color: colors.inkStrong },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.divider },
  notice: { padding: spacing.lg, gap: spacing.sm, backgroundColor: '#F1F4F9' },
  noticeText: { ...type.bodySmall, color: colors.inkStrong },
  warn: { backgroundColor: colors.warningTint, borderColor: '#F0C96A' },
  warnTitle: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.warning },
});
