// My Cases (LIST-01…09, SRS 8.3, 13.3). The server returns only cases in the user's scope; dealers
// never receive desk names (LIST-09). Dashboard tiles arrive here as a preset (DASH-04).
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { api, userMessageFor } from '../../api';
import type { CaseSummary, CaseType, Option } from '../../api/types';
import { CaseCard } from '../../components/CaseCard';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { Chip, IconButton, L } from '../../components/ui';
import { activeFilterCount, filtersForPreset, toQuery, type CaseFilters } from '../../features/cases/filters';
import { FilterSheet } from '../../features/cases/FilterSheet';
import type { TabParamList } from '../../navigation/types';
import { useUser } from '../../session/SessionContext';
import { colors, fonts, spacing } from '../../theme';

type ListState = { items: CaseSummary[]; page: number; totalPages: number; totalItems: number };

export function CaseListScreen() {
  const user = useUser();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<TabParamList, 'Cases'>>();
  const [filters, setFilters] = useState<CaseFilters>(() => filtersForPreset(route.params?.preset));
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [list, setList] = useState<ListState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [masters, setMasters] = useState<{ types: CaseType[]; priorities: Option[] }>({ types: [], priorities: [] });

  // A dashboard tile pressed again with a new preset resets the filters.
  useEffect(() => {
    if (route.params?.preset) setFilters(filtersForPreset(route.params.preset));
  }, [route.params?.preset, route.params?.nonce]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    Promise.all([api.getCaseTypes(true), api.getOptions('priority').catch(() => [])])
      .then(([types, priorities]) => setMasters({ types, priorities }))
      .catch(() => undefined); // filters still work without masters
  }, []);

  const load = useCallback(
    async (page: number, mode: 'initial' | 'refresh' | 'more') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      try {
        const res = await api.listCases({ ...toQuery(filters, debounced), page });
        setList(prev => ({
          items: page === 1 || !prev ? res.items : [...prev.items, ...res.items],
          page: res.page,
          totalPages: res.totalPages,
          totalItems: res.totalItems,
        }));
        setError(null);
      } catch (err) {
        if (mode !== 'more') setError(userMessageFor(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filters, debounced],
  );

  useEffect(() => {
    load(1, 'initial');
  }, [load]);

  const count = activeFilterCount(filters);
  const setGroup = (statusGroup: CaseFilters['statusGroup']) => setFilters(f => ({ ...f, statusGroup, statuses: [], needsAction: undefined }));

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <View style={s.search}>
        <Icon name="search" color={colors.inkMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Case no. or order no."
          placeholderTextColor={colors.inkSubtle}
          accessibilityLabel="Search by case number or order number"
          style={s.searchInput}
          returnKeyType="search"
          autoCapitalize="characters"
          testID="cases.search"
        />
      </View>
      <View style={s.chips}>
        <Chip label="Open" selected={filters.statusGroup === 'open' && !filters.statuses.length} onPress={() => setGroup('open')} testID="cases.group.open" />
        <Chip label="Closed" selected={filters.statusGroup === 'closed' && !filters.statuses.length} onPress={() => setGroup('closed')} testID="cases.group.closed" />
        <Chip label="All" selected={filters.statusGroup === 'all' && !filters.statuses.length} onPress={() => setGroup('all')} testID="cases.group.all" />
      </View>
    </View>
  );

  let body: React.ReactNode;
  if (loading) body = <LoadingState testID="cases.loading" />;
  else if (error) body = <ErrorState message={error} onRetry={() => load(1, 'initial')} testID="cases.error" />;
  else
    body = (
      <FlatList
        data={list?.items ?? []}
        keyExtractor={c => c.id}
        renderItem={({ item, index }) => (
          <CaseCard item={item} showDealer={user.role.code !== 'dealer'} onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })} testID={`cases.item.${index}`} />
        )}
        ItemSeparatorComponent={Sep}
        ListEmptyComponent={<EmptyState title="No cases found" body={count || debounced ? 'Try changing the search or filters.' : 'Cases you raise will show here.'} testID="cases.empty" />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list && list.page < list.totalPages && !loadingMore) load(list.page + 1, 'more');
        }}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ margin: spacing.lg }} /> : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, 'refresh')} colors={[colors.primary]} />}
        contentContainerStyle={L.tabPad}
        testID="cases.list"
      />
    );

  return (
    <Screen
      title="My cases"
      large
      scroll={false}
      testID="cases"
      right={<IconButton icon="filter" label={count ? `Filters, ${count} applied` : 'Filters'} dot={count > 0} onPress={() => setSheet(true)} testID="cases.filter" />}
    >
      {header}
      {body}
      <FilterSheet
        visible={sheet}
        value={filters}
        caseTypes={masters.types}
        priorities={masters.priorities}
        onClose={() => setSheet(false)}
        onApply={f => {
          setFilters(f);
          setSheet(false);
        }}
      />
    </Screen>
  );
}

const Sep = () => <View style={{ height: spacing.md }} />;

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#D6DDE9', backgroundColor: colors.paper, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 10 },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
