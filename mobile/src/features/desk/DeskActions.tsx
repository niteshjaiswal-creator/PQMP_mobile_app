// Support desk action bar on case detail (Phase 3; FLOW-03; SRS 4.3). Shown inside InternalActions when
// the server says actions.canUpdate. No escalate action: escalation is Phase 2 (API spec §15.1).
import React, { useState } from 'react';
import type { CaseDetail } from '../../api/types';
import { Button, L } from '../../components/ui';
import type { DeskAction } from '../../domain/desk-update';
import { UpdateCaseSheet } from './UpdateCaseSheet';

export function DeskActions({ detail, onChanged }: { detail: CaseDetail; onChanged: () => void }) {
  // A new key per opening gives the sheet a fresh form; input is kept while the sheet stays open.
  const [open, setOpen] = useState<{ action: DeskAction; key: number } | null>(null);
  const show = (action: DeskAction) => setOpen({ action, key: Date.now() });

  return (
    <>
      <Button label="Ask dealer" variant="ghost" onPress={() => show('clarify')} style={L.flex1} testID="caseDetail.askDealer" />
      <Button label="Update case" onPress={() => show('update')} style={L.flex1} testID="caseDetail.updateCase" />
      {open ? (
        <UpdateCaseSheet
          key={open.key}
          detail={detail}
          visible
          initialAction={open.action}
          onClose={() => setOpen(null)}
          onDone={() => {
            setOpen(null);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}
