// AUTH-03/04, DATA-01 — SRS 8.10, 11.9, 17.2: business-readable errors only
import { ApiError, configureApi, request, userMessageFor } from './client';

const respond = (status: number, body?: unknown) =>
  jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body } as Response);

const failure = (p: Promise<unknown>) =>
  p.then(
    () => { throw new Error('expected request to fail'); },
    (e: ApiError) => e,
  );

beforeEach(() => configureApi({ baseUrl: 'https://api.example.test', getToken: () => 'tok', onUnauthorized: jest.fn() }));

it('sends the bearer token and query params', async () => {
  const fetchMock = respond(200, { ok: true });
  globalThis.fetch = fetchMock;
  await request('/cases', { query: { status: 'open', page: 2, skip: undefined } });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://api.example.test/cases?status=open&page=2');
  expect(init.headers.Authorization).toBe('Bearer tok');
});

it('maps 401 to a session-expired message and notifies the app', async () => {
  const onUnauthorized = jest.fn();
  configureApi({ onUnauthorized });
  globalThis.fetch = respond(401, { error: 'JWT expired at 2026-10-26T10:00Z' });
  const err = await failure(request('/cases'));
  expect(err).toBeInstanceOf(ApiError);
  expect(err.userMessage).toBe('Your session has expired. Please log in again.');
  expect(err.userMessage).not.toMatch(/JWT|401/);
  expect(onUnauthorized).toHaveBeenCalled();
});

it('never leaks raw SAP errors', async () => {
  globalThis.fetch = respond(500, { message: 'RFC_ERROR_SYSTEM_FAILURE BAPI_SALESORDER' });
  const err = await failure(request('/orders/1'));
  expect(userMessageFor(err)).toBe('Something went wrong on our side. Please try again later.');
});

it('passes through field errors on validation failures', async () => {
  globalThis.fetch = respond(422, { fieldErrors: { poNumber: 'PO number not found' } });
  const err = await failure(request('/cases', { method: 'POST', body: {} }));
  expect(err.kind).toBe('validation');
  expect(err.fieldErrors).toEqual({ poNumber: 'PO number not found' });
});

it('reports network failures as offline', async () => {
  globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
  const err = await failure(request('/cases'));
  expect(err.kind).toBe('network');
});
