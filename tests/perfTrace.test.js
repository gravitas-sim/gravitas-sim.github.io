// Prompt 112 part 3: the compositor measurement's bucket rules, on small
// synthetic traces. The probe itself needs a browser and is not run in CI.

import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, test, expect } from '@jest/globals';
import {
  summarizeLoaf,
  summarizeTrace,
  threadKind,
  traceEvents,
} from '../tools/perf-trace.mjs';

const meta = (pid, tid, name) => ({
  ph: 'M',
  name: 'thread_name',
  pid,
  tid,
  args: { name },
});
const slice = (tid, name, ts, dur) => ({ ph: 'X', pid: 1, tid, name, ts, dur });

describe('threads', () => {
  test('are told apart by name', () => {
    expect(threadKind('CrRendererMain')).toBe('main');
    expect(threadKind('Compositor')).toBe('compositor');
    expect(threadKind('VizCompositorThread')).toBe('viz');
    expect(threadKind('CompositorTileWorker1')).toBe('raster');
    expect(threadKind('CrGpuMain')).toBe('gpu');
    expect(threadKind('ThreadPoolForegroundWorker')).toBe('pool');
    expect(threadKind('Chrome_IOThread')).toBe('other');
  });
});

describe('summarizing a trace', () => {
  const events = [
    meta(1, 1, 'CrRendererMain'),
    meta(1, 2, 'Compositor'),
    meta(1, 3, 'CrGpuMain'),
    meta(1, 4, 'ThreadPoolForegroundWorker'),
    // Main: a frame of 10 ms holding 6 ms of calls, 2 ms of layout and 1 ms of
    // paint; the frame's own 1 ms is script (the callback's own time).
    slice(1, 'FireAnimationFrame', 0, 10_000),
    slice(1, 'FunctionCall', 500, 6_000),
    slice(1, 'UpdateLayoutTree', 6_500, 2_000),
    slice(1, 'Paint', 8_500, 1_000),
    slice(1, 'FireAnimationFrame', 20_000, 10_000),
    // Compositor 3 ms, GPU 4 ms, raster 2 ms on the pool (and 1 ms of something else).
    slice(2, 'ProxyImpl::ScheduledActionDraw', 10_000, 3_000),
    slice(3, 'GPUTask', 12_000, 4_000),
    slice(4, 'RasterTask', 11_000, 2_000),
    slice(4, 'DawnPlatformImpl::RunWorkerTask', 14_000, 1_000),
  ];

  test('separates script, layout, paint, compositor, raster and GPU time', () => {
    const s = summarizeTrace(events);
    // The window is first to last animation frame: 30 ms.
    expect(s.windowMs).toBeCloseTo(30, 9);
    // 6 ms of calls, plus the animation frames' own 1 ms and 10 ms.
    expect(s.buckets.script).toBeCloseTo(17, 9);
    expect(s.buckets.layout).toBeCloseTo(2, 9);
    expect(s.buckets.paint).toBeCloseTo(1, 9);
    expect(s.buckets.composite).toBeCloseTo(3, 9);
    expect(s.buckets.raster).toBeCloseTo(2, 9);
    expect(s.buckets.gpu).toBeCloseTo(4, 9);
  });

  test('counts a nested event once: the parent keeps only its own time', () => {
    const s = summarizeTrace(events);
    // Main thread busy: two animation frames of 10 ms each, nothing counted twice.
    expect(s.threadBusyMs.main).toBeCloseTo(20, 9);
    expect(s.threadBusyMs.pool).toBeCloseTo(3, 9);
    expect(s.threadBusyMs.compositor).toBeCloseTo(3, 9);
  });

  test('is null for a trace with nothing in it', () => {
    expect(summarizeTrace([])).toBeNull();
    expect(summarizeTrace([meta(1, 1, 'CrRendererMain')])).toBeNull();
  });

  test('reads a trace as a buffer, a JSON string, an object or an array', () => {
    const json = JSON.stringify({ traceEvents: events });
    expect(traceEvents(Buffer.from(json))).toHaveLength(events.length);
    expect(traceEvents(json)).toHaveLength(events.length);
    expect(traceEvents({ traceEvents: events })).toHaveLength(events.length);
    expect(traceEvents(events)).toHaveLength(events.length);
  });
});

describe('long animation frames', () => {
  test('total script and render time and keep the worst frame', () => {
    const out = summarizeLoaf([
      {
        startTime: 0,
        duration: 80,
        renderStart: 60,
        styleAndLayoutStart: 70,
        blockingDuration: 30,
        scripts: [{ duration: 40 }, { duration: 10 }],
      },
      {
        startTime: 100,
        duration: 55,
        renderStart: 150,
        styleAndLayoutStart: 152,
        blockingDuration: 5,
        scripts: [],
      },
    ]);
    expect(out).toEqual({
      frames: 2,
      scriptMs: 50,
      renderMs: 20 + 5,
      styleLayoutMs: 10 + 3,
      blockingMs: 35,
      worstMs: 80,
    });
  });
});

describe('the recorded thresholds', () => {
  const file = JSON.parse(
    readFileSync(new URL('../tools/perf-thresholds.json', import.meta.url))
  );

  test('are advisory: every profile says so and no workflow reads the file', () => {
    for (const [name, profile] of Object.entries(file.profiles)) {
      expect([name, profile.enforced]).toEqual([name, false]);
    }
    const ci = readFileSync(
      new URL('../.github/workflows/ci.yml', import.meta.url),
      'utf8'
    );
    expect(ci).not.toMatch(/perf-thresholds|perf-probe|npm run perf/);
  });

  test('give every measured scenario a threshold above what was measured', () => {
    let measured = 0;
    for (const profile of Object.values(file.profiles)) {
      for (const s of Object.values(profile.scenarios)) {
        measured++;
        expect(s.frameMsThreshold).toBeGreaterThan(s.measuredFrameMs);
      }
    }
    expect(measured).toBeGreaterThan(0);
  });

  test('keep the real-device profiles empty until measured on a device', () => {
    expect(file.profiles['real-chromebook'].scenarios).toEqual({});
    expect(file.profiles['real-phone'].scenarios).toEqual({});
  });
});
