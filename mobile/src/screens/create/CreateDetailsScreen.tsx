// New case, step 3: details, parts, attachments and submit (CREATE-04/05/07/10/11/12/13, SRS 8.4, 9.1).
// Fields come from the sub-type's form config. On failure every value stays and the errors show
// beside the fields (CREATE-13); the case number is shown only from the server's reply (9.1.7).
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, userMessageFor } from '../../api';
import type { FormField, Option } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Button, Card, Chip, Divider, IconButton, ListRow, TextField, L } from '../../components/ui';
import { attachmentProblem, formatSize } from '../../domain/attachment-policy';
import { buildCreateInput, mapServerErrors, validateDetails, visibleFields } from '../../domain/case-validation';
import { displayText } from '../../domain/display';
import { chooseAndPick } from '../../features/attachments/pickFile';
import { useCreateCase } from '../../features/create/CreateCaseContext';
import { Steps, stepLabel } from '../../features/create/StepHeader';
import type { RootScreenProps } from '../../navigation/types';
import { useUser } from '../../session/SessionContext';
import { colors, fonts, spacing, type } from '../../theme';

const draftId = () => `d_${Date.now().toString(36)}`;

export function CreateDetailsScreen({ navigation }: RootScreenProps<'CreateDetails'>) {
  const user = useUser();
  const { draft, form, caseType, update, setValue, reset } = useCreateCase();
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPart, setNewPart] = useState({ partNumber: '', quantity: '' });
  const [partBusy, setPartBusy] = useState(false);
  const clientDraftId = useRef(draftId());

  useEffect(() => {
    const lists = [...new Set((form?.fields ?? []).map(f => f.optionsList).filter((x): x is string => !!x))];
    lists.forEach(list =>
      api.getOptions(list).then(o => setOptions(prev => ({ ...prev, [list]: o }))).catch(() => undefined),
    );
  }, [form]);

  if (!form) return null;
  const sub = caseType?.subTypes.find(st => st.id === draft.subTypeId);
  const fields = visibleFields(form, draft.values);
  const ordered = [...fields.filter(f => f.key === 'issueTitle' || f.key === 'problemStatement'), ...fields.filter(f => f.key !== 'issueTitle' && f.key !== 'problemStatement')];

  const change = (key: string) => (v: string) => {
    setValue(key, v);
    if (errors[key]) {
      const rest = { ...errors, [key]: '' };
      setErrors(rest);
      // Drop "Some details need attention" once the last highlighted field is fixed.
      if (!Object.values(rest).some(Boolean)) setBanner(null);
    }
  };

  const addFile = async () => {
    setErrors(e => ({ ...e, attachments: '' }));
    const picked = await chooseAndPick();
    if (!picked) return;
    const problem = attachmentProblem(picked.file, draft.files.length, { maxSizeMb: form.attachments.maxSizeMb, mimeTypes: form.attachments.mimeTypes, max: form.attachments.max });
    if (problem) return setErrors(e => ({ ...e, attachments: problem }));
    setUploading(true);
    try {
      const a = await api.uploadAttachment(picked.file, 'case_create', picked.source);
      update(d => ({ ...d, files: [...d.files, { id: a.id, fileName: picked.file.name || a.fileName, sizeBytes: picked.file.size ?? a.sizeBytes }] }));
    } catch (err) {
      setErrors(e => ({ ...e, attachments: userMessageFor(err) }));
    } finally {
      setUploading(false);
    }
  };

  const addPart = async () => {
    const no = newPart.partNumber.trim().toUpperCase();
    const qty = newPart.quantity.trim() ? Number(newPart.quantity) : null;
    if (!no) return setErrors(e => ({ ...e, parts: 'Enter a part number.' }));
    if (qty !== null && (!Number.isInteger(qty) || qty <= 0)) return setErrors(e => ({ ...e, parts: 'Quantity must be a whole number above zero.' }));
    if (draft.parts.some(p => p.partNumber === no)) return setErrors(e => ({ ...e, parts: 'This part is already in the list.' }));
    setPartBusy(true);
    try {
      const p = await api.lookupPart(no);
      update(d => ({ ...d, parts: [...d.parts, { partNumber: p.partNumber, description: p.description, quantity: qty }] }));
      setNewPart({ partNumber: '', quantity: '' });
      setErrors(e => ({ ...e, parts: '' }));
    } catch (err) {
      setErrors(e => ({ ...e, parts: err instanceof ApiError && err.kind === 'not-found' ? 'We couldn’t find this part number.' : userMessageFor(err) }));
    } finally {
      setPartBusy(false);
    }
  };

  const submit = async () => {
    if (submitting) return;
    const errs = validateDetails(draft, form);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return setBanner('Some details need attention. Check the highlighted fields.');
    const dealerCode = user.activeDealerCode ?? user.dealers[0]?.dealerCode;
    if (!dealerCode) return setBanner('Your account has no dealer mapped. Contact your VECV administrator.');
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await api.createCase(buildCreateInput(draft, form, dealerCode, clientDraftId.current));
      reset();
      navigation.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'CaseCreated', params: { caseId: res.id, caseNumber: res.caseNumber } }] });
    } catch (err) {
      // Everything typed stays in the draft (CREATE-13).
      if (err instanceof ApiError && err.kind === 'validation') {
        const mapped = mapServerErrors(err.fieldErrors);
        setErrors(mapped);
        setBanner(mapped._form ?? err.userMessage);
      } else {
        setBanner(`${userMessageFor(err)} Your details are saved here, so you can try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      title="New case"
      onBack={navigation.goBack}
      right={stepLabel(3)}
      testID="createDetails"
      footer={
        <View style={s.footer}>
          {banner ? (
            <View style={s.banner} testID="createDetails.banner">
              <Icon name="info" color={colors.danger} size={16} />
              <Text style={s.bannerText}>{banner}</Text>
            </View>
          ) : null}
          <Button label="Submit case" variant="brand" onPress={submit} loading={submitting} testID="createDetails.submit" />
        </View>
      }
    >
      <Steps current={3} />
      <View>
        <Text style={s.h1}>Tell us what happened</Text>
        <Text style={s.cap}>{[caseType?.label, sub?.label].filter(Boolean).join(' · ')}</Text>
      </View>

      {ordered.map(f => (
        <Field key={f.key} field={f} value={draft.values[f.key] ?? ''} onChange={change(f.key)} error={errors[f.key]} options={f.optionsList ? options[f.optionsList] : undefined} />
      ))}

      {form.parts.enabled || draft.parts.length ? (
        <View style={{ gap: spacing.sm }} testID="createDetails.parts">
          <Text style={s.label}>
            Parts in this case{form.parts.required ? <Text style={{ color: colors.danger }}> *</Text> : null}
          </Text>
          {draft.parts.length ? (
            <Card>
              {draft.parts.map((p, i) => (
                <React.Fragment key={p.partNumber}>
                  {i ? <Divider /> : null}
                  <ListRow
                    title={p.partNumber}
                    subtitle={[displayText(p.description), p.quantity != null ? `Qty ${p.quantity}` : null].filter(Boolean).join(' · ')}
                    right={<IconButton icon="close" label={`Remove part ${p.partNumber}`} onPress={() => update(d => ({ ...d, parts: d.parts.filter(x => x.partNumber !== p.partNumber) }))} testID={`createDetails.part.${i}.remove`} />}
                    testID={`createDetails.part.${i}`}
                  />
                </React.Fragment>
              ))}
            </Card>
          ) : null}
          {form.parts.enabled ? (
            <View style={s.partRow}>
              <View style={L.flex2}>
                <TextField label="Part number" value={newPart.partNumber} onChangeText={v => setNewPart(p => ({ ...p, partNumber: v }))} autoCapitalize="characters" testID="createDetails.newPart.number" />
              </View>
              <View style={L.flex1}>
                <TextField label="Qty" value={newPart.quantity} onChangeText={v => setNewPart(p => ({ ...p, quantity: v.replace(/\D/g, '') }))} keyboardType="number-pad" maxLength={5} testID="createDetails.newPart.qty" />
              </View>
            </View>
          ) : null}
          {form.parts.enabled ? <Button label="Add part" icon="plus" variant="ghost" small loading={partBusy} onPress={addPart} testID="createDetails.addPart" /> : null}
          {errors.parts ? <Text style={s.err} testID="createDetails.partsError">{errors.parts}</Text> : null}
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }} testID="createDetails.attachments">
        <Text style={s.label}>
          Attachments{form.attachments.required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
        <Card>
          {draft.files.map((f, i) => (
            <React.Fragment key={f.id}>
              <ListRow
                icon="file"
                title={f.fileName}
                subtitle={formatSize(f.sizeBytes)}
                right={<IconButton icon="close" label={`Remove ${f.fileName}`} onPress={() => update(d => ({ ...d, files: d.files.filter(x => x.id !== f.id) }))} testID={`createDetails.file.${i}.remove`} />}
                testID={`createDetails.file.${i}`}
              />
              <Divider />
            </React.Fragment>
          ))}
          <Pressable onPress={addFile} disabled={uploading} style={s.addFile} accessibilityRole="button" accessibilityLabel="Add photo or file" testID="createDetails.addFile">
            <Icon name="clip" color={colors.primary} />
            <Text style={s.addFileText}>{uploading ? 'Uploading…' : 'Add photo or file'}</Text>
          </Pressable>
        </Card>
        <Text style={s.cap}>{`PDF, JPG or PNG, up to ${form.attachments.maxSizeMb} MB each.`}</Text>
        {errors.attachments ? <Text style={s.err} testID="createDetails.attachmentsError">{errors.attachments}</Text> : null}
      </View>
    </Screen>
  );
}

function Field({ field, value, onChange, error, options }: { field: FormField; value: string; onChange: (v: string) => void; error?: string; options?: Option[] }) {
  const testID = `createDetails.${field.key}`;
  if (field.type === 'select' || field.type === 'boolean') {
    const opts = field.type === 'boolean' ? [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] : options ?? [];
    return (
      <View style={L.gap6}>
        <Text style={s.label}>
          {field.label}
          {field.required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
        <View style={s.chips}>
          {opts.length ? opts.map(o => <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} testID={`${testID}.${o.value}`} />) : <Text style={s.cap}>Loading options…</Text>}
        </View>
        {error ? <Text style={s.err} testID={`${testID}Error`}>{error}</Text> : null}
      </View>
    );
  }
  return (
    <TextField
      label={field.label}
      required={field.required}
      value={value}
      onChangeText={onChange}
      error={error || undefined}
      multiline={field.type === 'textarea'}
      maxLength={field.type === 'phone' ? 10 : field.maxLength}
      keyboardType={field.type === 'phone' ? 'phone-pad' : field.type === 'email' ? 'email-address' : field.type === 'number' ? 'number-pad' : 'default'}
      autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
      placeholder={field.type === 'date' ? 'DD/MM/YYYY' : field.key === 'remarks' ? 'Anything else support should know' : undefined}
      hint={field.type === 'textarea' && field.maxLength ? `${value.length} / ${field.maxLength}` : undefined}
      testID={testID}
    />
  );
}

const s = StyleSheet.create({
  h1: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  cap: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted, marginTop: 2 },
  label: { ...type.label, color: colors.inkStrong },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  err: { ...type.caption, fontFamily: fonts.semibold, color: colors.danger },
  partRow: { flexDirection: 'row', gap: 10 },
  addFile: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, minHeight: 52 },
  addFileText: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.primary },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.sm, backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.divider },
  banner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bannerText: { ...type.caption, fontFamily: fonts.semibold, color: colors.danger, flex: 1 },
});
