// Account and sign out (AUTH-03, SRS 7.1). Profile data is maintained in the web portal.
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button, Card, KeyValue, Tag, L } from '../../components/ui';
import { displayText } from '../../domain/display';
import { useSession, useUser } from '../../session/SessionContext';
import { colors, fonts, spacing, type } from '../../theme';

const VERSION = '1.0.0';

export function AccountScreen() {
  const user = useUser();
  const { signOut } = useSession();
  const [busy, setBusy] = useState(false);
  const dealer = user.dealers.find(d => d.dealerCode === user.activeDealerCode) ?? user.dealers[0];
  const initials = user.name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You will need your user ID and password to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { setBusy(true); signOut(); } },
    ]);

  return (
    <Screen title="Account" large tabBarSpace testID="account">
      <Card style={s.profile}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials || 'U'}</Text>
        </View>
        <View style={L.flexGap6}>
          <Text style={s.name} testID="account.name">{displayText(user.name)}</Text>
          <Tag label={user.role.label} tone="blue" testID="account.role" />
        </View>
      </Card>
      <Card style={L.kvCard}>
        <KeyValue first label="User ID" value={displayText(user.userId)} />
        {dealer ? <KeyValue label="Dealer code" value={dealer.dealerCode} testID="account.dealerCode" /> : null}
        {user.desk ? <KeyValue label="Desk" value={user.desk.name} /> : null}
        <KeyValue label="Location" value={displayText(user.location ?? dealer?.city)} muted={!user.location && !dealer?.city} />
      </Card>
      <Text style={s.hint}>Name, dealer mapping and contact details are managed in the PQMP web portal. Contact your VECV administrator to change them.</Text>
      <Button label="Sign out" icon="logout" variant="ghost" onPress={confirmSignOut} loading={busy} testID="account.signOut" />
      <Text style={s.version}>App version {VERSION}</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.paper },
  name: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink },
  hint: { ...type.caption, color: colors.inkMuted, lineHeight: 18 },
  version: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted, textAlign: 'center' },
});
