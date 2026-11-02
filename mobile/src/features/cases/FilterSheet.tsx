// Filter cases by status, category, sub-category, priority, date range and order-related type (LIST-04).
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CaseType, Option } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Button, Chip, L } from '../../components/ui';
import { portalStatusLabel } from '../../domain/case-status';
import { colors, fonts, spacing } from '../../theme';
import { DEFAULT_FILTERS, FILTER_STATUSES, type CaseFilters, type DateRange } from './filters';

type Props = {
  visible: boolean;
  value: CaseFilters;
  caseTypes: CaseType[];
  priorities: Option[];
  onApply: (f: CaseFilters) => void;
  onClose: () => void;
};

const RANGES: { value: DateRange; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export function FilterSheet({ visible, value, caseTypes, priorities, onApply, onClose }: Props) {
  const [f, setF] = useState(value);
  useEffect(() => {
    if (visible) setF(value);
  }, [visible, value]);

  const toggleStatus = (st: (typeof FILTER_STATUSES)[number]) =>
    setF(p => ({ ...p, statuses: p.statuses.includes(st) ? p.statuses.filter(x => x !== st) : [...p.statuses, st] }));
  const type = caseTypes.find(t => t.id === f.caseTypeId);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filter cases"
      testID="filters"
      right={
        <Pressable onPress={() => setF({ ...DEFAULT_FILTERS, statusGroup: value.statusGroup })} accessibilityRole="button" testID="filters.clear" hitSlop={10}>
          <Text style={s.link}>Clear all</Text>
        </Pressable>
      }
    >
      <Group label="Status">
        {FILTER_STATUSES.map(st => (
          <Chip key={st} label={portalStatusLabel(st)} selected={f.statuses.includes(st)} onPress={() => toggleStatus(st)} testID={`filters.status.${st}`} />
        ))}
      </Group>
      <Group label="Category">
        <Chip label="All" selected={!f.caseTypeId} onPress={() => setF(p => ({ ...p, caseTypeId: undefined, subTypeId: undefined }))} testID="filters.category.all" />
        {caseTypes.map(t => (
          <Chip key={t.id} label={t.label} selected={f.caseTypeId === t.id} onPress={() => setF(p => ({ ...p, caseTypeId: t.id, subTypeId: undefined }))} testID={`filters.category.${t.id}`} />
        ))}
      </Group>
      {type ? (
        <Group label="Sub-category">
          <Chip label="All" selected={!f.subTypeId} onPress={() => setF(p => ({ ...p, subTypeId: undefined }))} testID="filters.subCategory.all" />
          {type.subTypes.map(st => (
            <Chip key={st.id} label={st.label} selected={f.subTypeId === st.id} onPress={() => setF(p => ({ ...p, subTypeId: st.id }))} testID={`filters.subCategory.${st.id}`} />
          ))}
        </Group>
      ) : null}
      {priorities.length ? (
        <Group label="Priority">
          <Chip label="Any" selected={!f.priority} onPress={() => setF(p => ({ ...p, priority: undefined }))} testID="filters.priority.any" />
          {priorities.map(o => (
            <Chip key={o.value} label={o.label} selected={f.priority === o.value} onPress={() => setF(p => ({ ...p, priority: o.value }))} testID={`filters.priority.${o.value}`} />
          ))}
        </Group>
      ) : null}
      <Group label="Raised">
        {RANGES.map(r => (
          <Chip key={r.value} label={r.label} selected={f.dateRange === r.value} onPress={() => setF(p => ({ ...p, dateRange: r.value }))} testID={`filters.date.${r.value}`} />
        ))}
      </Group>
      <Pressable
        style={s.check}
        onPress={() => setF(p => ({ ...p, orderRelated: !p.orderRelated }))}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: f.orderRelated }}
        accessibilityLabel="Order-related cases only"
        testID="filters.orderRelated"
      >
        <View style={[s.box, f.orderRelated && s.boxOn]}>{f.orderRelated ? <Icon name="check" color={colors.paper} size={16} /> : null}</View>
        <Text style={s.checkText}>Order-related cases only</Text>
      </Pressable>
      <Button label="Show cases" onPress={() => onApply(f)} testID="filters.apply" />
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={L.gap6}>
      <Text style={s.label}>{label}</Text>
      <View style={s.chips}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkStrong },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#C9D6EA', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
