// Vertical event list for case history and consignment movement (13.8, CONSIGN-01).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, type } from '../theme';
import { Icon } from './Icon';
import { L } from './ui';

export type TimelineItem = { id: string; title: string; body?: string | null; meta: string; internal?: boolean };

export function Timeline({ items, testID }: { items: TimelineItem[]; testID?: string }) {
  return (
    <View testID={testID}>
      {items.map((e, i) => (
        <View key={e.id} style={s.ev} testID={testID ? `${testID}.item` : undefined}>
          {i < items.length - 1 ? <View style={s.line} /> : null}
          <View style={[s.dot, i === 0 && s.dotCur]} />
          <View style={L.flexGap2}>
            <Text style={s.title}>{e.title}</Text>
            {e.body ? (
              <View style={s.bodyRow}>
                {e.internal ? <Icon name="lock" color={colors.inkStrong} size={14} /> : null}
                <Text style={s.body}>{e.body}</Text>
              </View>
            ) : null}
            <Text style={s.meta}>{e.meta}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  ev: { flexDirection: 'row', gap: 14, paddingBottom: 16 },
  line: { position: 'absolute', left: 7, top: 18, bottom: 0, width: 2, backgroundColor: '#E4E8F0' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#C9D6EA', backgroundColor: colors.paper, marginTop: 2 },
  dotCur: { borderColor: colors.primary, backgroundColor: colors.primary },
  title: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  bodyRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  body: { ...type.bodySmall, fontSize: 13, color: colors.inkStrong, flex: 1 },
  meta: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted },
});
