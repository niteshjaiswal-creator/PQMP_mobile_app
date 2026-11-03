// Building blocks for the management reports screen (analysis/design/project/MgmtHome.dc.html).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StatusTone } from '../../domain/case-status';
import { colors, fonts, spacing, type } from '../../theme';
import { displayCount, type BarRow } from './report-view';

/** Bar colour per status family, matching the status pills. */
export const TONE_COLOR: Record<StatusTone, string> = {
  new: colors.info,
  assigned: colors.assigned,
  progress: '#B26A00',
  hold: colors.neutral,
  escalated: colors.escalated,
  closed: colors.success,
  reopened: colors.danger,
};

/** Summary tile; pressing it opens the matching My Cases list. */
export function Tile({ label, value, color = colors.ink, onPress, testID }: { label: string; value: number; color?: string; onPress: () => void; testID: string }) {
  const shown = displayCount(value);
  return (
    <Pressable style={s.tile} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${shown}. Open the list`} testID={testID}>
      <Text style={[s.tileValue, { color }]} testID={`${testID}.value`}>{shown}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </Pressable>
  );
}

/** Labelled horizontal bars scaled to the largest value. */
export function ReportBars({ rows, testID }: { rows: (BarRow & { color?: string })[]; testID: string }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <View style={s.bars}>
      {rows.map(r => (
        <View key={r.key} style={s.bar} accessible accessibilityLabel={`${r.label}: ${r.value}`} testID={`${testID}.${r.key}`}>
          <View style={s.barLabel}>
            <Text style={s.barName} numberOfLines={1}>{r.label}</Text>
            <Text style={s.barValue}>{displayCount(r.value)}</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${(r.value / max) * 100}%`, backgroundColor: r.color ?? colors.primary }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Rating bars from 5 stars down to 1 (14.7). */
export function RatingBars({ rows }: { rows: { rating: number; count: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <View style={s.ratingBars}>
      {rows.map(r => (
        <View key={r.rating} style={s.ratingRow} accessible accessibilityLabel={`${r.rating} ${r.rating === 1 ? 'star' : 'stars'}: ${r.count}`} testID={`reports.feedback.rating.${r.rating}`}>
          <Text style={s.ratingLabel}>{r.rating}</Text>
          <View style={[s.track, s.flex1]}>
            <View style={[s.fill, s.ratingFill, { width: `${(r.count / max) * 100}%` }]} />
          </View>
          <Text style={s.ratingCount}>{r.count}</Text>
        </View>
      ))}
    </View>
  );
}

export type WorkloadRow = { key: string; name: string; open: number; closed: number | null; transferred: number | null; alert?: boolean };

/** Support desk workload table (14.8): open, closed and transferred per desk, then unassigned. */
export function WorkloadTable({ rows }: { rows: WorkloadRow[] }) {
  return (
    <View>
      <View style={s.tr}>
        <Text style={[s.th, s.nameCol]}>Desk</Text>
        <Text style={s.th}>Open</Text>
        <Text style={s.th}>Closed</Text>
        <Text style={s.th}>Transferred</Text>
      </View>
      {rows.map(r => (
        <View
          key={r.key}
          style={s.tr}
          accessible
          accessibilityLabel={`${r.name}: ${displayCount(r.open)} open${r.closed != null ? `, ${r.closed} closed` : ''}${r.transferred != null ? `, ${r.transferred} transferred` : ''}`}
          testID={`reports.workload.${r.key}`}
        >
          <Text style={[s.td, s.nameCol, s.bold]} numberOfLines={1}>{r.name}</Text>
          <Text style={[s.td, s.bold, r.alert && r.open > 0 ? { color: colors.danger } : null]} testID={`reports.workload.${r.key}.open`}>{displayCount(r.open)}</Text>
          <Text style={s.td}>{displayCount(r.closed)}</Text>
          <Text style={s.td}>{displayCount(r.transferred)}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  tile: { flexBasis: '47%', flexGrow: 1, borderRadius: 18, padding: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: '#E4E8F0' },
  tileValue: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5 },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkMuted },
  bars: { gap: spacing.md },
  bar: { gap: 5 },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  barName: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, flexShrink: 1 },
  barValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkMuted },
  track: { height: 8, borderRadius: 8, backgroundColor: colors.divider, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  ratingBars: { flex: 1, gap: 6 },
  ratingFill: { backgroundColor: '#B26A00' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingLabel: { ...type.caption, fontFamily: fonts.bold, color: colors.inkMuted, width: 10 },
  ratingCount: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted, minWidth: 22, textAlign: 'right' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 6 },
  th: { flex: 1, ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted, textAlign: 'right' },
  td: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, textAlign: 'right' },
  nameCol: { flex: 1.4, textAlign: 'left' },
  bold: { fontFamily: fonts.extrabold },
});
