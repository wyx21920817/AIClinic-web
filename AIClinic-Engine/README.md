# XAI ECG Visualization and Explanation

This module generates clinically oriented visual explanations for ECG data and writes JSON reports. It supports both WFDB and DICOM ECG, and produces a unified results index that a front-end can consume directly.

## Highlights
- Supported categories:
  - AF (Atrial Fibrillation)
  - ST (Sinus Tachycardia)
  - SB (Sinus Bradycardia) 
  - LBBB / RBBB (Left/Right Bundle Branch Block)
  - 1dAVB (1st Degree AV Block)
  - NR (Normal ECG)
- Data sources:
  - WFDB records 
  - DICOM ECG Waveform (de-multiplexed and scaled to mV)
- Outputs:
  - Per-task images and `analysis_report.json`
  - A unified `results_index.json` at the output root for easy front-end integration

## Repository layout
```
XAI/
  main.py                  # Task dispatcher and unified results index
  ecg_utils.py             # Data loading (WFDB/DICOM) and ECG grid plotting
  clinical_reports.py      # Short clinical text summaries
  explanation_*.py         # Visualization modules (AF/ST/SB/LBBB/RBBB/AVB/NR)
  result_io.py             # External JSON normalization and results index builder
  data/
    ecg_files/             # Default local folder for WFDB/DICOM files
    ecg_analysis_results/   # Default output directory
  tests/                   # Pytest unit and end-to-end tests
  config.json              # Example configuration
```

## Setup (Windows PowerShell)
```powershell
cd "XAI"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r ..\requirements.txt
```
`pydicom` is required for DICOM reading; `pytest` is used for tests.

## Data placement
- Put local WFDB/DICOM files in `XAI/data/ecg_files/` (recommended):
  - WFDB: paired `{record}.hea` and `{record}.dat}`
  - DICOM: `*.dcm`
- You can also use absolute paths or set a custom `db_dir` in the config.
- Important: WFDB loading is strict-local. Records are read only if `{record}.hea/.dat` exist locally. No network fallback.

## Configuration
Add tasks to `config.json` (either WFDB or DICOM per task).

- WFDB example (defaults to `data/ecg_files` if `db_dir` omitted):
```json
{
  "abnormality": "LBBB",
  "record_name": "03016_hr",
  "lead_index": 1,
  "db_dir": "data/ecg_files"
}
```

- DICOM example (file path and lead name/index):
```json
{
  "abnormality": "AF",
  "filepath": "00001_lr.dcm",
  "lead_index": "II"
}
```

- Normal ECG (NR):
```json
{
  "abnormality": "NR",
  "filepath": "00001_lr.dcm",
  "lead_index": "II"
}
```

- Sinus Bradycardia (SB):
```json
{
  "abnormality": "SB",
  "filepath": "00001_lr.dcm",
  "lead_index": "II"
}
```

RBBB requires multiple leads (at least V1/V2; V6/I recommended). If missing, the module will warn and skip full assessment.

## Run
```powershell
python main.py config.json
```
Outputs are written to `XAI/data/ecg_analysis_results/…`, plus a root `results_index.json`.

Note on paths:
- If you leave `output_dir` unset in config, the default `XAI/data/ecg_analysis_results` is used.
- If you set `output_dir` to an absolute path, it will be used as-is.
- If you set `output_dir` to a relative path, it is resolved relative to your current working directory. To avoid ambiguity, prefer leaving it unset or use an absolute path.

## Outputs
- Per-task folder contains:
  - Images (e.g., `afib_ecg_with_rpeaks.png`, `lbbb_qrs_analysis.png`, `sinus_bradycardia_analysis.png`)
  - `analysis_report.json` with fields: `title`, `lead_name`, `report_text`, `metrics`, `image_paths`
- Root: `XAI/data/ecg_analysis_results/results_index.json` aggregates all tasks for the front-end

## Front-end consumption
- Serve `XAI/data/ecg_analysis_results/` as static files (Nginx, any static server, or `python -m http.server`)
- Load `results_index.json` and iterate `image_paths` to render images; show `report_text` and `metrics`
- Suggested fields: `title`, `lead_name`, `report_text`, `metrics`, `image_paths`, `task_id`, `report_path`

## Using external project JSON
- Normalize a single JSON:
```python
from result_io import load_external_result
item = load_external_result("/path/to/other_project_result.json")
```
- Build a unified index from your output root:
```python
from result_io import write_results_index
write_results_index("ecg_analysis_results")
```

## Module notes (key points)
- `ecg_utils.plot_ecg_with_grid`: consistent ECG paper-like grid (color or B/W)
- DICOM:
  - De-multiplex to (num_samples, num_channels)
  - Scaling: ChannelSensitivity × ChannelSensitivityCorrectionFactor (+ Baseline), convert uV → mV
  - Lead naming: prefer `ChannelSourceSequence.CodeMeaning`, fallback to standard 12-lead names
- WFDB:
  - Strict local: record is read only if `{db_dir}/{record}.hea/.dat` exist (or in `ECG_File/`)

## Visualization summary
- AF: R-peaks, RR histogram, P-wave inference regions (yellow)
- ST: Top ECG + HR timeline + RR histogram with tachy region (<0.6 s)
- SB: Top ECG + HR timeline + RR histogram with brady region (>1.0 s) and status badge
- LBBB: refined QRS spans with legend; histogram with thresholds
- RBBB: multi-lead plots with rsR′/deep S checks; QRS histogram bands
- 1dAVB: PR shading and histogram with 0.20 s threshold
- NR: normal overview and RR histogram

## Testing
- Run all tests:
```powershell
pytest -q
```
- End-to-end (uses repo DICOM samples; writes to a temp output directory):
```powershell
pytest -q tests/test_e2e_generation.py
```

## Troubleshooting
- WFDB not found: verify paired files in `ECG_File/` or `db_dir`
- RBBB missing leads: record must contain V1/V2; V6/I is recommended
- DICOM missing waveform: waveform sequence not present
- Legends hidden: delete old images and re-run (legends use white semi-opaque background)

## Extending & integrating
- Orthanc: add a `load_orthanc_ecg` loader in `ecg_utils.py` to fetch waveform and reuse the pipeline
- REST API: wrap with FastAPI to expose `/results` and serve `ecg_analysis_results/`

## License
Add your project license (e.g., MIT/Apache-2.0).
