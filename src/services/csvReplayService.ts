import type { EEGTelemetry, RawEEGChannels } from './eegTypes';

export interface ParsedEegCsv {
  samples: RawEEGChannels[];
  detectedUnit: 'uV' | 'V';
}

function detectDelimiter(line: string): string {
  const counts: Array<[string, number]> = [
    [';', (line.match(/;/g) ?? []).length],
    ['\t', (line.match(/\t/g) ?? []).length],
    [',', (line.match(/,/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (const cand of candidates) {
    const exact = headers.findIndex((h) => h === cand);
    if (exact !== -1) return exact;
  }
  for (const cand of candidates) {
    const partial = headers.findIndex((h) => h.startsWith(cand) || h.includes(cand));
    if (partial !== -1) return partial;
  }
  return -1;
}

/**
 * Parses a 4-channel EEG recording CSV/TSV (BrainBit / MNE-Python / FocusGlass export).
 * Supports headers (T3/T7, T4/T8, O1, O2) or 4+ numeric columns, and auto-scales Volts -> uV.
 */
export function parseEegCsv(csvText: string): ParsedEegCsv {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length < 2) {
    throw new Error('CSV file contains too few rows.');
  }

  const delimiter = detectDelimiter(lines[0]);
  const firstTokens = lines[0].split(delimiter).map((t) => t.trim().replace(/^["']|["']$/g, ''));
  const hasHeader = firstTokens.some((tok) => tok.length > 0 && Number.isNaN(Number(tok)));

  let idxT3 = 0;
  let idxT4 = 1;
  let idxO1 = 2;
  let idxO2 = 3;
  let startRow = 0;
  let explicitVoltsHeader = false;
  let explicitUvHeader = false;

  if (hasHeader) {
    startRow = 1;
    const normHeaders = firstTokens.map((h) => h.toLowerCase().replace(/\s+/g, '_'));

    explicitUvHeader = normHeaders.some((h) => h.includes('uv') || h.includes('µv'));
    explicitVoltsHeader =
      !explicitUvHeader &&
      normHeaders.some((h) => h.endsWith('_v') || h.includes('(v)'));

    const foundT3 = findColumnIndex(normHeaders, ['t3_uv', 't3', 't7', 'eeg_t3', 'ch1', 'channel_1']);
    const foundT4 = findColumnIndex(normHeaders, ['t4_uv', 't4', 't8', 'eeg_t4', 'ch2', 'channel_2']);
    const foundO1 = findColumnIndex(normHeaders, ['o1_uv', 'o1', 'eeg_o1', 'ch3', 'channel_3']);
    const foundO2 = findColumnIndex(normHeaders, ['o2_uv', 'o2', 'eeg_o2', 'ch4', 'channel_4']);

    if (foundT3 !== -1 && foundT4 !== -1 && foundO1 !== -1 && foundO2 !== -1) {
      idxT3 = foundT3;
      idxT4 = foundT4;
      idxO1 = foundO1;
      idxO2 = foundO2;
    } else if (firstTokens.length >= 5) {
      idxT3 = 1;
      idxT4 = 2;
      idxO1 = 3;
      idxO2 = 4;
    }
  } else if (firstTokens.length >= 5) {
    // Leading timestamp/index column followed by 4 EEG channels
    idxT3 = 1;
    idxT4 = 2;
    idxO1 = 3;
    idxO2 = 4;
  }

  const maxIdx = Math.max(idxT3, idxT4, idxO1, idxO2);
  const rawSamples: RawEEGChannels[] = [];
  let maxAbs = 0;

  for (let i = startRow; i < lines.length; i++) {
    const cols = lines[i].split(delimiter);
    if (cols.length <= maxIdx) continue;

    const t3 = Number(cols[idxT3]);
    const t4 = Number(cols[idxT4]);
    const o1 = Number(cols[idxO1]);
    const o2 = Number(cols[idxO2]);

    if (
      !Number.isFinite(t3) ||
      !Number.isFinite(t4) ||
      !Number.isFinite(o1) ||
      !Number.isFinite(o2)
    ) {
      continue;
    }

    const rowPeak = Math.max(Math.abs(t3), Math.abs(t4), Math.abs(o1), Math.abs(o2));
    if (rowPeak > maxAbs) maxAbs = rowPeak;

    rawSamples.push({ t3, t4, o1, o2 });
  }

  if (rawSamples.length < 10) {
    throw new Error('CSV must contain at least 10 valid 4-channel EEG rows (T3, T4, O1, O2).');
  }

  // NeuroSDK2 raw recordings in Volts typically fall inside 1e-6 .. 5e-3 V
  const isVolts = explicitVoltsHeader || (!explicitUvHeader && maxAbs > 0 && maxAbs < 0.02);
  const scale = isVolts ? 1_000_000 : 1;

  const samples = rawSamples.map((s) => ({
    t3: Number((s.t3 * scale).toFixed(2)),
    t4: Number((s.t4 * scale).toFixed(2)),
    o1: Number((s.o1 * scale).toFixed(2)),
    o2: Number((s.o2 * scale).toFixed(2)),
  }));

  return {
    samples,
    detectedUnit: isVolts ? 'V' : 'uV',
  };
}

/**
 * Formats 250 Hz EEGTelemetry buffer into MNE-Python & spreadsheet compatible CSV.
 */
export function formatRawBufferToCsv(frames: EEGTelemetry[]): string {
  const header = [
    'timestamp_ms',
    't3_uv',
    't4_uv',
    'o1_uv',
    'o2_uv',
    'theta_pct',
    'alpha_pct',
    'beta_pct',
    'concentration_pct',
    'relaxation_pct',
    'is_artifact',
  ].join(',');

  const rows = frames.map((f) =>
    [
      f.timestamp,
      f.rawChannels.t3.toFixed(2),
      f.rawChannels.t4.toFixed(2),
      f.rawChannels.o1.toFixed(2),
      f.rawChannels.o2.toFixed(2),
      (f.spectrum?.theta ?? 0).toFixed(1),
      (f.spectrum?.alpha ?? 0).toFixed(1),
      (f.spectrum?.beta ?? 0).toFixed(1),
      f.concentration.toFixed(2),
      f.relaxation.toFixed(2),
      f.isArtifact ? 1 : 0,
    ].join(',')
  );

  return [header, ...rows].join('\n');
}
