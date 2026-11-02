import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginError } from '../api/auth';
import { LoginScreen } from './LoginScreen';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderLogin(onSubmit = jest.fn().mockResolvedValue(undefined)) {
  let tree!: Renderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <LoginScreen onSubmit={onSubmit} onForgotPassword={jest.fn()} />
      </SafeAreaProvider>,
    );
  });
  const byId = (id: string) => tree.root.find(n => n.props.testID === id && typeof n.type !== 'string');
  const exists = (id: string) => tree.root.findAll(n => n.props.testID === id).length > 0;
  const type = (id: string, text: string) => act(() => byId(id).props.onChangeText(text));
  const press = (id: string) => act(async () => byId(id).props.onPress());
  return { tree, byId, exists, type, press, onSubmit };
}

const textOf = (node: ReactTestRenderer.ReactTestInstance): string =>
  node.children.map(c => (typeof c === 'string' ? c : textOf(c))).join('');

test('shows the headline and announces the app name', async () => {
  const { byId } = await renderLogin();
  expect(textOf(byId('login.title'))).toBe('Every case, part & delivery. One tap away.');
  expect(byId('login.title').props.accessibilityLabel).toMatch(/^Parts Query Management Portal\./);
});

test('blocks submission and flags empty fields', async () => {
  const { press, exists, onSubmit } = await renderLogin();
  await press('login.submit');
  expect(onSubmit).not.toHaveBeenCalled();
  expect(exists('login.userIdError')).toBe(true);
  expect(exists('login.passwordError')).toBe(true);
});

test('submits the entered credentials', async () => {
  const { type, press, onSubmit } = await renderLogin();
  await type('login.userId', 'D1234');
  await type('login.password', 'secret');
  await press('login.submit');
  expect(onSubmit).toHaveBeenCalledWith({ userId: 'D1234', password: 'secret' });
});

test('shows a friendly error and keeps the input when sign-in fails', async () => {
  const onSubmit = jest.fn().mockRejectedValue(new LoginError('Your account is inactive.'));
  const { type, press, byId, onSubmit: spy } = await renderLogin(onSubmit);
  await type('login.userId', 'D1234');
  await type('login.password', 'secret');
  await press('login.submit');
  expect(spy).toHaveBeenCalled();
  expect(textOf(byId('login.error'))).toBe('Your account is inactive.');
  expect(byId('login.userId').props.value).toBe('D1234');
  expect(byId('login.password').props.value).toBe('secret');
});

test('never shows raw technical errors', async () => {
  const { type, press, byId } = await renderLogin(jest.fn().mockRejectedValue(new Error('TypeError: fetch failed 500')));
  await type('login.userId', 'D1234');
  await type('login.password', 'secret');
  await press('login.submit');
  expect(textOf(byId('login.error'))).toBe('We could not sign you in right now. Please try again.');
});

test('toggles password visibility', async () => {
  const { byId, press } = await renderLogin();
  expect(byId('login.password').props.secureTextEntry).toBe(true);
  await press('login.togglePassword');
  expect(byId('login.password').props.secureTextEntry).toBe(false);
});
