// STUB (Phase 4, admin): replaced by the assignment workbench. See analysis/development-plan.md.
import React from 'react';
import { Screen } from '../../components/Screen';
import { EmptyState } from '../../components/states';

export function WorkbenchScreen() {
  return (
    <Screen title="Assign cases" large tabBarSpace testID="workbench">
      <EmptyState title="Assignment workbench" body="Coming in Phase 4." testID="workbench.stub" />
    </Screen>
  );
}
