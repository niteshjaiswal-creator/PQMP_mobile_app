// Case detail (DETAIL-01…14, SRS 8.5, 13.5). Latest update at the top; order/parts/tracking load in
// their own tab so a SAP or logistics failure never blocks the case (11.9.1). Dealers see one support
// identity (4.2); internal roles also see dealer, desk and internal entries.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import type { CaseDetail, TimelineEvent } from '../../api/types';
import { referenceName } from '../../components/CaseCard';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { ErrorState, LoadingState } from '../../components/states';
import { Timeline } from '../../components/Timeline';
import { Button, Card, IconButton, KeyValue, SectionTitle, StatusPill, Tag, L } from '../../components/ui';
import { customerFacingOwner } from '../../domain/case-status';
import { displayDateTime, displayText, FALLBACK } from '../../domain/display';
import { ClosureCard, FeedbackCard, ReopenCard, ReopenSheet } from '../../features/case-detail/Closure';
import { InternalActions } from '../../features/internal/InternalActions';
import { MessagesTab } from '../../features/case-detail/MessagesTab';
import { OrderPartsTab } from '../../features/case-detail/OrderPartsTab';
import { toTimelineItems } from '../../features/case-detail/timeline';
import { useQuery } from '../../hooks/useQuery';
import type { CaseTab, RootScreenProps } from '../../navigation/types';
import { useUser } from '../../session/SessionContext';
import { colors, fonts, radius, spacing, type } from '../../theme';

type Data = { detail: CaseDetail; timeline: TimelineEvent[] };

export function CaseDetailScreen({ route, navigation }: RootScreenProps<'CaseDetail'>) {
  const { caseId } = route.params;
  const user = useUser();
  const internalView = user.role.code !== 'dealer';
  const [tab, setTab] = useState<CaseTab>(route.params.tab ?? 'overview');
  const [reopenOpen, setReopenOpen] = useState(false);
  const q = useQuery<Data>(async () => {
    const [detail, timeline] = await Promise.all([api.getCase(caseId), api.getTimeline(caseId)]);
    return { detail, timeline };
  }, [caseId]);

  const title = q.data?.detail.caseNumber ?? 'Case';
  const refresh = (
    <IconButton icon="refresh" label="Refresh" onPress={q.refresh} testID="caseDetail.refresh" />
  );
  if (q.loading) return <Screen title={title} onBack={navigation.goBack} scroll={false} testID="caseDetail"><LoadingState testID="caseDetail.loading" /></Screen>;
  if (q.error || !q.data)
    return (
      <Screen title={title} onBack={navigation.goBack} scroll={false} testID="caseDetail">
        <ErrorState message={q.error ?? ''} onRetry={q.reload} testID="caseDetail.error" />
      </Screen>
    );

  const { detail, timeline } = q.data;
  const hasTracking = detail.sections.order || detail.sections.parts || detail.sections.consignment;
  const handler = internalView ? displayText(detail.handledBy.name, 'Not assigned yet') : customerFacingOwner(detail.handledBy.name);
  const needsReply = detail.needsAction === 'reply';

  return (
    <Screen
      title={title}
      onBack={navigation.goBack}
      right={refresh}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      testID="caseDetail"
      footer={internalView && (detail.actions.canUpdate || detail.actions.canAssign) ? <InternalActions detail={detail} onChanged={q.reload} /> : undefined}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={s.row}>
          <StatusPill status={detail.status} internalView={internalView} testID="caseDetail.status" />
          {detail.priority ? <Tag label={`Priority ${displayText(detail.priority.label)}`} testID="caseDetail.priority" /> : null}
        </View>
        <Text style={s.h1} testID="caseDetail.title">
          {displayText(detail.issueTitle, detail.subType.label)}
        </Text>
        <Text style={s.cap}>{`${detail.caseType.label} · ${detail.subType.label}`}</Text>
        <View style={[s.row, L.mt2]}>
          <View style={s.handlerIcon}>
            <Icon name="headset" color={colors.assigned} size={16} />
          </View>
          <Text style={s.handler} testID="caseDetail.handledBy">
            <Text style={s.cap}>Handled by </Text>
            {handler}
          </Text>
        </View>
      </View>

      {detail.closure ? <ClosureCard closure={detail.closure} /> : null}

      {!detail.closure && detail.latestUpdate ? (
        <View style={[s.latest, needsReply && s.latestAlert]} testID="caseDetail.latestUpdate">
          <Text style={[s.over, needsReply && { color: colors.danger }]}>Latest update · {displayDateTime(detail.latestUpdate.at)}</Text>
          <Text style={s.latestText}>{displayText(detail.latestUpdate.text)}</Text>
          {needsReply ? <Button label="Reply" variant="brand" small onPress={() => setTab('messages')} testID="caseDetail.reply" /> : null}
        </View>
      ) : null}

      <View style={s.seg} accessibilityRole="tablist">
        <SegTab label="Overview" on={tab === 'overview'} onPress={() => setTab('overview')} testID="caseDetail.tab.overview" />
        {hasTracking ? <SegTab label="Order & parts" on={tab === 'order'} onPress={() => setTab('order')} testID="caseDetail.tab.order" /> : null}
        <SegTab label="Messages" badge={detail.counts.unreadComments} on={tab === 'messages'} onPress={() => setTab('messages')} testID="caseDetail.tab.messages" />
      </View>

      {tab === 'overview' ? (
        <>
          {detail.statusGroup === 'closed' && !internalView ? <FeedbackCard detail={detail} onDone={q.reload} /> : null}
          {detail.actions.canReopen ? <ReopenCard onPress={() => setReopenOpen(true)} /> : null}

          <View>
            <SectionTitle>Timeline</SectionTitle>
            <View style={{ height: spacing.md }} />
            <Timeline items={toTimelineItems(timeline, internalView)} testID="caseDetail.timeline" />
          </View>

          <Card style={L.kvCard} testID="caseDetail.details">
            {internalView && detail.dealer ? <KeyValue first label="Dealer" value={`${detail.dealer.name} (${detail.dealer.dealerCode})`} /> : null}
            <KeyValue first={!internalView} label="Raised" value={displayDateTime(detail.createdAt)} />
            <KeyValue label="Last updated" value={displayDateTime(detail.updatedAt)} />
            {detail.references.map(r => (
              <KeyValue key={`${r.type}-${r.value}`} label={referenceName(r.type)} value={displayText(r.value)} />
            ))}
            <KeyValue label="Contact" value={[displayText(detail.contact.person), detail.modeOfQuery].filter(Boolean).join(' · ')} />
            {detail.fields.map(f => (
              <KeyValue key={f.key} label={f.label} value={displayText(f.value)} muted={!f.value} />
            ))}
            {detail.parts.length ? <KeyValue label="Parts in this case" value={detail.parts.map(p => p.partNumber).join(', ')} /> : null}
            <Block label="Description" value={detail.problemStatement} />
            <Block label="Remarks" value={detail.remarks} />
          </Card>
        </>
      ) : null}

      {tab === 'order' && hasTracking ? <OrderPartsTab caseId={detail.id} show={detail.sections} /> : null}
      {tab === 'messages' ? <MessagesTab detail={detail} internalView={internalView} onChanged={q.reload} /> : null}

      <ReopenSheet
        detail={detail}
        visible={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onDone={() => {
          setReopenOpen(false);
          q.reload();
        }}
      />
    </Screen>
  );
}

function Block({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={s.block}>
      <Text style={s.cap}>{label}</Text>
      <Text style={[s.blockText, !value?.trim() && s.na]}>{displayText(value, FALLBACK.notAvailable)}</Text>
    </View>
  );
}

function SegTab({ label, on, onPress, badge, testID }: { label: string; on: boolean; onPress: () => void; badge?: number; testID: string }) {
  return (
    <Pressable onPress={onPress} style={[s.segItem, on && s.segOn]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={badge ? `${label}, ${badge} unread` : label} testID={testID}>
      <Text style={[s.segText, on && { color: colors.primary }]}>{label}</Text>
      {badge ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  h1: { fontFamily: fonts.extrabold, fontSize: 23, lineHeight: 29, letterSpacing: -0.4, color: colors.ink },
  cap: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted, fontSize: 13 },
  handlerIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.assignedTint, alignItems: 'center', justifyContent: 'center' },
  handler: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, flexShrink: 1 },
  latest: { borderRadius: 20, backgroundColor: colors.paper, borderWidth: 1, borderColor: '#E4E8F0', padding: spacing.lg, gap: 10 },
  latestAlert: { backgroundColor: '#FDEEEE', borderColor: '#F3C3C3' },
  over: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.inkMuted },
  latestText: { ...type.body, fontFamily: fonts.semibold, color: colors.ink },
  seg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, backgroundColor: colors.track },
  segItem: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 4 },
  segOn: { backgroundColor: colors.paper, elevation: 2, shadowColor: '#102048', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  segText: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkStrong, textAlign: 'center' },
  badge: { minWidth: 20, height: 20, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.paper },
  block: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider, gap: 4 },
  blockText: { ...type.bodySmall, color: colors.ink },
  na: { fontStyle: 'italic', color: colors.inkMuted },
});
