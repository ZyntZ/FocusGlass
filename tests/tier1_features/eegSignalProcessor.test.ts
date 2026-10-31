import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EEGSignalProcessor } from '../../src/services/eegSignalProcessor.ts';
import { SimulationEngine, simulationEngine } from '../../src/services/simulationEngine.ts';
import { BiofeedbackEngine } from '../../src/services/biofeedbackEngine.ts';
import { useFocusStore } from '../../src/stores/useFocusStore.ts';

const ALL_OK = { t3: true, t4: true, o1: true, o2: true };

describe('EEGSignalProcessor — Bipolar Montage, 50 Hz Notch & Spectral Powers', () => {
  it('suppresses 50 Hz power-line interference while preserving 10 Hz occipital Alpha', () => {
    const dsp = new EEGSignalProcessor(250);
    const fs = 250;
    let lastSnap = dsp.processSample({ t3: 0, t4: 0, o1: 0, o2: 0 }, ALL_OK);

    // 1.5 seconds (375 samples): 25 uV 10 Hz Alpha + 95 uV 50 Hz mains interference
    // Raw sum reaches 120 uV (> 110 uV border), but after 50 Hz notch steady-state amplitude is ~25 uV
    for (let n = 0; n < 375; n++) {
      const t = n / fs;
      const alpha10 = 25 * Math.sin(2 * Math.PI * 10 * t);
      const hum50 = 95 * Math.sin(2 * Math.PI * 50 * t);
      lastSnap = dsp.processSample(
        {
          t3: 0,
          t4: 0,
          o1: alpha10 + hum50,
          o2: alpha10 + hum50,
        },
        ALL_OK
      );
    }

    assert.equal(lastSnap.bothSidesArtifacted, false);
    assert.ok(
      Math.abs(lastSnap.bipolarLeftUv) <= 28,
      `Expected filtered amplitude <= 28 uV after 50 Hz notch, got ${lastSnap.bipolarLeftUv}`
    );
    assert.ok(
      lastSnap.spectrum.alpha > 90,
      `Expected Alpha relative power > 90%, got ${lastSnap.spectrum.alpha}%`
    );
    assert.ok(
      lastSnap.estimatedRelaxation > 70,
      `Expected high estimated relaxation from dominant Alpha, got ${lastSnap.estimatedRelaxation}`
    );
  });

  it('distinguishes 6 Hz Theta, 10 Hz Alpha, and 20 Hz Beta rhythms', () => {
    const fs = 250;

    const runPureSine = (freqHz: number) => {
      const dsp = new EEGSignalProcessor(fs);
      let snap = dsp.processSample({ t3: 0, t4: 0, o1: 0, o2: 0 }, ALL_OK);
      for (let n = 0; n < 300; n++) {
        const val = 22 * Math.sin((2 * Math.PI * freqHz * n) / fs);
        snap = dsp.processSample(
          { t3: -val * 0.5, t4: -val * 0.5, o1: val * 0.5, o2: val * 0.5 },
          ALL_OK
        );
      }
      return snap;
    };

    const thetaSnap = runPureSine(6);
    assert.ok(
      thetaSnap.spectrum.theta > 85,
      `Expected dominant Theta, got ${JSON.stringify(thetaSnap.spectrum)}`
    );
    assert.ok(thetaSnap.estimatedConcentration < 20);

    const alphaSnap = runPureSine(10);
    assert.ok(
      alphaSnap.spectrum.alpha > 85,
      `Expected dominant Alpha, got ${JSON.stringify(alphaSnap.spectrum)}`
    );

    const betaSnap = runPureSine(20);
    assert.ok(
      betaSnap.spectrum.beta > 85,
      `Expected dominant Beta, got ${JSON.stringify(betaSnap.spectrum)}`
    );
    assert.ok(betaSnap.estimatedConcentration > 80);
  });

  it('normalizes PSD by band width so flat broadband noise does not inflate Beta', () => {
    const dsp = new EEGSignalProcessor(250, { normalizeByBandwidth: true });
    const fs = 250;
    let snap = dsp.processSample({ t3: 0, t4: 0, o1: 0, o2: 0 }, ALL_OK);

    // Deterministic multitone with identical amplitude across every integer bin 4..30 Hz
    for (let n = 0; n < 300; n++) {
      let multi = 0;
      for (let f = 4; f <= 30; f++) {
        multi += 2.2 * Math.sin((2 * Math.PI * f * n) / fs + f * 0.7);
      }
      snap = dsp.processSample({ t3: 0, t4: 0, o1: multi, o2: multi }, ALL_OK);
    }

    assert.ok(
      snap.spectrum.beta >= 28 && snap.spectrum.beta <= 39,
      `Expected unbiased broadband Beta PSD ~33%, got ${JSON.stringify(snap.spectrum)}`
    );
    assert.ok(
      snap.estimatedConcentration >= 44 && snap.estimatedConcentration <= 56,
      `Expected neutral ~50% concentration on flat spectrum, got ${snap.estimatedConcentration}`
    );
  });

  it('falls back to clean hemisphere on unilateral contact loss and flags bilateral >110 uV artifacts', () => {
    const dsp = new EEGSignalProcessor(250);
    const fs = 250;
    let snap = dsp.processSample({ t3: 0, t4: 0, o1: 0, o2: 0 }, ALL_OK);

    // Left T3 detached, Right O2-T4 carries clean 20 Hz Beta
    for (let n = 0; n < 300; n++) {
      const beta20 = 24 * Math.sin((2 * Math.PI * 20 * n) / fs);
      snap = dsp.processSample(
        { t3: 90, t4: 0, o1: 0, o2: beta20 },
        { t3: false, t4: true, o1: true, o2: true }
      );
    }

    assert.equal(snap.leftArtifact, true);
    assert.equal(snap.rightArtifact, false);
    assert.equal(snap.bothSidesArtifacted, false);
    assert.ok(snap.spectrum.beta > 85);

    // Bilateral EOG spike > 110 uV
    const spikeSnap = dsp.processSample({ t3: -95, t4: -95, o1: 95, o2: 95 }, ALL_OK);
    assert.equal(spikeSnap.leftArtifact, true);
    assert.equal(spikeSnap.rightArtifact, true);
    assert.equal(spikeSnap.bothSidesArtifacted, true);
  });

  it('converts NeuroSDK2 Volts (unit: "V") to microvolts and drives ingestRawBrainBitPacket', () => {
    const engine = new SimulationEngine();
    engine.updateSettings({
      deviceSource: 'bluetooth',
      mode: 'concentration',
      threshold: 65,
      sensitivitySeconds: 1.0,
    });

    let lastFeedback = engine.ingestRawBrainBitPacket({
      timestamp: 1000,
      rawChannels: { t3: 0, t4: 0, o1: 0, o2: 0 },
      unit: 'V',
    });

    // Feed 1.5s of 24e-6 V (24 uV) 20 Hz Beta in Volts -> scaled to uV, high concentration -> 0 dimming
    for (let n = 1; n <= 375; n++) {
      const betaVolts = 24e-6 * Math.sin((2 * Math.PI * 20 * n) / 250);
      lastFeedback = engine.ingestRawBrainBitPacket({
        timestamp: 1000 + n * 4,
        rawChannels: { t3: -betaVolts * 0.5, t4: -betaVolts * 0.5, o1: betaVolts * 0.5, o2: betaVolts * 0.5 },
        unit: 'V',
        signalQuality: ALL_OK,
      });
    }

    const buffer = engine.getRawBuffer();
    const peakT3Uv = Math.max(...buffer.slice(-50).map((f) => Math.abs(f.rawChannels.t3)));
    assert.ok(peakT3Uv > 8 && peakT3Uv < 15, `Expected ~12 uV scaled T3 amplitude, got ${peakT3Uv}`);
    assert.equal(lastFeedback.isDimmingActive, false);
    assert.ok(lastFeedback.smoothedMetric > 75);
  });

  it('records 1 Hz session timeline, resting spectral baseline, and cycles HUD corner', () => {
    simulationEngine.stop();
    useFocusStore.getState().updateSettings({ deviceSource: 'simulator', mode: 'concentration' });
    useFocusStore.getState().resetSession(false);
    useFocusStore.getState().clearSessionHistory();

    // Step 3.2 seconds (800 samples at 250 Hz)
    simulationEngine.setPreset('calm_flow');
    for (let i = 0; i < 200; i++) {
      simulationEngine.stepSamples(4);
    }

    const timeline = useFocusStore.getState().sessionTimeline;
    assert.equal(timeline.length, 3, `Expected 3 timeline points (1s..3s), got ${timeline.length}`);

    const calib = BiofeedbackEngine.calibrateBaseline(simulationEngine.getRawBuffer(), 'concentration');
    assert.ok(calib.baselineSpectrum !== undefined);
    assert.ok(
      Math.abs(
        calib.baselineSpectrum.theta + calib.baselineSpectrum.alpha + calib.baselineSpectrum.beta - 100
      ) < 0.25
    );

    useFocusStore.getState().resetSession(true);
    assert.equal(useFocusStore.getState().sessionHistory.length, 1);
    assert.equal(useFocusStore.getState().sessionTimeline.length, 0);

    const startCorner = useFocusStore.getState().hudCorner;
    useFocusStore.getState().cycleHudCorner();
    assert.notEqual(useFocusStore.getState().hudCorner, startCorner);
  });
});
