# ECG Explainable AI Analysis Module

## Overview

This module provides an explainable artificial intelligence (XAI) system for analyzing electrocardiogram (ECG) signals. The system focuses on detecting and visualizing various cardiac abnormalities including Atrial Fibrillation (AFIB), 1st Degree AV Block, Right Bundle Branch Block (RBBB), Left Bundle Branch Block (LBBB), and other arrhythmias.

## Features

- **Comprehensive Arrhythmia Detection**: Analyzes various cardiac conditions including:
  - Atrial Fibrillation (AFIB)
  - 1st Degree AV Block (1dAVb)
  - Right Bundle Branch Block (RBBB)
  - Left Bundle Branch Block (LBBB)
  - Sinus Tachycardia/Bradycardia
- **Interactive Visualization**: Generates ECG plots with medical-grade grid overlay
- **Clinical Insights**: Provides detailed observations and measurements for each condition
- **Automated Analysis**: Uses NeuroKit2 for signal processing and feature extraction

## Installation

### Prerequisites

- Python 3.8 or higher
- Jupyter Notebook or Jupyter Lab

### Required Libraries

Install the following Python packages:

```bash
pip install wfdb
pip install neurokit2
pip install matplotlib
pip install numpy
pip install pandas
pip install scipy
```

For Jupyter notebook environment:
```bash
pip install jupyter
```


## Usage

### 1. Running the Jupyter Notebook

The main analysis functionality is contained in the Jupyter notebook:

```bash
# Navigate to project directory
cd /path/to/your/project

# Start Jupyter
jupyter notebook XAI/XAI.ipynb
```



### 2. Supported Abnormalities

| Code | Condition | Description |
|------|-----------|-------------|
| `AFIB` | Atrial Fibrillation | Irregular heart rhythm analysis |
| `1dAVb` | 1st Degree AV Block | PR interval prolongation analysis |
| `RBBB` | Right Bundle Branch Block | Multi-lead QRS morphology analysis |
| `LBBB` | Left Bundle Branch Block | Multi-lead QRS morphology analysis |
| `ST` | Sinus Tachycardia | Heart rate analysis |

## Data Format

### WFDB Format
- **Header file (.hea)**: Contains metadata about the recording
- **Data file (.dat)**: Contains the actual ECG signal data
- Sample files are included in the `XAI/` directory

### DICOM Format
- Standard medical imaging format with ECG waveform data
- Supported for single and multi-lead recordings

## Output

The system generates:

1. **ECG Visualizations**: High-quality plots with medical-grade grid overlay
2. **Statistical Analysis**: RR interval histograms, PR interval measurements
3. **Clinical Observations**: Detailed textual descriptions of findings


## Acknowledgments

- Built using NeuroKit2 for ECG signal processing
- WFDB library for handling PhysioNet data formats
- Sample ECG data for testing and demonstration purposes 
