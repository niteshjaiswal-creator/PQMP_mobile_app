// In-app notification centre (NOTIF-01, SRS 7.9, 8.9, 13.9). Tapping opens the related case (8.9.4).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, userMessageFor } from '../../api';
import type { AppNotification, NotificationType } from '../../api/types';
import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useRefreshOnFocus } from '../../components/useRefreshOnFocus';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { Card, Chip, Divider, L } from '../../components/ui';
import { displayDateTime, displayText } from '../../domain/display';
import { useQuery } from '../../hooks/useQuery';
import type { CaseTab } from '../../navigation/types';
import { colors, fonts, spacing, type } from '../../theme';

const LOOK: Record<NotificationType, { icon: IconName; bg: string; fg: string; tab?: CaseTab }> = {
  case_created: { icon: 'check', bg: colors.successTint, fg: colors.success },
  case_assigned: { icon: 'headset', bg: colors.assignedTint, fg: colors.assigned },
  status_updated: { icon: 'refresh', bg: colors.assignedTint, fg: colors.assigned },
  clarification_required: { icon: 'chat', bg: colors.brandTint, fg: colors.danger, tab: 'messages' },
  response_added: { icon: 'chat', bg: colors.infoTint, fg: colors.info, tab: 'messages' },
  order_updated: { icon: 'truck', bg: colors.infoTint, fg: colors.info, tab: 'order' },
  part_updated: { icon: 'truck', bg: colors.infoTint, fg: colors.info, tab: 'order' },
  eda_updated: { icon: 'clock', bg: colors.infoTint, fg: colors.info, tab: 'order' },
  consignment_updated: { icon: 'truck', bg: colors.infoTint, fg: colors.info, tab: 'order' },
  case_closed: { icon: 'check', bg: colors.successTint, fg: colors.success },
  feedback_requested: { icon: 'star', bg: colors.warningTint, fg: colors.warning },
  case_reopened: { icon: 'refresh', bg: colors.brandTint, fg: colors.danger },
};

export function NotificationsScreen() {
  const navigation = useNavigation();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const q = useQuery(() => api.listNotifications({ unreadOnly }), [unreadOnly]);
  useRefreshOnFocus(q.reload);

  const markRead = async (input: { ids: string[] } | { all: true }) => {
    setActionError(null);
    try {
      await api.markNotificationsRead(input);
      q.setData(d => d && { ...d, unreadCount: 'all' in input ? 0 : Math.max(0, d.unreadCount - 1), items: d.items.map(n => ('all' in input || input.ids.includes(n.id) ? { ...n, read: true } : n)) });
    } catch (err) {
      setActionError(userMessageFor(err));
    }
  };

  const openItem = (n: AppNotification) => {
    if (!n.read) markRead({ ids: [n.id] });
    if (n.caseId) navigation.navigate('CaseDetail', { caseId: n.caseId, tab: LOOK[n.type]?.tab });
  };

  const markAll = q.data?.unreadCount ? (
    <Pressable onPress={() => markRead({ all: true })} accessibilityRole="button" hitSlop={10} testID="updates.markAll">
      <Text style={s.link}>Mark all read</Text>
    </Pressable>
  ) : undefined;

  return (
    <Screen title="Updates" large right={markAll} refreshing={q.refreshing} onRefresh={q.refresh} tabBarSpace testID="updates" scroll={!q.loading && !q.error}>
      <View style={s.chips}>
        <Chip label="All" selected={!unreadOnly} onPress={() => setUnreadOnly(false)} testID="updates.filter.all" />
        <Chip label={`Unread${q.data ? ` · ${q.data.unreadCount}` : ''}`} selected={unreadOnly} onPress={() => setUnreadOnly(true)} testID="updates.filter.unread" />
      </View>
      {actionError ? <Text style={s.err}>{actionError}</Text> : null}
      {q.loading ? (
        <LoadingState testID="updates.loading" />
      ) : q.error || !q.data ? (
        <ErrorState message={q.error ?? ''} onRetry={q.reload} testID="updates.error" />
      ) : q.data.items.length === 0 ? (
        <EmptyState title={unreadOnly ? 'No unread updates' : 'No updates yet'} body="Case updates will show here." testID="updates.empty" />
      ) : (
        <Card>
          {q.data.items.map((n, i) => {
            const look = LOOK[n.type] ?? LOOK.status_updated;
            return (
              <React.Fragment key={n.id}>
                {i ? <Divider /> : null}
                <Pressable
                  onPress={() => openItem(n)}
                  style={[s.row, !n.read && { backgroundColor: colors.rowTint }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.caseNumber ?? ''}. ${n.body}`}
                  testID={`updates.item.${i}`}
                >
                  <View style={[s.icon, { backgroundColor: look.bg }]}>
                    <Icon name={look.icon} color={look.fg} />
                  </View>
                  <View style={L.flexGap2}>
                    <Text style={s.title}>{displayText(n.title)}</Text>
                    <Text style={s.body}>{[n.caseNumber, displayText(n.body)].filter(Boolean).join(' · ')}</Text>
                    <Text style={s.time}>{displayDateTime(n.createdAt)}</Text>
                  </View>
                  {!n.read ? <View style={s.unread} testID={`updates.item.${i}.unread`} /> : null}
                </Pressable>
              </React.Fragment>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', gap: spacing.sm },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  err: { ...type.caption, fontFamily: fonts.semibold, color: colors.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  body: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted },
  time: { ...type.caption, color: colors.inkMuted },
  unread: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
});
