// Home dashboard (DASH-01…04, SRS 8.2, 13.2). Dealers get the customer view; support desk and admin
// also get the internal items (SRS 13.2). Counts come from the server and match My Cases (8.2.4).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import type { CaseSummary, DashboardSummary } from '../../api/types';
import { CaseCard } from '../../components/CaseCard';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { ErrorState, LoadingState } from '../../components/states';
import { Button, Card, Divider, IconButton, ListRow, SectionTitle, L } from '../../components/ui';
import { displayText } from '../../domain/display';
import { useQuery } from '../../hooks/useQuery';
import type { CasePreset } from '../../navigation/types';
import { useUser } from '../../session/SessionContext';
import { colors, fonts, spacing, type } from '../../theme';

type HomeData = { dash: DashboardSummary; recent: CaseSummary[]; reply: CaseSummary | null };

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || 'U';

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function HomeScreen() {
  const user = useUser();
  const navigation = useNavigation();
  const isDealer = user.role.code === 'dealer';
  const q = useQuery<HomeData>(async () => {
    const [dash, recent, reply] = await Promise.all([
      api.getDashboard(),
      api.listCases({ statusGroup: 'all', pageSize: 3, sort: '-updatedAt' }),
      isDealer ? api.listCases({ statusGroup: 'open', needsAction: 'reply', pageSize: 1 }) : Promise.resolve(null),
    ]);
    return { dash, recent: recent.items, reply: reply?.items[0] ?? null };
  }, [isDealer]);

  const openCases = (preset: CasePreset) => navigation.navigate('Tabs', { screen: 'Cases', params: { preset, nonce: Date.now() } });
  const openCase = (c: CaseSummary, tab?: 'messages' | 'order') => navigation.navigate('CaseDetail', { caseId: c.id, tab });

  const header = (
    <View style={s.header}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials(user.name)}</Text>
      </View>
      <View style={L.flex1}>
        <Text style={s.hello}>{isDealer ? greeting() : user.role.label}</Text>
        <Text style={s.name} numberOfLines={1} testID="home.userName">
          {user.desk?.name ?? user.name}
        </Text>
      </View>
      {user.role.code !== 'management' ? (
        <IconButton
          icon="bell"
          label={`Updates${q.data?.dash.unreadNotifications ? `, ${q.data.dash.unreadNotifications} unread` : ''}`}
          onPress={() => navigation.navigate('Tabs', { screen: 'Updates' })}
          dot={!!q.data?.dash.unreadNotifications}
          testID="home.notifications"
        />
      ) : null}
    </View>
  );

  if (q.loading) return <Screen left={header} scroll={false} testID="home"><LoadingState testID="home.loading" /></Screen>;
  if (q.error || !q.data) return <Screen left={header} scroll={false} testID="home"><ErrorState message={q.error ?? ''} onRetry={q.reload} testID="home.error" /></Screen>;

  const { dash, recent, reply } = q.data;
  return (
    <Screen left={header} refreshing={q.refreshing} onRefresh={q.refresh} tabBarSpace testID="home">
      {isDealer && reply ? (
        <View style={s.alert} testID="home.awaitingReply">
          <View style={s.alertHead}>
            <Icon name="chat" color={colors.danger} size={16} />
            <Text style={s.alertOver}>Awaiting your response · {dash.awaitingUserResponse}</Text>
          </View>
          <Text style={s.alertCase}>{reply.caseNumber}</Text>
          <Text style={s.alertBody}>{displayText(reply.latestUpdate?.text, 'Support asked you a question on this case.')}</Text>
          <Button label="Reply" variant="brand" small onPress={() => openCase(reply, 'messages')} testID="home.reply" />
        </View>
      ) : null}

      <View style={s.stats} accessibilityLabel="Case summary">
        <Stat label="Total cases" value={dash.total} onPress={() => openCases('all')} testID="home.kpi.total" />
        <Stat label="Open" value={dash.open} color={colors.info} onPress={() => openCases('open')} testID="home.kpi.open" />
        <Stat label="In progress" value={dash.inProgress} color={colors.warning} onPress={() => openCases('inProgress')} testID="home.kpi.inProgress" />
        <Stat label="Closed" value={dash.closed} color={colors.success} onPress={() => openCases('closed')} testID="home.kpi.closed" />
      </View>

      {isDealer ? (
        <Card>
          <ListRow
            icon="star" iconTint={colors.warningTint} iconColor={colors.warning}
            title={dash.feedbackPending === 1 ? '1 closed case to rate' : `${dash.feedbackPending} closed cases to rate`}
            subtitle="Feedback pending" onPress={() => openCases('feedback')} testID="home.feedbackPending"
          />
          <Divider />
          <ListRow
            icon="truck" title={dash.orderUpdates === 1 ? '1 order or delivery update' : `${dash.orderUpdates} order and delivery updates`} subtitle="Expected dates and dispatches"
            onPress={() => openCases('orderRelated')} testID="home.orderUpdates"
          />
        </Card>
      ) : null}

      {dash.internal ? (
        <>
          <Card>
            <ListRow icon="alert" iconTint={colors.brandTint} iconColor={colors.danger} title={`Unassigned · ${dash.internal.unassigned}`} subtitle="Waiting for a desk" testID="home.internal.unassigned" />
            <Divider />
            <ListRow icon="chat" title={`Dealer replied · ${dash.internal.dealerReplied}`} subtitle="Responses to your questions" testID="home.internal.dealerReplied" />
            <Divider />
            <ListRow icon="clock" iconTint={colors.neutralTint} iconColor={colors.neutral} title={`Old / pending · ${dash.internal.oldPending}`} subtitle="Open the longest" testID="home.internal.oldPending" />
            <Divider />
            <ListRow
              icon="alert" iconTint={colors.brandTint} iconColor={colors.danger}
              title={`Integration failures · ${dash.internal.integrationFailures.sap + dash.internal.integrationFailures.logistics}`}
              subtitle={`SAP ${dash.internal.integrationFailures.sap} · Logistics ${dash.internal.integrationFailures.logistics}`}
              testID="home.internal.integration"
            />
          </Card>
          <Card style={{ padding: spacing.lg, gap: spacing.md }} testID="home.internal.byDesk">
            <SectionTitle>Open cases by desk</SectionTitle>
            <Bars rows={dash.internal.byDesk.map(d => ({ label: d.name, value: d.open }))} />
          </Card>
        </>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <SectionTitle right={<Pressable onPress={() => openCases('all')} accessibilityRole="button" testID="home.seeAll" hitSlop={10}><Text style={s.link}>See all</Text></Pressable>}>
          Recently updated
        </SectionTitle>
        {recent.length ? (
          recent.map((c, i) => <CaseCard key={c.id} item={c} compact showDealer={!isDealer} onPress={() => openCase(c)} testID={`home.recent.${i}`} />)
        ) : (
          <Text style={s.muted}>No cases yet.</Text>
        )}
      </View>

      {dash.byCategory.length ? (
        <Card style={{ padding: spacing.lg, gap: spacing.md }} testID="home.byCategory">
          <SectionTitle>{isDealer ? 'Your cases by category' : 'Cases by category'}</SectionTitle>
          <Bars rows={dash.byCategory.slice(0, 5).map(c => ({ label: c.label, value: c.count }))} />
        </Card>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value, color = colors.ink, onPress, testID }: { label: string; value: number; color?: string; onPress: () => void; testID: string }) {
  return (
    <Pressable style={s.stat} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} testID={testID}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Pressable>
  );
}

export function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <View style={{ gap: spacing.md }}>
      {rows.map(r => (
        <View key={r.label} style={L.gap5} accessibilityLabel={`${r.label}: ${r.value}`}>
          <View style={s.barLabel}>
            <Text style={s.barName}>{r.label}</Text>
            <Text style={s.barValue}>{r.value}</Text>
          </View>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${(r.value / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.paper },
  hello: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted },
  name: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink },
  alert: { borderRadius: 20, backgroundColor: '#FDEEEE', borderWidth: 1, borderColor: '#F3C3C3', padding: spacing.lg, gap: 10 },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertOver: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.danger },
  alertCase: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.ink },
  alertBody: { ...type.bodySmall, color: colors.ink },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1, borderRadius: 18, padding: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: '#E4E8F0' },
  statValue: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5 },
  statLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkMuted },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  muted: { ...type.bodySmall, color: colors.inkMuted },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  barName: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  barValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkMuted },
  barTrack: { height: 8, borderRadius: 8, backgroundColor: colors.divider, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 8, backgroundColor: colors.primary },
});
