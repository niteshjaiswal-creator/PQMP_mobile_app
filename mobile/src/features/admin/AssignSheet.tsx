// Assign / transfer sheet (SRS 6.3.4, 7.15, 8.10.2; spec §16). Lists desks with their open-case
// workload, suggests and preselects the lowest, blocks the current desk, and asks for a note
// (required on transfer). The backend audits the action; the dealer never sees the desk (6.3.5).
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, api, userMessageFor } from '../../api';
import type { CaseSummary, Desk, PortalStatus } from '../../api/types';
import { Sheet } from '../../components/Sheet';
import { Button, TextField } from '../../components/ui';
import { assignMode, canPickDesk, lowestWorkloadDesk, NOTE_MAX, validateAssignment, type AssignErrors } from '../../domain/assignment';
import { displayText } from '../../domain/display';
import { colors, fonts, spacing, type } from '../../theme';

export type AssignResult = { assignedDesk: { id: string; name: string }; status: PortalStatus };

type Props = {
  item: Pick<CaseSummary, 'id' | 'caseNumber' | 'subType' | 'dealer' | 'assignedDesk'> | null;
  visible: boolean;
  onClose: () => void;
  onDone: (result: AssignResult) => void;
};

export function AssignSheet({ item, visible, onClose, onDone }: Props) {
  const current = item?.assignedDesk?.id ?? null;
  const mode = assignMode(current);
  const [desks, setDesks] = useState<Desk[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deskId, setDeskId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<AssignErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDesks = useCallback(async () => {
    setLoadError(null);
    setDesks(null);
    try {
      const list = await api.listDesks();
      setDesks(list);
      setDeskId(prev => prev ?? lowestWorkloadDesk(list, current)?.id ?? null);
    } catch (err) {
      setLoadError(userMessageFor(err));
    }
  }, [current]);

  // Fresh form for each case the sheet opens on.
  useEffect(() => {
    if (!visible) return;
    setDeskId(null);
    setNote('');
    setErrors({});
    setFormError(null);
    loadDesks();
  }, [visible, item?.id, loadDesks]);

  const lowest = desks ? lowestWorkloadDesk(desks, current) : null;
  const chosen = desks?.find(d => d.id === deskId) ?? null;

  const submit = async () => {
    if (!item) return;
    const problems = validateAssignment({ deskId, note }, current);
    if (problems) return setErrors(problems);
    setBusy(true);
    setFormError(null);
    try {
      const res = await api.assignCase(item.id, { deskId: deskId!, note: note.trim() || null });
      onDone(res);
    } catch (err) {
      // Desk choice and note stay as typed.
      const fe = err instanceof ApiError ? err.fieldErrors : undefined;
      if (fe && (fe.note || fe.deskId)) setErrors({ note: fe.note, deskId: fe.deskId });
      else setFormError(userMessageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const verb = mode === 'transfer' ? 'Transfer' : 'Assign';
  const subtitle = item ? [displayText(item.subType.label), item.dealer ? displayText(item.dealer.name) : null].filter(Boolean).join(' · ') : undefined;

  let desksBody: React.ReactNode;
  if (loadError)
    desksBody = (
      <View style={s.gap}>
        <Text style={s.err} testID="assign.desksError">{loadError}</Text>
        <Button label="Try again" variant="ghost" small onPress={loadDesks} testID="assign.desksRetry" />
      </View>
    );
  else if (!desks) desksBody = <ActivityIndicator color={colors.primary} testID="assign.desksLoading" />;
  else
    desksBody = (
      <View style={s.gap} accessibilityRole="radiogroup">
        {desks.map(d => {
          const disabled = !canPickDesk(d.id, current);
          const on = d.id === deskId;
          const isLowest = d.id === lowest?.id;
          const meta = `${d.open} open${disabled ? ' · current desk' : isLowest ? ' · lowest workload' : ''}`;
          return (
            <Pressable
              key={d.id}
              accessibilityRole="radio"
              accessibilityLabel={`${displayText(d.name)}, ${meta}`}
              accessibilityState={{ selected: on, disabled }}
              disabled={disabled}
              onPress={() => {
                setDeskId(d.id);
                setErrors(e => ({ ...e, deskId: undefined }));
                setFormError(null);
              }}
              style={[s.desk, isLowest && !disabled && s.deskLowest, on && s.deskOn, disabled && s.deskOff]}
              testID={`assign.desk.${d.id}`}
            >
              <View style={[s.radio, on && s.radioOn]}>{on ? <View style={s.radioDot} /> : null}</View>
              <View style={s.flex}>
                <Text style={s.deskName}>{displayText(d.name)}</Text>
                <Text style={[s.deskMeta, isLowest && !disabled && { color: colors.success }]} testID={`assign.desk.${d.id}.meta`}>
                  {meta}
                </Text>
              </View>
            </Pressable>
          );
        })}
        {errors.deskId ? <Text style={s.err} testID="assign.deskError">{errors.deskId}</Text> : null}
      </View>
    );

  return (
    <Sheet visible={visible} onClose={onClose} title={item ? `${verb} ${item.caseNumber}` : verb} subtitle={subtitle} testID="assign">
      {desksBody}
      <TextField
        label="Note"
        required={mode === 'transfer'}
        value={note}
        onChangeText={t => {
          setNote(t);
          setErrors(e => ({ ...e, note: undefined }));
          setFormError(null);
        }}
        multiline
        maxLength={NOTE_MAX}
        placeholder={mode === 'transfer' ? 'Why is this case moving?' : 'Optional'}
        error={errors.note}
        hint={mode === 'transfer' ? 'Required for a transfer. Recorded in the audit trail.' : 'Optional. Recorded in the audit trail.'}
        testID="assign.note"
      />
      {formError ? <Text style={s.err} testID="assign.error">{formError}</Text> : null}
      <Button
        label={chosen ? `${verb} to ${displayText(chosen.name)}` : verb}
        onPress={submit}
        loading={busy}
        disabled={!desks}
        testID="assign.submit"
      />
      <Text style={s.caption} testID="assign.caption">The dealer is not told which desk handles the case.</Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.sm },
  desk: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: '#D6DDE9', backgroundColor: colors.paper },
  deskLowest: { backgroundColor: colors.successTint, borderColor: '#CFE9D6' },
  deskOn: { borderColor: colors.primary, borderWidth: 2 },
  deskOff: { opacity: 0.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#B5C0D3', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  deskName: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  deskMeta: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted, marginTop: 2 },
  err: { ...type.caption, fontFamily: fonts.semibold, color: colors.danger },
  caption: { ...type.caption, color: colors.inkMuted, textAlign: 'center' },
});
