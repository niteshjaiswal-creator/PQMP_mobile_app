// Support desk update sheet (DeskUpdate board; FLOW-03; SRS 4.3, 5, 8.8, 9.4.1; API spec §15.1).
// Add update (remark + optional status from actions.allowedStatuses, dealer-visible or internal),
// Ask dealer (clarification request) or Close (final remarks, confirmed first). Input is kept on failure.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, userMessageFor } from '../../api';
import type { CaseDetail } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Button, Chip, TextField, L } from '../../components/ui';
import { attachmentProblem } from '../../domain/attachment-policy';
import { portalStatusLabel } from '../../domain/case-status';
import {
  DESK_REMARK_MAX,
  emptyDeskUpdate,
  hasErrors,
  remarkLabel,
  toUpdateInput,
  validateDeskUpdate,
  type DeskAction,
  type DeskUpdateErrors,
  type DeskUpdateForm,
} from '../../domain/desk-update';
import { colors, fonts, spacing, type } from '../../theme';
import { chooseAndPick } from '../attachments/pickFile';

type Props = {
  detail: CaseDetail;
  visible: boolean;
  initialAction: DeskAction;
  onClose: () => void;
  onDone: () => void;
};

const ACTIONS: { key: DeskAction; label: string }[] = [
  { key: 'update', label: 'Add update' },
  { key: 'clarify', label: 'Ask dealer' },
  { key: 'close', label: 'Close' },
];

const SUBMIT: Record<DeskAction, string> = { update: 'Save update', clarify: 'Send to dealer', close: 'Close case' };

export function UpdateCaseSheet({ detail, visible, initialAction, onClose, onDone }: Props) {
  const [form, setForm] = useState<DeskUpdateForm>(() => emptyDeskUpdate(initialAction));
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [errors, setErrors] = useState<DeskUpdateErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const allowed = detail.actions.allowedStatuses;

  const patch = (p: Partial<DeskUpdateForm>) => {
    setForm(f => ({ ...f, ...p }));
    setErrors({});
    setSubmitError(null);
    setConfirming(false);
  };

  const attach = async () => {
    setFileError(null);
    const picked = await chooseAndPick();
    if (!picked) return;
    const problem = attachmentProblem(picked.file, files.length);
    if (problem) return setFileError(problem);
    setUploading(true);
    try {
      const up = await api.uploadAttachment(picked.file, 'comment', picked.source);
      setFiles(list => [...list, { id: up.id, name: up.fileName || picked.file.name }]);
    } catch (err) {
      setFileError(userMessageFor(err));
    } finally {
      setUploading(false);
    }
  };

  const send = async () => {
    setBusy(true);
    setSubmitError(null);
    try {
      await api.updateCase(detail.id, toUpdateInput({ ...form, attachmentIds: files.map(f => f.id) }));
      onDone();
    } catch (err) {
      setConfirming(false);
      setSubmitError(userMessageFor(err)); // everything typed stays in the sheet
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const e = validateDeskUpdate(form, allowed);
    setErrors(e);
    if (hasErrors(e)) return;
    if (form.action === 'close') return setConfirming(true);
    send();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Update case" subtitle={detail.caseNumber} testID="deskUpdate">
      <View style={s.field}>
        <Text style={s.label}>What are you doing?</Text>
        <View style={s.seg} accessibilityRole="tablist">
          {ACTIONS.map(a => (
            <Pressable
              key={a.key}
              onPress={() => patch({ action: a.key })}
              style={[s.segItem, form.action === a.key && s.segOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: form.action === a.key }}
              accessibilityLabel={a.label}
              testID={`deskUpdate.action.${a.key}`}
            >
              <Text style={[s.segText, form.action === a.key && { color: colors.primary }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {form.action === 'update' ? (
        <View style={s.field}>
          <Text style={s.label}>Status</Text>
          {allowed.length ? (
            <>
              <View style={s.chips}>
                {allowed.map(st => (
                  <Chip
                    key={st}
                    label={portalStatusLabel(st)}
                    selected={form.status === st}
                    onPress={() => patch({ status: form.status === st ? null : st })}
                    testID={`deskUpdate.status.${st.replace(/\s+/g, '')}`}
                  />
                ))}
              </View>
              <Text style={s.hint}>{`Only the statuses allowed from ${portalStatusLabel(detail.status)} are shown. Leave unselected to keep the status.`}</Text>
            </>
          ) : (
            <Text style={s.hint} testID="deskUpdate.noStatuses">The status can't be changed from here right now. You can still add a remark.</Text>
          )}
          {errors.status ? <Text style={s.err} testID="deskUpdate.statusError">{errors.status}</Text> : null}
        </View>
      ) : null}

      <TextField
        label={remarkLabel(form.action)}
        required
        value={form.remark}
        onChangeText={t => patch({ remark: t })}
        multiline
        maxLength={DESK_REMARK_MAX}
        error={errors.remark}
        hint={form.action === 'close' ? 'The dealer sees this as the case resolution.' : form.action === 'clarify' ? 'The dealer is asked to reply to this.' : undefined}
        testID="deskUpdate.remark"
      />

      {form.action === 'update' ? (
        <Pressable
          style={s.check}
          onPress={() => patch({ showToDealer: !form.showToDealer })}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.showToDealer }}
          accessibilityLabel="Show to dealer"
          testID="deskUpdate.showToDealer"
        >
          <View style={[s.box, form.showToDealer && s.boxOn]}>{form.showToDealer ? <Icon name="check" color={colors.paper} size={16} /> : null}</View>
          <View style={L.flex1}>
            <Text style={s.checkTitle}>Show to dealer</Text>
            <Text style={s.hint}>{form.showToDealer ? 'Untick to keep it as an internal remark' : 'Internal remark: the dealer will not see it'}</Text>
          </View>
        </Pressable>
      ) : (
        <Text style={s.hint} testID="deskUpdate.visibleNote">The dealer will see this.</Text>
      )}

      {files.map((f, i) => (
        <View key={f.id} style={s.file} testID={`deskUpdate.file.${i}`}>
          <Icon name="file" color={colors.inkMuted} size={18} />
          <Text style={s.fileName} numberOfLines={1}>{f.name}</Text>
          <Pressable onPress={() => setFiles(list => list.filter(x => x.id !== f.id))} accessibilityRole="button" accessibilityLabel={`Remove ${f.name}`} hitSlop={8} testID={`deskUpdate.file.${i}.remove`}>
            <Icon name="close" color={colors.inkMuted} size={18} />
          </Pressable>
        </View>
      ))}
      <Button label="Attach file" icon="clip" variant="ghost" onPress={attach} loading={uploading} testID="deskUpdate.attach" />
      {fileError ? <Text style={s.err} testID="deskUpdate.fileError">{fileError}</Text> : null}

      {submitError ? <Text style={s.err} testID="deskUpdate.error">{submitError}</Text> : null}

      {confirming ? (
        <View style={s.confirm} testID="deskUpdate.confirm">
          <Text style={s.confirmTitle}>Close this case?</Text>
          <Text style={s.confirmBody}>The dealer will see your final remarks as the resolution and can then rate the case.</Text>
          <Button label="Yes, close case" variant="danger" onPress={send} loading={busy} testID="deskUpdate.confirmClose" />
          <Button label="Go back" variant="ghost" onPress={() => setConfirming(false)} disabled={busy} testID="deskUpdate.cancelClose" />
        </View>
      ) : (
        <Button label={SUBMIT[form.action]} variant={form.action === 'close' ? 'danger' : 'primary'} onPress={submit} loading={busy} disabled={uploading} testID="deskUpdate.submit" />
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkStrong },
  hint: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted },
  err: { ...type.caption, fontFamily: fonts.semibold, color: colors.danger },
  seg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, backgroundColor: colors.track },
  segItem: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segOn: { backgroundColor: colors.paper, elevation: 2, shadowColor: '#102048', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  segText: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  file: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12, backgroundColor: colors.rowTint },
  fileName: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  confirm: { gap: spacing.md, padding: spacing.lg, borderRadius: 18, backgroundColor: colors.dangerTint, borderWidth: 1, borderColor: colors.dangerBorder },
  confirmTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  confirmBody: { ...type.bodySmall, color: colors.inkStrong },
});
