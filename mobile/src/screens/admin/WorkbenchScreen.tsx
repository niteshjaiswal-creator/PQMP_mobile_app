// Admin assignment workbench (SRS 7.15, 13.12; spec §16). Unassigned / assigned / old-pending queues
// with counts, desk filter, search, and Assign / Transfer per case. Overdue and closure-eligible
// filters are left out until SLA rules and closure review are approved.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { api, userMessageFor } from '../../api';
import type { CaseListQuery, CaseSummary, Desk } from '../../api/types';
import { CaseCard } from '../../components/CaseCard';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { Button, Chip, L } from '../../components/ui';
import { assignMode } from '../../domain/assignment';
import { displayText } from '../../domain/display';
import { AssignSheet, type AssignResult } from '../../features/admin/AssignSheet';
import type { TabParamList } from '../../navigation/types';
import { colors, fonts, spacing, type } from '../../theme';

type Queue = NonNullable<CaseListQuery['assignment']>;
type ListState = { items: CaseSummary[]; page: number; totalPages: number };

const QUEUES: { key: Queue; label: string }[] = [
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'old_pending', label: 'Old · pending' },
];

const MIN_SEARCH = 3;

/** "Support Desk 1" → "Desk 1" for the compact chip row. */
const shortDesk = (name: string) => displayText(name).replace(/^Support\s+/i, '');

export function WorkbenchScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<TabParamList, 'Assign'>>();
  const [queue, setQueue] = useState<Queue>(route.params?.filter ?? 'unassigned');
  const [deskId, setDeskId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [desks, setDesks] = useState<Desk[]>([]);
  const [counts, setCounts] = useState<Partial<Record<Queue, number>>>({});
  const [list, setList] = useState<ListState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [target, setTarget] = useState<CaseSummary | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // A home row pressed again with a new filter switches the queue.
  useEffect(() => {
    if (!route.params?.filter) return;
    setDone(null);
    setQueue(route.params.filter);
  }, [route.params?.filter, route.params?.nonce]);

  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim().length >= MIN_SEARCH ? search.trim() : ''), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadDesks = useCallback(() => {
    api.listDesks().then(setDesks).catch(() => undefined); // desk chips are optional; the queues still work
  }, []);

  useEffect(loadDesks, [loadDesks]);

  const queryFor = useCallback(
    (q: Queue): CaseListQuery => ({
      statusGroup: 'open',
      assignment: q,
      deskId: q === 'unassigned' ? undefined : deskId ?? undefined,
      q: term || undefined,
    }),
    [deskId, term],
  );

  const loadCounts = useCallback(async () => {
    const results = await Promise.all(
      QUEUES.map(({ key }) =>
        api
          .listCases({ ...queryFor(key), page: 1, pageSize: 1 })
          .then(r => [key, r.totalItems] as const)
          .catch(() => [key, undefined] as const),
      ),
    );
    setCounts(Object.fromEntries(results.filter(([, n]) => n !== undefined)));
  }, [queryFor]);

  const seq = useRef(0);
  const load = useCallback(
    async (page: number, mode: 'initial' | 'refresh' | 'more' | 'silent') => {
      const id = page === 1 ? ++seq.current : seq.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      try {
        const res = await api.listCases({ ...queryFor(queue), page });
        if (id !== seq.current) return;
        setList(prev => ({
          items: page === 1 || !prev ? res.items : [...prev.items, ...res.items],
          page: res.page,
          totalPages: res.totalPages,
        }));
        setError(null);
      } catch (err) {
        if (id === seq.current && mode !== 'more') setError(userMessageFor(err));
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [queryFor, queue],
  );

  useEffect(() => {
    load(1, 'initial');
  }, [load]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Coming back from case detail (where the case may have been transferred) refreshes quietly. The
  // last confirmation line is dropped then, since the case may have moved again since.
  const reloadRef = useRef<() => void>(() => undefined);
  reloadRef.current = () => {
    load(1, 'silent');
    loadCounts();
    loadDesks();
  };
  useEffect(() => {
    let first = true;
    return navigation.addListener('focus', () => {
      if (first) first = false;
      else {
        setDone(null);
        reloadRef.current();
      }
    });
  }, [navigation]);

  const refresh = () => {
    setDone(null);
    load(1, 'refresh');
    loadCounts();
    loadDesks();
  };

  // Counts and desk chips failed with the list, so they are fetched again too.
  const retry = () => {
    load(1, 'initial');
    loadCounts();
    loadDesks();
  };

  const pickQueue = (q: Queue) => {
    setDone(null);
    setQueue(q);
  };
  const pickDesk = (id: string | null) => {
    setDone(null);
    setDeskId(id);
    if (id && queue === 'unassigned') setQueue('assigned'); // unassigned cases have no desk
  };

  const onAssigned = (item: CaseSummary, res: AssignResult) => {
    setTarget(null);
    const verb = assignMode(item.assignedDesk?.id) === 'transfer' ? 'transferred' : 'assigned';
    setDone(`${item.caseNumber} ${verb} to ${displayText(res.assignedDesk.name)}.`);
    reloadRef.current();
  };

  const header = (
    <View style={s.header}>
      <View style={s.search}>
        <Icon name="search" color={colors.inkMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Case no., order no. or dealer"
          placeholderTextColor={colors.inkSubtle}
          accessibilityLabel="Search by case number, order number or dealer"
          style={s.searchInput}
          returnKeyType="search"
          autoCapitalize="characters"
          testID="workbench.search"
        />
      </View>
      {search.trim().length > 0 && search.trim().length < MIN_SEARCH ? (
        <Text style={s.hint} testID="workbench.searchHint">Type at least {MIN_SEARCH} characters to search.</Text>
      ) : null}
      <View style={s.chips}>
        {QUEUES.map(({ key, label }) => (
          <Chip
            key={key}
            label={counts[key] !== undefined ? `${label} · ${counts[key]}` : label}
            selected={queue === key}
            onPress={() => pickQueue(key)}
            testID={`workbench.queue.${key}`}
          />
        ))}
      </View>
      {desks.length ? (
        <View style={s.chips}>
          <Chip label="All desks" selected={!deskId} onPress={() => pickDesk(null)} testID="workbench.desk.all" />
          {desks.map(d => (
            <Chip key={d.id} label={shortDesk(d.name)} selected={deskId === d.id} onPress={() => pickDesk(d.id)} testID={`workbench.desk.${d.id}`} />
          ))}
        </View>
      ) : null}
      {done ? (
        <View style={s.done} testID="workbench.done">
          <Icon name="check" color={colors.success} size={18} />
          <Text style={s.doneText}>{done}</Text>
        </View>
      ) : null}
    </View>
  );

  let body: React.ReactNode;
  if (loading) body = <LoadingState testID="workbench.loading" />;
  else if (error) body = <ErrorState message={error} onRetry={retry} testID="workbench.error" />;
  else
    body = (
      <FlatList
        data={list?.items ?? []}
        keyExtractor={c => c.id}
        renderItem={({ item, index }) => {
          const transfer = assignMode(item.assignedDesk?.id) === 'transfer';
          return (
            <View style={s.item}>
              <CaseCard item={item} showDealer onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })} testID={`workbench.item.${index}`} />
              <View style={s.itemFoot}>
                {!item.assignedDesk ? <Text style={s.notAssigned}>Not assigned</Text> : <View />}
                <Button
                  label={transfer ? 'Transfer' : 'Assign'}
                  variant={transfer ? 'ghost' : 'primary'}
                  small
                  onPress={() => {
                    setDone(null);
                    setTarget(item);
                  }}
                  testID={`workbench.item.${index}.${transfer ? 'transfer' : 'assign'}`}
                />
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={Sep}
        ListEmptyComponent={
          <EmptyState
            title={term ? 'No matching cases' : queue === 'unassigned' ? 'No unassigned cases' : 'No cases here'}
            body={term || deskId ? 'Try changing the search or desk.' : 'Every open case in this queue is handled.'}
            testID="workbench.empty"
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list && list.page < list.totalPages && !loadingMore) load(list.page + 1, 'more');
        }}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={s.more} /> : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
        contentContainerStyle={L.tabPad}
        testID="workbench.list"
      />
    );

  return (
    <Screen title="Assign cases" large scroll={false} testID="workbench">
      {header}
      {body}
      <AssignSheet item={target} visible={!!target} onClose={() => setTarget(null)} onDone={res => target && onAssigned(target, res)} />
    </Screen>
  );
}

const Sep = () => <View style={{ height: spacing.md }} />;

const s = StyleSheet.create({
  header: { gap: spacing.md, paddingBottom: spacing.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#D6DDE9', backgroundColor: colors.paper, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 10 },
  hint: { ...type.caption, color: colors.inkMuted },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  done: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 14, backgroundColor: colors.successTint },
  doneText: { ...type.bodySmall, fontFamily: fonts.semibold, color: colors.success, flex: 1 },
  item: { gap: spacing.sm },
  itemFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  notAssigned: { ...type.caption, fontFamily: fonts.semibold, color: colors.danger },
  more: { margin: spacing.lg },
});
