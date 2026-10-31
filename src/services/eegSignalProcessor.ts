import type {
  EEGTelemetry,
  ElectrodeSignalQuality,
  ChannelResistanceKOhm,
  RawEEGChannels,
  SpectralBandPowers,
} from './eegTypes';

class BiquadNotch50Hz {
  private z1 = 0;
  private z2 = 0;
  private readonly b0: number;
  private readonly b1: number;
  private readonly b2: number;
  private readonly a1: number;
  private readonly a2: number;

  constructor(sampleRateHz: number = 250, notchFreqHz: number = 50, q: number = 10) {
    const w0 = (2 * Math.PI * notchFreqHz) / sampleRateHz;
    const cosW0 = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);
    const a0 = 1 + alpha;

    this.b0 = 1 / a0;
    this.b1 = (-2 * cosW0) / a0;
    this.b2 = 1 / a0;
    this.a1 = (-2 * cosW0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  public process(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }

  public reset(): void {
    this.z1 = 0;
    this.z2 = 0;
  }
}

export interface BipolarProcessingSnapshot {
  bipolarLeftUv: number;
  bipolarRightUv: number;
  leftArtifact: boolean;
  rightArtifact: boolean;
  bothSidesArtifacted: boolean;
  spectrum: SpectralBandPowers;
  estimatedConcentration: number;
  estimatedRelaxation: number;
}

const THETA_BINS_COUNT = 4; // 4..7 Hz
const ALPHA_BINS_COUNT = 6; // 8..13 Hz
const BETA_BINS_COUNT = 17; // 14..30 Hz

/**
 * Real-time 4-channel BrainBit signal processor:
 * - Differential bipolar derivations: Left (O1 - T3) and Right (O2 - T4)
 * - 2nd-order 50 Hz IIR notch filter per hemisphere
 * - Per-hemisphere amplitude (> 110 uV, BrainBit SDK art_bord) & step (> 75 uV) artifact rejection
 * - 1-second (250-sample) Hamming-windowed Goertzel PSD estimation normalized by band width
 *   (uV^2/Hz, matching EmotionalMath set_spect_normalization_by_bands_width = true)
 */
export class EEGSignalProcessor {
  private readonly sampleRateHz: number;
  private readonly windowSize: number;
  private readonly stepSamples: number;
  private readonly amplitudeBorderUv: number;
  private readonly stepJumpBorderUv: number;
  private readonly normalizeByBandwidth: boolean;

  private readonly notchLeft: BiquadNotch50Hz;
  private readonly notchRight: BiquadNotch50Hz;
  private readonly hamming: Float64Array;
  private readonly goertzelCoeffs: Map<number, { coeff: number; cosW: number; sinW: number }> =
    new Map();

  private leftBuffer: number[] = [];
  private rightBuffer: number[] = [];
  private prevLeftFiltered: number | null = null;
  private prevRightFiltered: number | null = null;
  private samplesSinceSpectrumUpdate: number = 0;

  private lastSpectrum: SpectralBandPowers = {
    theta: 33.3,
    alpha: 33.3,
    beta: 33.4,
  };
  private lastEstimatedConcentration: number = 50;
  private lastEstimatedRelaxation: number = 50;

  constructor(
    sampleRateHz: number = 250,
    options?: {
      amplitudeBorderUv?: number;
      stepJumpBorderUv?: number;
      updateRateHz?: number;
      normalizeByBandwidth?: boolean;
    }
  ) {
    this.sampleRateHz = sampleRateHz;
    this.windowSize = sampleRateHz; // 1.0 s window -> 1 Hz frequency resolution
    const updateRate = options?.updateRateHz ?? 25; // Matches EmotionalMath process_win_freq = 25 Hz
    this.stepSamples = Math.max(1, Math.round(sampleRateHz / updateRate));
    this.amplitudeBorderUv = options?.amplitudeBorderUv ?? 110;
    this.stepJumpBorderUv = options?.stepJumpBorderUv ?? 75;
    this.normalizeByBandwidth = options?.normalizeByBandwidth ?? true;

    this.notchLeft = new BiquadNotch50Hz(sampleRateHz, 50, 10);
    this.notchRight = new BiquadNotch50Hz(sampleRateHz, 50, 10);

    this.hamming = new Float64Array(this.windowSize);
    for (let n = 0; n < this.windowSize; n++) {
      this.hamming[n] = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (this.windowSize - 1));
    }

    for (let freq = 4; freq <= 30; freq++) {
      const omega = (2 * Math.PI * freq) / this.sampleRateHz;
      this.goertzelCoeffs.set(freq, {
        coeff: 2 * Math.cos(omega),
        cosW: Math.cos(omega),
        sinW: Math.sin(omega),
      });
    }
  }

  public reset(): void {
    this.notchLeft.reset();
    this.notchRight.reset();
    this.leftBuffer = [];
    this.rightBuffer = [];
    this.prevLeftFiltered = null;
    this.prevRightFiltered = null;
    this.samplesSinceSpectrumUpdate = 0;
  }

  public processSample(
    rawChannels: RawEEGChannels,
    signalQuality: ElectrodeSignalQuality
  ): BipolarProcessingSnapshot {
    const leftRaw = rawChannels.o1 - rawChannels.t3;
    const rightRaw = rawChannels.o2 - rawChannels.t4;

    const leftFiltered = this.notchLeft.process(leftRaw);
    const rightFiltered = this.notchRight.process(rightRaw);

    const leftContactOk = signalQuality.t3 && signalQuality.o1;
    const rightContactOk = signalQuality.t4 && signalQuality.o2;

    const leftJump =
      this.prevLeftFiltered !== null ? Math.abs(leftFiltered - this.prevLeftFiltered) : 0;
    const rightJump =
      this.prevRightFiltered !== null ? Math.abs(rightFiltered - this.prevRightFiltered) : 0;

    this.prevLeftFiltered = leftFiltered;
    this.prevRightFiltered = rightFiltered;

    const leftArtifact =
      !leftContactOk ||
      Math.abs(leftFiltered) > this.amplitudeBorderUv ||
      leftJump > this.stepJumpBorderUv;
    const rightArtifact =
      !rightContactOk ||
      Math.abs(rightFiltered) > this.amplitudeBorderUv ||
      rightJump > this.stepJumpBorderUv;
    const bothSidesArtifacted = leftArtifact && rightArtifact;

    if (!leftArtifact) {
      this.leftBuffer.push(leftFiltered);
      if (this.leftBuffer.length > this.windowSize) {
        this.leftBuffer.shift();
      }
    }

    if (!rightArtifact) {
      this.rightBuffer.push(rightFiltered);
      if (this.rightBuffer.length > this.windowSize) {
        this.rightBuffer.shift();
      }
    }

    this.samplesSinceSpectrumUpdate++;
    if (this.samplesSinceSpectrumUpdate >= this.stepSamples && !bothSidesArtifacted) {
      this.samplesSinceSpectrumUpdate = 0;
      this.recomputeSpectrum(!leftArtifact, !rightArtifact);
    }

    return {
      bipolarLeftUv: Number(leftFiltered.toFixed(2)),
      bipolarRightUv: Number(rightFiltered.toFixed(2)),
      leftArtifact,
      rightArtifact,
      bothSidesArtifacted,
      spectrum: { ...this.lastSpectrum },
      estimatedConcentration: this.lastEstimatedConcentration,
      estimatedRelaxation: this.lastEstimatedRelaxation,
    };
  }

  /**
   * Converts a raw 4-channel NeuroSDK2 sample into full EEGTelemetry when EmotionalMath DLL is absent.
   * Supports explicit 'V' -> 'uV' scaling since NeuroSDK2 SignalData reports Volts.
   */
  public toTelemetryFrame(params: {
    timestamp: number;
    rawChannels: RawEEGChannels;
    unit?: 'uV' | 'V';
    signalQuality: ElectrodeSignalQuality;
    resistanceKOhm?: ChannelResistanceKOhm;
  }): EEGTelemetry {
    const scale = params.unit === 'V' ? 1_000_000 : 1;
    const scaledChannels: RawEEGChannels = {
      t3: Number((params.rawChannels.t3 * scale).toFixed(2)),
      t4: Number((params.rawChannels.t4 * scale).toFixed(2)),
      o1: Number((params.rawChannels.o1 * scale).toFixed(2)),
      o2: Number((params.rawChannels.o2 * scale).toFixed(2)),
    };

    const snap = this.processSample(scaledChannels, params.signalQuality);
    return {
      timestamp: params.timestamp,
      rawChannels: scaledChannels,
      concentration: snap.estimatedConcentration,
      relaxation: snap.estimatedRelaxation,
      signalQuality: { ...params.signalQuality },
      resistanceKOhm: params.resistanceKOhm,
      spectrum: snap.spectrum,
      isArtifact: snap.bothSidesArtifacted,
    };
  }

  private recomputeSpectrum(useLeft: boolean, useRight: boolean): void {
    const minSamples = 64;
    const canLeft = useLeft && this.leftBuffer.length >= minSamples;
    const canRight = useRight && this.rightBuffer.length >= minSamples;
    if (!canLeft && !canRight) return;

    let thetaPower = 0;
    let alphaPower = 0;
    let betaPower = 0;

    if (canLeft && canRight) {
      const l = this.computeBandPowers(this.leftBuffer);
      const r = this.computeBandPowers(this.rightBuffer);
      thetaPower = 0.5 * (l.theta + r.theta);
      alphaPower = 0.5 * (l.alpha + r.alpha);
      betaPower = 0.5 * (l.beta + r.beta);
    } else if (canLeft) {
      const l = this.computeBandPowers(this.leftBuffer);
      thetaPower = l.theta;
      alphaPower = l.alpha;
      betaPower = l.beta;
    } else if (canRight) {
      const r = this.computeBandPowers(this.rightBuffer);
      thetaPower = r.theta;
      alphaPower = r.alpha;
      betaPower = r.beta;
    }

    const total = thetaPower + alphaPower + betaPower;
    if (total <= 1e-9) return;

    const thetaPct = Number(((thetaPower / total) * 100).toFixed(1));
    const alphaPct = Number(((alphaPower / total) * 100).toFixed(1));
    const betaPct = Number(Math.max(0, 100 - thetaPct - alphaPct).toFixed(1));

    this.lastSpectrum = {
      theta: thetaPct,
      alpha: alphaPct,
      beta: betaPct,
    };

    // Unbiased ratios: flat broadband PSD (theta == alpha == beta) maps to 50% Concentration & 50% Relaxation
    const engagementRatio = betaPower / (alphaPower + thetaPower + 1e-6);
    const calmRatio = alphaPower / (betaPower + 0.6 * thetaPower + 1e-6);

    const conc = 100 * (engagementRatio / (engagementRatio + 0.5));
    const relax = 100 * (calmRatio / (calmRatio + 0.625));

    this.lastEstimatedConcentration = Number(Math.max(0, Math.min(100, conc)).toFixed(2));
    this.lastEstimatedRelaxation = Number(Math.max(0, Math.min(100, relax)).toFixed(2));
  }

  private computeBandPowers(samples: number[]): {
    theta: number;
    alpha: number;
    beta: number;
  } {
    const N = samples.length;
    let mean = 0;
    for (let i = 0; i < N; i++) {
      mean += samples[i];
    }
    mean /= N;

    const windowed = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const w =
        N === this.windowSize
          ? this.hamming[i]
          : 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / Math.max(1, N - 1));
      windowed[i] = (samples[i] - mean) * w;
    }

    let theta = 0;
    let alpha = 0;
    let beta = 0;

    for (let freq = 4; freq <= 30; freq++) {
      const p = this.binPower(windowed, freq);
      if (freq <= 7) {
        theta += p;
      } else if (freq <= 13) {
        alpha += p;
      } else {
        beta += p;
      }
    }

    if (this.normalizeByBandwidth) {
      theta /= THETA_BINS_COUNT;
      alpha /= ALPHA_BINS_COUNT;
      beta /= BETA_BINS_COUNT;
    }

    return { theta, alpha, beta };
  }

  private binPower(windowed: Float64Array, freqHz: number): number {
    const params = this.goertzelCoeffs.get(freqHz);
    if (!params) return 0;

    let s1 = 0;
    let s2 = 0;
    const { coeff, cosW, sinW } = params;

    for (let i = 0; i < windowed.length; i++) {
      const s0 = windowed[i] + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
    }

    const real = s1 - s2 * cosW;
    const imag = s2 * sinW;
    const norm = windowed.length * windowed.length;
    return (real * real + imag * imag) / Math.max(1, norm);
  }
}
