import { configureApi } from './client';
import { login, LoginError } from './auth';

const respond = (status: number, body: unknown = {}) =>
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: status < 400, status, json: async () => body } as Response);

beforeEach(() => configureApi({ baseUrl: 'https://api.example.test' }));
afterEach(() => jest.restoreAllMocks());

test('posts trimmed credentials and returns the session from the envelope', async () => {
  const session = { accessToken: 't', refreshToken: 'r', accessTokenExpiresIn: 900, refreshTokenExpiresIn: 1, user: { name: 'Dealer' } };
  const fetchSpy = respond(200, { data: session });
  await expect(login({ userId: ' D1 ', password: 'p' })).resolves.toEqual(session);
  const [url, init] = fetchSpy.mock.calls[0];
  expect(url).toBe('https://api.example.test/auth/login');
  const body = JSON.parse(init!.body as string);
  expect(body).toMatchObject({ username: 'D1', password: 'p' });
  expect(body.device.platform).toBeDefined();
});

test.each([
  [401, 'The User ID or password is incorrect. Please try again.'],
  [403, 'Your account is inactive or not authorised for this app. Please contact your VECV administrator.'],
  [500, 'Something went wrong on our side. Please try again later.'],
])('maps HTTP %i to a login message', async (status, message) => {
  respond(status);
  const err = await login({ userId: 'D1', password: 'p' }).catch(e => e);
  expect(err).toBeInstanceOf(LoginError);
  expect(err.userMessage).toBe(message);
});
