// Action bar on case detail for internal roles. Support desk (Phase 3) owns the "Update case" /
// "Ask dealer" part (features/desk/); admin (Phase 4) owns "Assign / Transfer" (features/admin/).
// Each agent replaces its own placeholder import below; keep this file as the shared host.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { CaseDetail } from '../../api/types';
import { colors, spacing } from '../../theme';
import { DeskActions } from '../desk/DeskActions';
import { AdminActions } from '../admin/AdminActions';

export function InternalActions({ detail, onChanged }: { detail: CaseDetail; onChanged: () => void }) {
  return (
    <View style={s.bar} testID="caseDetail.internalActions">
      {detail.actions.canAssign ? <AdminActions detail={detail} onChanged={onChanged} /> : null}
      {detail.actions.canUpdate ? <DeskActions detail={detail} onChanged={onChanged} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.divider },
});
