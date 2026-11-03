import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Quick filters a dashboard tile opens in My Cases (DASH-04). */
export type CasePreset = 'open' | 'closed' | 'all' | 'inProgress' | 'reply' | 'feedback' | 'orderRelated' | 'oldPending';

export type TabParamList = {
  Home: undefined;
  Cases: { preset?: CasePreset; nonce?: number } | undefined;
  NewCase: undefined;
  /** Admin assignment workbench (SRS 13.12). */
  Assign: { filter?: 'unassigned' | 'assigned' | 'old_pending'; nonce?: number } | undefined;
  Updates: undefined;
  Account: undefined;
};

export type CaseTab = 'overview' | 'order' | 'messages';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  CaseDetail: { caseId: string; tab?: CaseTab };
  CreateType: undefined;
  CreateReference: undefined;
  ScanReview: undefined;
  CreateDetails: undefined;
  CaseCreated: { caseId: string; caseNumber: string };
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
