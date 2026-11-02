// Signed-out: Login. Signed-in: tabs chosen by role (SRS 8.1.6) plus the shared case screens.
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { env } from '../config/env';
import type { Role } from '../api/types';
import { LoadingState } from '../components/states';
import { CreateCaseProvider } from '../features/create/CreateCaseContext';
import { AccountScreen } from '../screens/account/AccountScreen';
import { CaseDetailScreen } from '../screens/case-detail/CaseDetailScreen';
import { CaseListScreen } from '../screens/cases/CaseListScreen';
import { CaseCreatedScreen } from '../screens/create/CaseCreatedScreen';
import { CreateDetailsScreen } from '../screens/create/CreateDetailsScreen';
import { CreateReferenceScreen } from '../screens/create/CreateReferenceScreen';
import { CreateTypeScreen } from '../screens/create/CreateTypeScreen';
import { ScanReviewScreen } from '../screens/create/ScanReviewScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { WorkbenchScreen } from '../screens/admin/WorkbenchScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { useSession } from '../session/SessionContext';
import { colors } from '../theme';
import { TabBar } from './TabBar';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const Nothing = () => null;
const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.canvas, primary: colors.primary } };

function RoleTabs({ role }: { role: Role }) {
  return (
    <Tabs.Navigator tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Home" component={role === 'management' ? ReportsScreen : HomeScreen} options={{ title: role === 'management' ? 'Reports' : 'Home' }} />
      {role === 'admin' ? <Tabs.Screen name="Assign" component={WorkbenchScreen} /> : null}
      <Tabs.Screen name="Cases" component={CaseListScreen} />
      {role === 'dealer' ? <Tabs.Screen name="NewCase" component={Nothing} /> : null}
      {role !== 'management' ? <Tabs.Screen name="Updates" component={NotificationsScreen} /> : null}
      <Tabs.Screen name="Account" component={AccountScreen} />
    </Tabs.Navigator>
  );
}

const s = StyleSheet.create({ restoring: { flex: 1, backgroundColor: colors.canvas } });

export function RootNavigator() {
  const { state, signIn } = useSession();

  if (state.status === 'restoring') {
    return (
      <View style={s.restoring}>
        <LoadingState testID="app.restoring" />
      </View>
    );
  }
  if (state.status === 'signedOut') {
    return (
      <LoginScreen
        notice={state.notice}
        onSubmit={signIn}
        onForgotPassword={() => Linking.openURL(`${env.portalBaseUrl}/password/reset`)}
      />
    );
  }

  const role = state.user.role.code;
  return (
    <CreateCaseProvider>
      <NavigationContainer theme={theme}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Screen name="Tabs">{() => <RoleTabs role={role} />}</Stack.Screen>
          <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
          {role === 'dealer' ? (
            <Stack.Group>
              <Stack.Screen name="CreateType" component={CreateTypeScreen} options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="CreateReference" component={CreateReferenceScreen} />
              <Stack.Screen name="ScanReview" component={ScanReviewScreen} />
              <Stack.Screen name="CreateDetails" component={CreateDetailsScreen} />
              <Stack.Screen name="CaseCreated" component={CaseCreatedScreen} options={{ gestureEnabled: false }} />
            </Stack.Group>
          ) : null}
        </Stack.Navigator>
      </NavigationContainer>
    </CreateCaseProvider>
  );
}
