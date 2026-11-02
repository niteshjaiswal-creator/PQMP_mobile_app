// Case card for My Cases, home and workbench lists (LIST-02, LIST-05…09).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CaseSummary } from '../api/types';
import { displayDate, displayDateTime, displayText } from '../domain/display';
import { colors, fonts, spacing, type } from '../theme';
import { StatusPill, Tag } from './ui';

const REF_LABEL: Record<string, string> = {
  sales_order: 'SO',
  sap_document: 'SAP doc',
  invoice: 'Invoice',
  po_number: 'PO',
  delivery: 'Delivery',
  chassis: 'Chassis',
};

const REF_NAME: Record<string, string> = {
  sales_order: 'Sales order',
  sap_document: 'SAP document',
  invoice: 'Invoice number',
  po_number: 'PO number',
  delivery: 'Delivery number',
  chassis: 'Chassis number',
};

/** Field label for a reference type, e.g. "Sales order". */
export const referenceName = (t: string) => REF_NAME[t] ?? 'Reference';

export function referenceLabel(ref: { type: string; value: string } | null): string | null {
  return ref ? `${REF_LABEL[ref.type] ?? 'Ref'} ${ref.value}` : null;
}

type Props = { item: CaseSummary; onPress: () => void; testID?: string; compact?: boolean; showDealer?: boolean };

export function CaseCard({ item, onPress, testID, compact, showDealer }: Props) {
  const ref = referenceLabel(item.primaryReference);
  const sub = showDealer && item.dealer ? `${item.dealer.name} (${item.dealer.dealerCode}) · ${item.subType.label}` : `${item.caseType.label} · ${item.subType.label}`;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Case ${item.caseNumber}, ${item.subType.label}`}
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && { borderColor: '#C9D6EA' }]}
    >
      <View style={s.row}>
        <Text style={s.no} testID={testID ? `${testID}.number` : undefined}>
          {item.caseNumber}
        </Text>
        <StatusPill status={item.status} testID={testID ? `${testID}.status` : undefined} />
      </View>
      <Text style={s.sub}>{sub}</Text>
      {!compact ? (
        <View style={s.meta}>
          {item.needsAction === 'reply' ? <Tag label="Needs your reply" tone="red" testID={testID ? `${testID}.needsReply` : undefined} /> : null}
          {item.needsAction === 'feedback' ? <Tag label="Rate this case" tone="red" icon="star" testID={testID ? `${testID}.feedbackPending` : undefined} /> : null}
          {item.priority ? <Tag label={`Priority ${displayText(item.priority.label)}`} /> : null}
          {ref ? <Tag label={ref} /> : null}
          {item.hasConsignment ? <Tag label="Tracking" tone="blue" icon="truck" testID={testID ? `${testID}.tracking` : undefined} /> : null}
          {item.assignedDesk ? <Tag label={item.assignedDesk.name} /> : null}
        </View>
      ) : null}
      <Text style={s.upd} numberOfLines={2}>
        {displayText(item.latestUpdate?.text, displayText(item.summary))}
      </Text>
      {!compact ? (
        <View style={s.foot}>
          <Text style={s.footText}>Raised {displayDate(item.createdAt)}</Text>
          <Text style={s.footText}>Updated {displayDateTime(item.updatedAt)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: '#E4E8F0', borderRadius: 20, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  no: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.ink, flexShrink: 1 },
  sub: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkMuted },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  upd: { ...type.bodySmall, fontSize: 13, color: colors.inkStrong },
  foot: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  footText: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted },
});
