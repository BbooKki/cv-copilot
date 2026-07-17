import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {GemmaToMainMessage, MainToGemmaMessage} from './protocol';
import {GEMMA_GENERATION_TIMEOUT_MS, GEMMA_INITIALIZATION_TIMEOUT_MS, useGemma} from './useGemma';

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

    act(() => firstWorker.emit({type: 'cache-status', cached: true, verified: false}));
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

    expect(FakeWorker.instances[0].messages).toContainEqual({type: 'generate', requestId: 1, prompt: 'Recommend a design.', kind: 'design'});
    unmount();
  });

  it('stops a generation after 90 seconds and returns its partial output for a compact retry', async () => {
    const onTimeout = vi.fn();
    const {result, unmount} = renderHook(() => useGemma(vi.fn(), onTimeout));
    await act(async () => Promise.resolve());
    const worker = FakeWorker.instances[0];

    act(() => result.current.generate('Analyze this role.'));
    act(() => worker.emit({type: 'generation-chunk', requestId: 1, text: '{"partial":'}));
    act(() => vi.advanceTimersByTime(GEMMA_GENERATION_TIMEOUT_MS));

    expect(worker.messages).toContainEqual({type: 'cancel-generation', requestId: 1});
    expect(onTimeout).toHaveBeenCalledWith('{"partial":');
    expect(result.current.status).toBe('ready');
    unmount();
  });

  it('ignores chunks and completion from an older generation request', async () => {
    const onComplete = vi.fn();
    const {result, unmount} = renderHook(() => useGemma(onComplete));
    await act(async () => Promise.resolve());
    const worker = FakeWorker.instances[0];

    act(() => result.current.generate('First request.'));
    act(() => result.current.generate('Replacement request.'));
    act(() => worker.emit({type: 'generation-chunk', requestId: 1, text: 'stale'}));
    act(() => worker.emit({type: 'generation-complete', requestId: 1, totalMs: 10}));
    expect(onComplete).not.toHaveBeenCalled();

    act(() => worker.emit({type: 'generation-phase', requestId: 2, phase: 'decoding'}));
    act(() => worker.emit({type: 'generation-chunk', requestId: 2, text: '{"fresh":true}'}));
    act(() => worker.emit({type: 'generation-complete', requestId: 2, totalMs: 20}));

    expect(onComplete).toHaveBeenCalledWith('{"fresh":true}');
    expect(result.current.generatedCharacters).toBe(14);
    expect(result.current.generationPhase).toBeNull();
    unmount();
  });

  it('blocks a new model download when browser storage is insufficient', async () => {
    Object.defineProperty(navigator, 'storage', {configurable: true, value: {estimate: vi.fn().mockResolvedValue({quota: 2_100_000_000, usage: 0})}});
    const {result, unmount} = renderHook(() => useGemma(vi.fn()));
    await act(async () => Promise.resolve());

    act(() => result.current.load());

    expect(FakeWorker.instances[0].messages.some(message => message.type === 'load')).toBe(false);
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/free browser storage/i);
    unmount();
  });
});
