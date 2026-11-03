// Action bar on case detail for internal roles. Support desk owns "Ask dealer" / "Update case"
// (features/desk/); admin owns "Assign / Transfer" (features/admin/). When a user has both (admin),
// the assign action gets its own full-width row above the desk actions so labels never wrap.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { CaseDetail } from '../../api/types';
import { colors, spacing } from '../../theme';
import { DeskActions } from '../desk/DeskActions';
import { AdminActions } from '../admin/AdminActions';

export function InternalActions({ detail, onChanged }: { detail: CaseDetail; onChanged: () => void }) {
  return (
    <View style={s.bar} testID="caseDetail.internalActions">
      {detail.actions.canAssign ? (
        <View style={s.row}>
          <AdminActions detail={detail} onChanged={onChanged} />
        </View>
      ) : null}
      {detail.actions.canUpdate ? (
        <View style={s.row}>
          <DeskActions detail={detail} onChanged={onChanged} />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.divider },
  row: { flexDirection: 'row', gap: spacing.md },
});
