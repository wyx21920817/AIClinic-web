export const SOP_CLASS_UIDS = [
  "1.2.840.10008.5.1.4.1.1.9.1.1",  // 12-lead ECG Waveform Storage
  "1.2.840.10008.5.1.4.1.1.9.1.2",  // General ECG Waveform Storage
  "1.2.840.10008.5.1.4.1.1.9.1.3"   // Ambulatory ECG Waveform Storage
];

export const WAVE_FORM_BITS_STORED = 16;

export const KEY_UNIT_INFO = [
  { key: "VentricularRate", unit: "bpm" },
  { key: "AtrialRate", unit: "bpm" },
  { key: "PRInterval", unit: "ms" },
  { key: "QRSDuration", unit: "ms" },
  { key: "QTInterval", unit: "ms" },
  { key: "QTCorrected", unit: "ms" },
  { key: "PAxis", unit: "°" },
  { key: "RAxis", unit: "°" },
  { key: "TAxis", unit: "°" },
  { key: "QRSCount", unit: "" },
  { key: "QOnset", unit: "ms" },
  { key: "QOffset", unit: "ms" },
  { key: "POnset", unit: "ms" },
  { key: "POffset", unit: "ms" },
  { key: "TOffset", unit: "ms" }
];

export const SPLINE = {
  TENSION: 0.5,
  NUM_OF_SEGMENTS: 16
};
