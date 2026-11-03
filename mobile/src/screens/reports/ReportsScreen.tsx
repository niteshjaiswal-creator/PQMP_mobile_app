// Management reports (Phase 2; SRS 4.5, 14.1–14.4, 14.7, 14.8; board MgmtHome.dc.html). Read-only:
// case summary, by category, open cases by status, pending order cases, feedback, support desk
// workload and integration exceptions, within the user's data scope (the backend applies SRS 5.7).
// Tiles drill down into the shared My Cases list, which hides every action for management.
// Not shown until VECV approves them: SLA/ageing (14.5), audit trail (14.6), closure review (14.9).
// Region scope is omitted: the API takes `region`, but no region master exists to pick from yet.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import type { CaseType, ReportSummary } from '../../api/types';
import { Screen } from '../../components/Screen';
import { ErrorState, LastRefreshed, LoadingState } from '../../components/states';
import { Card, Chip, Divider, ListRow, SectionTitle, L } from '../../components/ui';
import { displayText } from '../../domain/display';
import { ReportBars, RatingBars, Tile, TONE_COLOR, WorkloadTable } from '../../features/reports/ReportParts';
import {
  categoryRows, displayAverage, displayCount, openStatusRows, PERIODS, periodFrom, plural, ratingRows, type ReportPeriod,
} from '../../features/reports/report-view';
import { useQuery } from '../../hooks/useQuery';
import type { CasePreset } from '../../navigation/types';
import { useUser } from '../../session/SessionContext';
import { colors, fonts, spacing, type } from '../../theme';

export function ReportsScreen() {
  const user = useUser();
  const navigation = useNavigation();
  const [period, setPeriod] = useState<ReportPeriod>('all');
  const [caseTypeId, setCaseTypeId] = useState<string | undefined>();
  const types = useQuery<CaseType[]>(() => api.getCaseTypes(true), []);
  const q = useQuery<ReportSummary>(() => api.getReportSummary({ from: periodFrom(period), caseTypeId }), [period, caseTypeId]);

  const openCases = (preset: CasePreset) => navigation.navigate('Tabs', { screen: 'Cases', params: { preset, nonce: Date.now() } });

  const header = (
    <View style={s.header}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>MG</Text>
      </View>
      <View style={L.flex1}>
        <Text style={s.cap} numberOfLines={1}>{displayText(user.role.label, 'Management')}</Text>
        <Text style={s.title} accessibilityRole="header" testID="reports.title">Reports</Text>
      </View>
    </View>
  );

  const scope = (
    <View style={s.scope} accessibilityLabel="Report scope">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {PERIODS.map(p => (
          <Chip key={p.key} label={p.label} selected={period === p.key} onPress={() => setPeriod(p.key)} testID={`reports.period.${p.key}`} />
        ))}
      </ScrollView>
      {types.data?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Chip label="All categories" selected={!caseTypeId} onPress={() => setCaseTypeId(undefined)} testID="reports.category.all" />
          {types.data.map(t => (
            <Chip key={t.id} label={displayText(t.label)} selected={caseTypeId === t.id} onPress={() => setCaseTypeId(t.id)} testID={`reports.category.${t.id}`} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  let body: React.ReactNode;
  if (q.loading) body = <View style={s.state}><LoadingState testID="reports.loading" /></View>;
  else if (q.error || !q.data) body = <View style={s.state}><ErrorState message={q.error ?? ''} onRetry={q.reload} testID="reports.error" /></View>;
  else body = <ReportBody report={q.data} narrowed={period !== 'all' || !!caseTypeId} openCases={openCases} />;

  return (
    <Screen left={header} refreshing={q.refreshing} onRefresh={q.refresh} tabBarSpace testID="reports">
      {scope}
      {body}
    </Screen>
  );
}

function ReportBody({ report, narrowed, openCases }: { report: ReportSummary; narrowed: boolean; openCases: (p: CasePreset) => void }) {
  const { summary, feedback } = report;
  const categories = categoryRows(report.byCategory);
  const statuses = openStatusRows(report.byStatus).map(r => ({ ...r, color: TONE_COLOR[r.tone] }));
  const exceptions = (report.integrationExceptions?.sap ?? 0) + (report.integrationExceptions?.logistics ?? 0);
  const workload = [
    ...report.deskWorkload.map(d => ({ key: d.deskId, name: displayText(d.name), open: d.open, closed: d.closed, transferred: d.transferred })),
    { key: 'unassigned', name: 'Unassigned', open: report.unassigned, closed: null, transferred: null, alert: true },
  ];

  return (
    <>
      <View style={s.section} accessibilityLabel="Case summary" testID="reports.summary">
        <SectionTitle>Case summary</SectionTitle>
        <View style={s.tiles}>
          <Tile label="Total cases" value={summary.total} onPress={() => openCases('all')} testID="reports.tile.total" />
          <Tile label="Open" value={summary.open} color={colors.info} onPress={() => openCases('open')} testID="reports.tile.open" />
          <Tile label="Closed" value={summary.closed} color={colors.success} onPress={() => openCases('closed')} testID="reports.tile.closed" />
          <Tile label="Pending order cases" value={summary.pendingOrder} color={colors.warning} onPress={() => openCases('pendingOrder')} testID="reports.tile.pendingOrder" />
          <Tile label="Updated today" value={summary.updatedToday} onPress={() => openCases('updatedToday')} testID="reports.tile.updatedToday" />
          <Tile label="High priority" value={summary.highPriority} color={colors.danger} onPress={() => openCases('highPriority')} testID="reports.tile.highPriority" />
          <Tile label="Awaiting dealer reply" value={summary.awaitingUserResponse} onPress={() => openCases('reply')} testID="reports.tile.awaitingReply" />
          <Tile label="Feedback pending" value={summary.feedbackPending} onPress={() => openCases('feedback')} testID="reports.tile.feedbackPending" />
        </View>
        {narrowed ? (
          <Text style={s.caption} testID="reports.drillNote">Lists opened from here show every date and category. Narrow them with Filters.</Text>
        ) : null}
      </View>

      <Card style={s.pad} testID="reports.byCategory">
        <SectionTitle>By category</SectionTitle>
        {categories.length ? <ReportBars rows={categories} testID="reports.byCategory" /> : <Text style={s.muted}>No cases in this period.</Text>}
      </Card>

      <Card style={s.pad} testID="reports.byStatus">
        <SectionTitle>Open cases by status</SectionTitle>
        {statuses.length ? <ReportBars rows={statuses} testID="reports.byStatus" /> : <Text style={s.muted}>No open cases.</Text>}
      </Card>

      <Card style={s.pad} testID="reports.feedback">
        <SectionTitle
          right={
            feedback.lowRatingCount > 0 ? (
              <Text style={s.link} onPress={() => openCases('lowRating')} accessibilityRole="button" testID="reports.feedback.lowRatings">
                {plural(feedback.lowRatingCount, 'low rating', 'low ratings')}
              </Text>
            ) : undefined
          }
        >
          Feedback
        </SectionTitle>
        <View style={s.feedbackRow}>
          <View>
            <Text style={s.average} testID="reports.feedback.average">{displayAverage(feedback.average)}</Text>
            <Text style={s.caption}>{feedback.count ? `average of ${feedback.count}` : 'No ratings yet'}</Text>
          </View>
          <RatingBars rows={ratingRows(feedback.distribution)} />
        </View>
        <Text style={s.caption}>Bars show 5 stars at the top down to 1 star.</Text>
      </Card>

      <Card style={s.pad} testID="reports.workload">
        <SectionTitle>Support desk workload</SectionTitle>
        <WorkloadTable rows={workload} />
      </Card>

      <Card>
        <ListRow
          icon="truck" iconTint={colors.warningTint} iconColor={colors.warning}
          title={`Pending order cases · ${displayCount(summary.pendingOrder)}`} subtitle="Parts pending delivery from SAP"
          onPress={() => openCases('pendingOrder')} testID="reports.pendingOrder"
        />
        <Divider />
        <ListRow
          icon="alert" iconTint={colors.brandTint} iconColor={colors.danger}
          title={`Integration exceptions · ${displayCount(exceptions)}`}
          subtitle={`SAP ${displayCount(report.integrationExceptions?.sap ?? 0)} · Logistics ${displayCount(report.integrationExceptions?.logistics ?? 0)}`}
          testID="reports.integration"
        />
      </Card>

      <LastRefreshed at={report.lastRefreshedAt} testID="reports.refreshed" />
    </>
  );
}

const s = StyleSheet.create({
  header: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.paper },
  cap: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted },
  title: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink },
  scope: { gap: spacing.sm },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  state: { minHeight: 280 },
  section: { gap: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pad: { padding: spacing.lg, gap: 14 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  average: { fontFamily: fonts.extrabold, fontSize: 36, letterSpacing: -0.7, color: colors.ink },
  caption: { ...type.caption, color: colors.inkMuted },
  muted: { ...type.bodySmall, color: colors.inkMuted },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
});
