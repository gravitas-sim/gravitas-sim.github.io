/**
 * @jest-environment jsdom
 */
import { describe, test, expect } from '@jest/globals';
import { createSurvey } from '../js/rvSurvey.js';
import {
  loadRecording,
  exportReport,
  resetWorkspace,
} from '../js/rvWorkspace.js';
import { fromRvFit } from '../js/notebook/capture.js';

// =============================================================================
// The acquisition chain, end to end
// -----------------------------------------------------------------------------
// A recording is evidence about a moment, and every link between the telescope
// and the notebook entry is a chance to describe a different one. The links
// are:
//
//   captureProvenance -> recordingPayload -> the workspace's source
//     -> exportReport().recording -> recordedProvenance -> the entry
//
// This drives a real survey with a real missed epoch, builds the payload the
// way js/radialVelocity.js does, changes the world afterwards, and checks that
// nothing the world did later reached the entry.
// =============================================================================

const PERIOD = 3.5;
const K = 60;
const signal = day => K * Math.sin((2 * Math.PI * day) / PERIOD);

/**
 * A run with a stretch in the middle where nobody was observing.
 *
 * @returns {object} The finished survey
 */
function surveyWithAMissedStretch() {
  const survey = createSurvey({
    cadenceDays: 1,
    baselineDays: 11,
    sigmaMs: 0,
    seed: 'chain',
  });
  for (let t = 0; t <= 3; t += 0.25) survey.observe(t, signal(t));
  // The panel closes. Nothing observes for four days, so the epochs falling
  // due in that stretch are recorded as missed - rows with a scheduled day and
  // no velocity, which is exactly the thing that must not be counted as an
  // observation.
  survey.suspend(3);
  for (let t = 7; t <= 12; t += 0.25) survey.observe(t, signal(t));
  return survey;
}

/**
 * The payload js/radialVelocity.js builds, with the acquisition-time facts
 * frozen into it. Written out here rather than imported because
 * recordingPayload() is private to that module and reaches for the live world;
 * the shape is what this test is about, and it is asserted against the real
 * one in e2e/rvSchedule.spec.js.
 *
 * @param {object} survey - The finished run
 * @param {object} atAcquisition - What the world was when it ran
 * @returns {object} The recording
 */
function payload(survey, atAcquisition) {
  return {
    points: survey.measurements(),
    target: 'HD 209458',
    targetId: 12,
    scenario: 'Exoplanet Characterization Lab',
    seed: 'chain',
    config: {
      cadenceDays: 1,
      baselineDays: 11,
      sigma: 0,
      scheduleKind: null,
      scheduleEpochs: null,
    },
    scheduleFingerprint: null,
    geometry: { inclinationDeg: 88, positionAngleDeg: 12 },
    units: { velocityUnitToMs: 1, timeUnitSeconds: 1 },
    numerical: {
      integrator: 'Velocity Verlet',
      maxTimestep: 0.25,
      simSpeed: 1,
    },
    worldGeneration: atAcquisition.worldGeneration,
    interventionEpoch: atAcquisition.interventionEpoch,
    plannedEpochs: survey.plannedCount,
    recordedAt: '2026-09-08T00:00:00Z',
    truth: null,
  };
}

/** The shape the workspace panel's analysis() produces, enough of it. */
const analysisFor = report => ({
  tooFew: false,
  trial: report.parameters,
  atTrial: { rms: report.rms ?? 4, reducedChi2: 1.02, chi2: 10, dof: 9 },
  folded: [],
  structure: null,
  used: report.recording.epochs.count,
  excluded: { missed: report.recording.epochs.missed, notFinite: 0 },
  search: null,
  revealed: false,
  truth: null,
});

describe('the acquisition chain survives the world moving on', () => {
  test('a real recording with a missed stretch keeps every count apart', () => {
    resetWorkspace();
    const survey = surveyWithAMissedStretch();
    const rows = survey.measurements();
    const missed = rows.filter(m => m.missed).length;
    // The premise of the whole test: there is something to miscount.
    expect(missed).toBeGreaterThan(0);
    expect(rows.length).toBeGreaterThan(missed);

    loadRecording(
      payload(survey, { worldGeneration: 4, interventionEpoch: 2 })
    );
    const report = exportReport();
    const rec = report.recording;

    // Planned is the programme, not the rows that came back.
    expect(rec.plannedEpochs).toBe(survey.plannedCount);
    expect(rec.epochs.attempted).toBe(rows.length);
    // Observations are readings. A missed epoch is not one.
    expect(rec.epochs.count).toBe(rows.length - missed);
    expect(rec.epochs.missed).toBe(missed);
    expect(rec.epochs.unusable).toBe(0);
    expect(rec.epochs.count).toBeLessThan(rec.epochs.attempted);
    // And the four numbers are four numbers, not one repeated.
    expect(
      new Set([
        rec.plannedEpochs,
        rec.epochs.attempted,
        rec.epochs.count,
        rec.epochs.missed,
      ]).size
    ).toBeGreaterThan(2);
  });

  test('the acquisition-time world reaches the entry, and the later one does not', () => {
    resetWorkspace();
    const survey = surveyWithAMissedStretch();
    loadRecording(
      payload(survey, { worldGeneration: 4, interventionEpoch: 2 })
    );
    const report = exportReport();

    // Now the reader burns twice and rebuilds the world before saving.
    const entry = fromRvFit({
      analysis: analysisFor(report),
      report,
      provenance: {
        worldGeneration: 11,
        interventionEpoch: 9,
        observer: { positionAngleDeg: 170, inclinationDeg: 20 },
        integrator: 'Symplectic Euler',
        simTimeUnits: 4321,
      },
    });

    const p = entry.snapshot.provenance;
    expect(p.worldGeneration).toBe(4);
    expect(p.interventionEpoch).toBe(2);
    // And the rest of the acquisition-time block came with it.
    expect(p.observer).toEqual({ positionAngleDeg: 12, inclinationDeg: 88 });
    expect(p.numerical.integrator).toBe('Velocity Verlet');
    // The analysis did not happen at the clock reading of the save.
    expect(p.simTimeUnits).toBeNull();
    // Observations, not rows.
    expect(p.observedEpochs.count).toBe(report.recording.epochs.count);
  });

  test('a recording too old to say leaves the counters null, not current', () => {
    resetWorkspace();
    const survey = surveyWithAMissedStretch();
    const older = payload(survey, {
      worldGeneration: undefined,
      interventionEpoch: undefined,
    });
    delete older.worldGeneration;
    delete older.interventionEpoch;
    delete older.plannedEpochs;
    loadRecording(older);
    const report = exportReport();
    expect(report.recording.interventionEpoch).toBeNull();
    expect(report.recording.plannedEpochs).toBeNull();

    const entry = fromRvFit({
      analysis: analysisFor(report),
      report,
      provenance: { worldGeneration: 11, interventionEpoch: 9 },
    });
    expect(entry.snapshot.provenance.worldGeneration).toBeNull();
    expect(entry.snapshot.provenance.interventionEpoch).toBeNull();
  });
});
