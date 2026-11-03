// Shared building blocks from the PQMP Final Design (analysis/design/app.css).
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radius, spacing, type } from '../theme';
import { Icon, type IconName } from './Icon';
import { statusTone, fromPortalStatus, portalStatusLabel, type StatusTone } from '../domain/case-status';

export function Card({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'brand';
  small?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', small, loading, disabled, icon, testID, style }: ButtonProps) {
  const fg = variant === 'ghost' ? colors.primary : colors.paper;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && { backgroundColor: colors.danger },
        variant === 'brand' && { backgroundColor: colors.brand },
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} color={fg} size={18} /> : null}
      <Text style={[styles.btnText, small && styles.btnTextSmall, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, testID, dot }: { icon: IconName; label: string; onPress: () => void; testID?: string; dot?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} style={styles.iconBtn}>
      <Icon name={icon} color={colors.ink} />
      {dot ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, testID }: { label: string; selected?: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, selected && { color: colors.paper }]}>{label}</Text>
    </Pressable>
  );
}

const TONES: Record<StatusTone, [string, string]> = {
  new: [colors.infoTint, colors.info],
  assigned: [colors.assignedTint, colors.assigned],
  progress: [colors.warningTint, colors.warning],
  hold: [colors.neutralTint, colors.neutral],
  escalated: [colors.escalatedTint, colors.escalated],
  closed: [colors.successTint, colors.success],
  reopened: [colors.dangerTint, colors.danger],
};

/** Status badge from a portal status value (LIST-05). */
export function StatusPill({ status, testID, internalView }: { status: string | null | undefined; testID?: string; internalView?: boolean }) {
  const [bg, fg] = TONES[statusTone(fromPortalStatus(status))];
  return <Pill label={portalStatusLabel(status, internalView)} bg={bg} fg={fg} testID={testID} />;
}

export function Pill({ label, bg, fg, testID }: { label: string; bg: string; fg: string; testID?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]} testID={testID}>
      <View style={[styles.pillDot, { backgroundColor: fg }]} />
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Tag({ label, tone = 'neutral', icon, testID }: { label: string; tone?: 'neutral' | 'red' | 'blue' | 'green'; icon?: IconName; testID?: string }) {
  const [bg, fg] =
    tone === 'red' ? [colors.brandTint, colors.danger]
    : tone === 'blue' ? [colors.infoTint, colors.info]
    : tone === 'green' ? [colors.successTint, colors.success]
    : [colors.divider, colors.inkStrong];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]} testID={testID}>
      {icon ? <Icon name={icon} color={fg} size={14} /> : null}
      <Text style={[styles.tagText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Label/value row. Values must already be display-safe (display.ts). */
export function KeyValue({ label, value, muted, testID, first }: { label: string; value: string; muted?: boolean; testID?: string; first?: boolean }) {
  return (
    <View style={[styles.kv, !first && styles.kvBorder]} testID={testID}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, muted && styles.kvMuted]}>{value}</Text>
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; required?: boolean; error?: string; hint?: string; testID?: string; multiline?: boolean };

export function TextField({ label, required, error, hint, testID, multiline, style, ...rest }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        placeholderTextColor={colors.inkSubtle}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMulti, !!error && styles.inputErr, style]}
        {...rest}
      />
      {error ? (
        <Text style={styles.errText} testID={testID ? `${testID}Error` : undefined}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {children}
      </Text>
      {right}
    </View>
  );
}

export function ListRow({
  title, subtitle, icon, iconTint, iconColor, onPress, testID, right, highlight,
}: {
  title: string; subtitle?: string; icon?: IconName; iconTint?: string; iconColor?: string;
  onPress?: () => void; testID?: string; right?: React.ReactNode; highlight?: boolean;
}) {
  const body = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: iconTint ?? colors.infoTint }]}>
          <Icon name={icon} color={iconColor ?? colors.info} />
        </View>
      ) : null}
      <View style={L.flex1}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevronRight" color={colors.inkMuted} /> : null)}
    </>
  );
  const rowStyle = [styles.row, highlight && { backgroundColor: colors.rowTint }];
  return onPress ? (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} onPress={onPress} style={rowStyle}>
      {body}
    </Pressable>
  ) : (
    <View testID={testID} style={rowStyle}>
      {body}
    </View>
  );
}

export const Divider = () => <View style={styles.divider} />;

export const styles = StyleSheet.create({
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: '#E4E8F0', borderRadius: 20, overflow: 'hidden' },
  btn: { minHeight: 52, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  btnSmall: { minHeight: 44, alignSelf: 'flex-start' },
  btnGhost: { backgroundColor: colors.paper, borderWidth: 1, borderColor: '#C9D6EA' },
  btnText: { fontFamily: fonts.extrabold, fontSize: 15 },
  btnTextSmall: { fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.divider },
  iconBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: '#E4E8F0', backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.paper },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: '#D6DDE9', backgroundColor: colors.paper, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkStrong },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 26, paddingHorizontal: 10, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: fonts.bold, fontSize: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 24, paddingHorizontal: 8, borderRadius: 8 },
  tagText: { fontFamily: fonts.bold, fontSize: 12 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 10 },
  kvBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  kvLabel: { ...type.bodySmall, fontFamily: fonts.semibold, color: colors.inkMuted },
  kvValue: { ...type.bodySmall, fontFamily: fonts.bold, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  kvMuted: { fontFamily: fonts.semibold, fontStyle: 'italic', color: colors.inkMuted },
  field: { gap: 6 },
  fieldLabel: { ...type.label, color: colors.inkStrong },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#D6DDE9', backgroundColor: colors.paper, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  inputMulti: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  inputErr: { borderColor: colors.danger, backgroundColor: '#FFFAFA' },
  errText: { ...type.caption, fontFamily: fonts.semibold, color: colors.danger },
  hint: { ...type.caption, color: colors.inkMuted },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 56 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  rowSub: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted, marginTop: 2 },
});

/** Small shared layout styles (keeps screens free of inline style objects). */
export const L = StyleSheet.create({
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  gap5: { gap: 5 },
  gap6: { gap: 6 },
  flexGap2: { flex: 1, gap: 2 },
  flexGap6: { flex: 1, gap: 6 },
  mt2: { marginTop: 2 },
  kvCard: { paddingHorizontal: spacing.lg, paddingVertical: 4 },
  tabPad: { paddingBottom: 120 },
});
