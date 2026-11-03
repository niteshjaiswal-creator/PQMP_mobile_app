// Admin action on case detail (SRS 6.3.4, 7.15): "Assign" for an unassigned case, "Transfer" for
// an assigned one. Opens the assign sheet; the detail reloads after a successful change.
import React, { useState } from 'react';
import type { CaseDetail } from '../../api/types';
import { Button, L } from '../../components/ui';
import { assignMode } from '../../domain/assignment';
import { AssignSheet } from './AssignSheet';

export function AdminActions({ detail, onChanged }: { detail: CaseDetail; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const transfer = assignMode(detail.assignedDesk?.id) === 'transfer';
  return (
    <>
      <Button label={transfer ? 'Transfer' : 'Assign'} icon="swap" onPress={() => setOpen(true)} style={L.flex1} testID="caseDetail.assign" />
      <AssignSheet
        item={detail}
        visible={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          onChanged();
        }}
      />
    </>
  );
}
