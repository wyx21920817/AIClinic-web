
# ecg_utils.py 

import os
import wfdb
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.ticker import AutoMinorLocator, FuncFormatter
import pydicom

# 默认数据目录：项目位于XAI/data/ecg_files（即 XAI/data/ecg_files）
# 本文件位于 XAI/xai/ecg_utils.py，因此取上一层目录
DEFAULT_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ecg_files")

def _resolve_path(path_like: str) -> str:
    """将相对路径解析到默认数据目录 XAI/ECG_File（若存在）。
    - 若 path_like 为绝对路径或已存在，原样返回
    - 否则尝试在 DEFAULT_DATA_DIR 下拼接
    """
    if not path_like:
        return path_like
    if os.path.isabs(path_like) or os.path.exists(path_like):
        return path_like
    candidate = os.path.join(DEFAULT_DATA_DIR, path_like)
    return candidate if os.path.exists(candidate) else path_like

def plot_ecg_with_grid(time, signal, title, ax, sampling_rate, show_grid=True, style='color'):
    """绘制带心电图纸网格的ECG信号。"""
    if style == 'bw':
        color_major, color_minor, color_line = (0.4, 0.4, 0.4), (0.75, 0.75, 0.75), (0, 0, 0)
    else:
        color_major, color_minor, color_line = (1, 0, 0), (1, 0.7, 0.7), (0, 0, 0.7)

    ax.plot(time, signal, color=color_line, linewidth=1.0)
    ax.set_title(title, fontsize=14); ax.set_xlabel('Time (s)', fontsize=12); ax.set_ylabel('Amplitude (mV)', fontsize=12)

    if show_grid and time is not None and signal is not None and len(time) > 0 and len(signal) > 0:
        x_min, x_max = np.min(time), np.max(time)
        y_min, y_max = np.min(signal), np.max(signal)
        ax.set_xlim(x_min, x_max); ax.set_ylim(y_min - 0.5, y_max + 0.5)
        x_min_plot, x_max_plot = ax.get_xlim(); y_min_plot, y_max_plot = ax.get_ylim()

        major_xticks = np.arange(np.floor(x_min_plot/0.2)*0.2, np.ceil(x_max_plot/0.2)*0.2+0.01, 0.2)
        major_yticks = np.arange(np.floor(y_min_plot/0.5)*0.5, np.ceil(y_max_plot/0.5)*0.5+0.01, 0.5)
        ax.set_xticks(major_xticks); ax.set_yticks(major_yticks)

        minor_xticks = np.arange(np.floor(x_min_plot/0.04)*0.04, np.ceil(x_max_plot/0.04)*0.04+0.01, 0.04)
        minor_yticks = np.arange(np.floor(y_min_plot/0.1)*0.1, np.ceil(y_max_plot/0.1)*0.1+0.01, 0.1)
        ax.set_xticks(minor_xticks, minor=True); ax.set_yticks(minor_yticks, minor=True)

        ax.grid(which='major', linestyle='-', linewidth=0.5, color=color_major, alpha=0.7)
        ax.grid(which='minor', linestyle='-', linewidth=0.25, color=color_minor, alpha=0.5)
    ax.tick_params(axis='both', which='major', labelsize=10)

def load_wfdb_signal(filename, lead_index, db_dir=None):
    """从本地WFDB记录中加载指定导联。"""
    try:
        # 首先解析 db_dir；若未提供，则默认到 ECG_File
        base_dir = db_dir or DEFAULT_DATA_DIR
        record_path = os.path.join(base_dir, filename) if base_dir else filename
        record_path = _resolve_path(record_path)
        # 严格本地：仅当本地存在 .hea/.dat 时才读取，避免任何网络访问
        hea_path = record_path + '.hea'
        dat_path = record_path + '.dat'
        if os.path.exists(hea_path) or os.path.exists(dat_path):
            record = wfdb.rdrecord(record_path)
        else:
            alt_path = filename
            if os.path.isabs(alt_path):
                alt_candidate = alt_path
            else:
                alt_candidate = _resolve_path(alt_path)
            if os.path.exists(alt_candidate + '.hea') or os.path.exists(alt_candidate + '.dat'):
                record = wfdb.rdrecord(alt_candidate)
            else:
                raise FileNotFoundError(f"WFDB files not found locally for '{filename}'. Tried: {hea_path}, {dat_path}")
        ecg_signal = record.p_signal[:, lead_index]
        sampling_rate = record.fs
        sig_name = record.sig_name[lead_index]
        if record.units[lead_index].lower() == 'uv':
            ecg_signal = ecg_signal / 1000.0
        print(f"Loaded WFDB {filename}, Lead: {sig_name}, Fs: {sampling_rate} Hz")
        return ecg_signal, sampling_rate, sig_name
    except Exception as e:
        print(f"Error loading WFDB record {filename} from path '{record_path}': {e}")
        return None, None, None


def load_wfdb_signals(filename, leads="all", db_dir=None, allow_missing=True):
    """从本地WFDB记录中加载多个指定导联。"""
    try:
        # 确保从本地路径加载
        base_dir = db_dir or DEFAULT_DATA_DIR
        record_path = os.path.join(base_dir, filename) if base_dir else filename
        record_path = _resolve_path(record_path)
        hea_path = record_path + '.hea'
        dat_path = record_path + '.dat'
        if os.path.exists(hea_path) or os.path.exists(dat_path):
            record = wfdb.rdrecord(record_path)
        else:
            alt_path = filename
            alt_candidate = _resolve_path(alt_path)
            if os.path.exists(alt_candidate + '.hea') or os.path.exists(alt_candidate + '.dat'):
                record = wfdb.rdrecord(alt_candidate)
            else:
                raise FileNotFoundError(f"WFDB files not found locally for '{filename}'. Tried: {hea_path}, {dat_path}")
        
        fs, names = record.fs, record.sig_name
        units = [u.lower() for u in record.units]
        
        leads_to_load = names if leads == "all" else ([leads] if not isinstance(leads, (list, tuple)) else leads)
        
        out = {}
        for lead_item in leads_to_load:
            idx = next((i for i, name in enumerate(names) if str(lead_item).lower() == name.lower()), None)
            if idx is not None:
                sig = record.p_signal[:, idx]
                if units[idx] == "uv":
                    sig = sig / 1000.0
                out[names[idx]] = (sig, fs)
            elif not allow_missing:
                raise ValueError(f"Lead '{lead_item}' not found in record.")
        return out
    except Exception as e:
        print(f"Error loading multi-lead WFDB record {filename}: {e}")
        return {}
        

def load_dicom_signal(filepath, lead_name_or_index):
    """从DICOM文件中加载指定导联的ECG信号，遵循 DICOM Waveform 的复用/量化规范。
    关键点：
    - 解复用: (num_samples, num_channels)
    - 数据类型: 依据 WaveformSampleInterpretation/BitsAllocated
    - 量化: ChannelSensitivity × ChannelSensitivityCorrectionFactor (+ ChannelBaseline)
    - 单位: 通常为 uV → 转换为 mV
    """
    try:
        ds = pydicom.dcmread(_resolve_path(filepath))
        if "WaveformSequence" not in ds or not ds.WaveformSequence:
            raise ValueError("DICOM does not contain WaveformSequence.")

        wf = ds.WaveformSequence[0]
        fs = float(wf.SamplingFrequency)
        num_channels = int(wf.NumberOfWaveformChannels)
        num_samples = int(wf.NumberOfWaveformSamples)
        channel_defs = wf.ChannelDefinitionSequence

        # 1) 解析导联名
        lead_names = []
        try:
            lead_names = [ch.ChannelSourceSequence[0].CodeMeaning for ch in channel_defs]
        except Exception:
            std = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]
            lead_names = std[:num_channels] if num_channels <= len(std) else [f"Lead {i+1}" for i in range(num_channels)]

        if not lead_names:
            raise ValueError("Unable to resolve lead names from DICOM.")

        # 2) 解析数据类型并解复用
        interp = getattr(wf, "WaveformSampleInterpretation", "SS").upper()
        bits = int(getattr(wf, "WaveformBitsAllocated", 16))
        little = getattr(ds, "is_little_endian", True)

        dtype_map = {
            ("SS", 16): np.int16,
            ("US", 16): np.uint16,
            ("SB", 8): np.int8,
            ("UB", 8): np.uint8,
            ("SL", 32): np.int32,
            ("UL", 32): np.uint32,
            ("FD", 64): np.float64,
            ("FL", 32): np.float32,
        }
        dtype = dtype_map.get((interp, bits), np.int16)
        dtype = np.dtype(dtype).newbyteorder('<' if little else '>')

        raw = np.frombuffer(wf.WaveformData, dtype=dtype)
        if raw.size != num_channels * num_samples:
            # 有些文件可能包含多个 frame，这里尝试按通道推断
            if raw.size % num_channels != 0:
                raise ValueError(f"WaveformData size mismatch: {raw.size} vs channels*samples {num_channels*num_samples}")
            num_samples = raw.size // num_channels
        data = raw.reshape(num_samples, num_channels)

        # 3) 匹配导联索引
        lead_idx = None
        if isinstance(lead_name_or_index, int):
            if 0 <= lead_name_or_index < num_channels:
                lead_idx = int(lead_name_or_index)
        else:
            search = str(lead_name_or_index).lower().replace("lead", "").strip()
            for i, nm in enumerate(lead_names):
                if search == nm.lower().replace("lead", "").strip():
                    lead_idx = i; break
        if lead_idx is None:
            raise ValueError(f"Lead '{lead_name_or_index}' not found. Available: {lead_names}")

        # 4) 量化与单位
        ch_def = channel_defs[lead_idx]
        sens = float(getattr(ch_def, "ChannelSensitivity", 1.0))
        corr = float(getattr(ch_def, "ChannelSensitivityCorrectionFactor", 1.0))
        base = float(getattr(ch_def, "ChannelBaseline", 0.0))
        units = "uV"
        try:
            units = ch_def.ChannelSensitivityUnitsSequence[0].CodeValue
        except Exception:
            pass

        sig = data[:, lead_idx].astype(np.float64)
        sig_uv = (sig * sens * corr) + base
        # 常见单位 uV → mV
        if isinstance(units, str) and units.lower().find('uv') != -1:
            sig_mv = sig_uv / 1000.0
        else:
            # 如果单位未知，仍假设 uV 以避免过大数值
            sig_mv = sig_uv / 1000.0

        lead_name = lead_names[lead_idx]
        print(f"Loaded DICOM {os.path.basename(filepath)}, Lead: {lead_name}, Fs: {fs} Hz")
        return sig_mv, fs, lead_name
    except Exception as e:
        print(f"Error loading DICOM ECG from {filepath}: {e}")
        return None, None, None

def load_ecg_data(config_task):
    """根据配置加载WFDB或DICOM数据。"""
    record_name = config_task.get("record_name")
    filepath = config_task.get("filepath")
    lead_info = config_task.get("lead_index", 1)
    db_dir = config_task.get("db_dir") or DEFAULT_DATA_DIR

    if filepath and filepath.lower().endswith((".dcm", ".dicom")):
        return load_dicom_signal(_resolve_path(filepath), lead_info)
    elif record_name and record_name.lower().endswith((".dcm", ".dicom")):
        return load_dicom_signal(_resolve_path(record_name), lead_info)
    elif record_name:
        if isinstance(lead_info, list):
            return load_wfdb_signals(record_name, leads=lead_info, db_dir=db_dir)
        else:
            return load_wfdb_signal(record_name, lead_info, db_dir=db_dir)
    else:
        print("Task config requires 'filepath' (DICOM) or 'record_name' (WFDB).")
        return None, None, None