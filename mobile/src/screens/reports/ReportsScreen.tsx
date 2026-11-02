// STUB (Phase 2, management): replaced by the management reports screen. See analysis/development-plan.md.
import React from 'react';
import { Screen } from '../../components/Screen';
import { EmptyState } from '../../components/states';

export function ReportsScreen() {
  return (
    <Screen title="Reports" large tabBarSpace testID="reports">
      <EmptyState title="Reports" body="Coming in Phase 2." testID="reports.stub" />
    </Screen>
  );
}
