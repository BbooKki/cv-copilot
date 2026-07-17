import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {GemmaToMainMessage, MainToGemmaMessage} from './protocol';
import {GEMMA_INITIALIZATION_TIMEOUT_MS, useGemma} from './useGemma';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<GemmaToMainMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly messages: MainToGemmaMessage[] = [];
  terminated = false;

  constructor() { FakeWorker.instances.push(this); }
  postMessage(message: MainToGemmaMessage) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  emit(message: GemmaToMainMessage) { this.onmessage?.({data: message} as MessageEvent<GemmaToMainMessage>); }
}

describe('useGemma', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    Object.defineProperty(window, 'isSecureContext', {configurable: true, value: true});
    Object.defineProperty(navigator, 'gpu', {configurable: true, value: {requestAdapter: vi.fn().mockResolvedValue({})}});
    Object.defineProperty(navigator, 'storage', {configurable: true, value: {estimate: vi.fn().mockResolvedValue({quota: 4_000_000_000, usage: 0})}});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stops a stalled initialization and recreates the worker for a cached retry', async () => {
    const {result, unmount} = renderHook(() => useGemma(vi.fn()));
    await act(async () => Promise.resolve());
    const firstWorker = FakeWorker.instances[0];

    act(() => firstWorker.emit({type: 'cache-status', cached: true}));
    act(() => result.current.load());
    act(() => firstWorker.emit({type: 'initializing'}));
    act(() => vi.advanceTimersByTime(GEMMA_INITIALIZATION_TIMEOUT_MS));

    expect(firstWorker.terminated).toBe(true);
    expect(FakeWorker.instances).toHaveLength(2);
    expect(result.current.cached).toBe(true);
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/exceeded 3 minutes/i);
    unmount();
  });

  it('hard-cancels initialization and restarts an idle worker', async () => {
    const {result, unmount} = renderHook(() => useGemma(vi.fn()));
    await act(async () => Promise.resolve());
    const firstWorker = FakeWorker.instances[0];

    act(() => firstWorker.emit({type: 'initializing'}));
    act(() => result.current.cancel());

    expect(firstWorker.terminated).toBe(true);
    expect(FakeWorker.instances).toHaveLength(2);
    expect(result.current.status).toBe('idle');
    act(() => vi.advanceTimersByTime(GEMMA_INITIALIZATION_TIMEOUT_MS));
    expect(result.current.status).toBe('idle');
    unmount();
  });

  it('does not restart the runtime when the completion callback changes', async () => {
    type CompletionProps = {onComplete: (raw: string) => void};
    const initialProps: CompletionProps = {onComplete: vi.fn()};
    const {rerender, unmount} = renderHook(({onComplete}: CompletionProps) => useGemma(onComplete), {initialProps});
    await act(async () => Promise.resolve());

    rerender({onComplete: vi.fn()});

    expect(FakeWorker.instances).toHaveLength(1);
    expect(FakeWorker.instances[0].terminated).toBe(false);
    unmount();
  });

  it('passes the requested generation kind to the worker', async () => {
    const {result, unmount} = renderHook(() => useGemma(vi.fn()));
    await act(async () => Promise.resolve());

    act(() => result.current.generate('Recommend a design.', 'design'));

    expect(FakeWorker.instances[0].messages).toContainEqual({type: 'generate', prompt: 'Recommend a design.', kind: 'design'});
    unmount();
  });
});
