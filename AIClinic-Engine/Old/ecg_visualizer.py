#!/usr/bin/env python3
"""
ECG Visualization Script
重构自Jupyter notebook，支持通过JSON配置控制可视化
"""

import json
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

import wfdb
import numpy as np
import matplotlib.pyplot as plt
import neurokit2 as nk
import pandas as pd
from matplotlib.ticker import AutoMinorLocator, FuncFormatter
from scipy.signal import find_peaks

# 设置matplotlib后端为Agg（无头模式）
plt.switch_backend('Agg')

class ECGVisualizer:
    """ECG可视化主类"""
    
    def __init__(self, output_dir: str = "visual_outputs"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # 支持的心律失常类型
        self.supported_rhythms = {
            'AF': self.visualize_afib,
            'ST': self.visualize_sinus_tachycardia,
            'LBBB': self.visualize_lbbb,
            'RBBB': self.visualize_rbbb,
            '1DAVB': self.visualize_1davb
        }
        
        # 默认文件映射
        self.default_files = {
            'AF': '16731_hr',
            'ST': '04408_hr', 
            'LBBB': '03016_hr',
            'RBBB': '03041_hr',
            '1DAVB': '01484_hr'
        }
    
    def plot_ecg_with_grid(self, time, signal, title, ax, sampling_rate, show_grid=True, style='color'):
        """绘制带网格的ECG信号"""
        if (style == 'bw'):
            color_major = (0.4, 0.4, 0.4)
            color_minor = (0.75, 0.75, 0.75)
            color_line  = (0, 0, 0)
        else:
            color_major = (1, 0, 0)
            color_minor = (1, 0.7, 0.7)
            color_line  = (0, 0, 0.7)

        ax.plot(time, signal, color=color_line, linewidth=1.0)
        ax.set_title(title, fontsize=14)
        ax.set_xlabel('Time (s)', fontsize=12)
        ax.set_ylabel('Amplitude (mV)', fontsize=12)

        if(show_grid):
            dt = 1.0 / sampling_rate
            x_min_data, x_max_data = np.min(time), np.max(time)
            y_min_data, y_max_data = np.min(signal), np.max(signal)

            y_padding = 0.5
            ax.set_xlim(x_min_data, x_max_data)
            ax.set_ylim(y_min_data - y_padding, y_max_data + y_padding)

            x_min_plot, x_max_plot = ax.get_xlim()
            y_min_plot, y_max_plot = ax.get_ylim()

            major_xticks = np.arange(np.floor(x_min_plot / 0.2) * 0.2, np.ceil(x_max_plot / 0.2) * 0.2 + 0.01, 0.2)
            major_yticks = np.arange(np.floor(y_min_plot / 0.5) * 0.5, np.ceil(y_max_plot / 0.5) * 0.5 + 0.01, 0.5)

            ax.set_xticks(major_xticks)
            ax.set_yticks(major_yticks)

            minor_xticks = np.arange(np.floor(x_min_plot / 0.04) * 0.04, np.ceil(x_max_plot / 0.04) * 0.04 + 0.01, 0.04)
            minor_yticks = np.arange(np.floor(y_min_plot / 0.1) * 0.1, np.ceil(y_max_plot / 0.1) * 0.1 + 0.01, 0.1)

            ax.set_xticks(minor_xticks, minor=True)
            ax.set_yticks(minor_yticks, minor=True)

            ax.grid(which='major', linestyle='-', linewidth=0.5 * 1, color=color_major, alpha=0.7)
            ax.grid(which='minor', linestyle='-', linewidth=0.25 * 1, color=color_minor, alpha=0.5)

        ax.tick_params(axis='both', which='major', labelsize=10)

    def load_wfdb_signal(self, filename, lead_index, db_dir=None):
        """加载WFDB信号"""
        try:
            record = wfdb.rdrecord(filename, pn_dir=db_dir)
            ecg_signal = record.p_signal[:, lead_index]
            sampling_rate = record.fs
            sig_name = record.sig_name[lead_index]
            if record.units[lead_index].lower() == 'uv':
                ecg_signal = ecg_signal / 1000.0
                print(f"Signal for {sig_name} converted from uV to mV.")
            elif record.units[lead_index].lower() != 'mv':
                print(f"Warning: Signal unit for {sig_name} is {record.units[lead_index]}, not mV.")
            print(f"Loaded {filename}, Lead: {sig_name}, Sampling Rate: {sampling_rate} Hz, Length: {len(ecg_signal)} samples")
            return ecg_signal, sampling_rate, sig_name
        except Exception as e:
            print(f"Error loading WFDB record {filename} (pn_dir='{db_dir}'): {e}")
            return None, None, None

    def _waves_get(self, waves, key_name):
        """获取波形数据"""
        if waves is None:
            return []
        key_name_l = key_name.lower()
        for k, v in waves.items():
            if k.lower() == key_name_l:
                return v
        return []

    def visualize_afib(self, config: Dict[str, Any]) -> List[str]:
        """心房颤动可视化"""
        filename = config.get('filename', self.default_files['AF'])
        lead_index = config.get('lead_index', 1)
        db_dir = config.get('db_dir', None)
        
        print(f"--- Processing AFIB: {filename} ---")
        ecg_signal, sampling_rate, lead_name = self.load_wfdb_signal(filename, lead_index, db_dir)
        
        if ecg_signal is None or sampling_rate is None:
            print(f"Could not load data for AFIB: {filename}")
            return []
        
        saved_files = []
        time_axis = np.linspace(0, len(ecg_signal) / sampling_rate, len(ecg_signal), endpoint=False)
        
        # R-peak检测
        try:
            _, r_peaks = nk.ecg_peaks(ecg_signal, sampling_rate=sampling_rate)
            r_peak_indices = r_peaks['ECG_R_Peaks']
        except Exception as e:
            print(f"R-peak detection failed: {e}")
            return []
        
        if len(r_peak_indices) < 2:
            print(f"Not enough R-peaks found")
            return []
        
        # 主ECG图
        fig_ecg, ax_ecg = plt.subplots(figsize=(15, 6))
        self.plot_ecg_with_grid(time_axis, ecg_signal, f'ECG {lead_name} - Atrial Fibrillation ({filename})', ax_ecg, sampling_rate)
        ax_ecg.scatter(time_axis[r_peak_indices], ecg_signal[r_peak_indices], color='blue', marker='o', s=30, label='R-wave Peaks', zorder=5)
        ax_ecg.legend()
        
        # 保存主图
        main_plot_path = self.output_dir / f"AF_main_{filename}.png"
        plt.savefig(main_plot_path, dpi=300, bbox_inches='tight')
        plt.close(fig_ecg)
        saved_files.append(str(main_plot_path))
        
        # RR间隔直方图
        rr_intervals_sec = np.diff(r_peak_indices) / sampling_rate
        fig_hist, ax_hist = plt.subplots(figsize=(8, 6))
        if len(rr_intervals_sec) > 0:
            ax_hist.hist(rr_intervals_sec, bins='auto', edgecolor='black', alpha=0.7)
            ax_hist.set_title(f'RR Interval Histogram - Atrial Fibrillation ({filename})')
            ax_hist.set_xlabel('RR Interval (s)')
            ax_hist.set_ylabel('Frequency')
            ax_hist.grid(axis='y', alpha=0.75)
            print(f"RR Stats: Min={np.min(rr_intervals_sec):.3f}, Max={np.max(rr_intervals_sec):.3f}, Mean={np.mean(rr_intervals_sec):.3f}, StdDev={np.std(rr_intervals_sec):.3f}")
        else:
            ax_hist.text(0.5, 0.5, "No RR intervals.", horizontalalignment='center')
            ax_hist.set_title(f'RR Interval Histogram - Atrial Fibrillation ({filename})')
        
        # 保存直方图
        hist_plot_path = self.output_dir / f"AF_histogram_{filename}.png"
        plt.savefig(hist_plot_path, dpi=300, bbox_inches='tight')
        plt.close(fig_hist)
        saved_files.append(str(hist_plot_path))
        
        # P波区域可视化
        fig_pwave, ax_pwave = plt.subplots(figsize=(15, 6))
        self.plot_ecg_with_grid(time_axis, ecg_signal, f'ECG {lead_name} with Inferred P-wave Regions - Atrial Fibrillation ({filename})', ax_pwave, sampling_rate)
        ax_pwave.scatter(time_axis[r_peak_indices], ecg_signal[r_peak_indices], color='blue', marker='o', s=30, label='R-wave Peaks', zorder=5)
        
        # 标记P波区域
        p_wave_typical_duration_sec = 0.10
        highlighted_p_region = False
        for r_peak_idx in r_peak_indices:
            qrs_onset_for_p_search = r_peak_idx - int(0.04 * sampling_rate)
            p_box_end_idx = qrs_onset_for_p_search
            p_box_start_idx = max(0, p_box_end_idx - int(p_wave_typical_duration_sec * sampling_rate))
            if p_box_start_idx < p_box_end_idx and p_box_end_idx < len(ecg_signal):
                label = 'Inferred P-wave Region' if not highlighted_p_region else ""
                ax_pwave.axvspan(time_axis[p_box_start_idx], time_axis[p_box_end_idx], color='yellow', alpha=0.3, label=label)
                highlighted_p_region = True
        
        if highlighted_p_region:
            ax_pwave.legend(loc='upper right')
        
        # 保存P波图
        pwave_plot_path = self.output_dir / f"AF_pwave_{filename}.png"
        plt.savefig(pwave_plot_path, dpi=300, bbox_inches='tight')
        plt.close(fig_pwave)
        saved_files.append(str(pwave_plot_path))
        
        print(f"AF visualization completed. Saved {len(saved_files)} files.")
        return saved_files

    def visualize_sinus_tachycardia(self, config: Dict[str, Any]) -> List[str]:
        """窦性心动过速可视化"""
        filename = config.get('filename', self.default_files['ST'])
        lead_index = config.get('lead_index', 1)
        db_dir = config.get('db_dir', None)
        
        print(f"--- Processing Sinus Tachycardia: {filename} ---")
        ecg_signal, sampling_rate, lead_name = self.load_wfdb_signal(filename, lead_index, db_dir)
        
        if ecg_signal is None or sampling_rate is None:
            print(f"Could not load data for Sinus Tachycardia: {filename}")
            return []
        
        saved_files = []
        
        # 信号清理
        try:
            ecg_cleaned = nk.ecg_clean(ecg_signal, sampling_rate=sampling_rate, method="neurokit")
            print(f"Signal cleaned.")
        except Exception as clean_e:
            print(f"Warning: Could not clean ECG: {clean_e}. Using raw.")
            ecg_cleaned = ecg_signal
        
        time_axis = np.linspace(0, len(ecg_cleaned) / sampling_rate, len(ecg_cleaned), endpoint=False)
        
        # R-peak检测
        try:
            _, rpeaks = nk.ecg_peaks(ecg_cleaned, sampling_rate=sampling_rate)
            r_peak_indices = rpeaks['ECG_R_Peaks']
        except Exception as e:
            print(f"R-peak detection failed: {e}")
            return []
        
        if len(r_peak_indices) < 2:
            print(f"Not enough R-peaks for RR analysis")
            return []
        
        rr_intervals_sec = np.diff(r_peak_indices) / sampling_rate
        avg_hr = 60.0 / np.mean(rr_intervals_sec) if len(rr_intervals_sec) > 0 else float('nan')
        
        # 主图
        fig, axes = plt.subplots(2, 1, figsize=(15, 10), gridspec_kw={'height_ratios': [3, 1]})
        self.plot_ecg_with_grid(time_axis, ecg_cleaned, f'Sinus Tachycardia ({filename}) ({lead_name}) - Avg HR ≈ {avg_hr:.0f} bpm', axes[0], sampling_rate)
        axes[0].scatter(time_axis[r_peak_indices], ecg_cleaned[r_peak_indices], c='b', marker='o', s=30, label='R-peaks', zorder=5)
        
        # 标记RR间隔
        for i in range(min(len(r_peak_indices) - 1, 5)):
            start_idx, end_idx = r_peak_indices[i], r_peak_indices[i+1]
            axes[0].axvspan(time_axis[start_idx], time_axis[end_idx], alpha=0.3, color='lightgreen', ymin=0.45, ymax=0.55)
            if i < 3:
                axes[0].text(time_axis[(start_idx + end_idx) // 2], np.median(ecg_cleaned), 
                            f'RR: {rr_intervals_sec[i]:.2f}s', ha='center', c='k', fontsize=9, 
                            bbox=dict(fc='w', alpha=0.7, pad=1))
        axes[0].legend(loc='upper right')
        
        # RR间隔直方图
        if len(rr_intervals_sec) > 0:
            axes[1].hist(rr_intervals_sec, bins='auto', ec='k', alpha=0.7, color='teal')
            mean_rr = np.mean(rr_intervals_sec)
            axes[1].axvline(mean_rr, c='r', ls='--', lw=2, label=f'Mean RR: {mean_rr:.3f}s (Avg HR: {60/mean_rr:.1f} bpm)')
            axes[1].axvspan(0, 0.6, color='lightpink', alpha=0.3, label='Tachycardia (RR < 0.6s / HR > 100)')
            axes[1].set_title('RR Interval Distribution')
            axes[1].set_xlabel('RR Interval (s)')
            axes[1].set_ylabel('Frequency')
            axes[1].legend()
            axes[1].grid(axis='y', alpha=0.75)
        else:
            axes[1].text(0.5, 0.5, "No RR intervals.", ha='center')
            axes[1].set_title('RR Interval Distribution')
        
        plt.tight_layout()
        
        # 保存图片
        main_plot_path = self.output_dir / f"ST_main_{filename}.png"
        plt.savefig(main_plot_path, dpi=300, bbox_inches='tight')
        plt.close(fig)
        saved_files.append(str(main_plot_path))
        
        print(f"Sinus Tachycardia visualization completed. Saved {len(saved_files)} files.")
        print(f"Average HR: {avg_hr:.1f} bpm")
        return saved_files

    def visualize_lbbb(self, config: Dict[str, Any]) -> List[str]:
        """左束支传导阻滞可视化"""
        filename = config.get('filename', self.default_files['LBBB'])
        lead_index = config.get('lead_index', 1)
        db_dir = config.get('db_dir', None)
        
        print(f"--- Processing LBBB: {filename} ---")
        ecg_signal, sampling_rate, lead_name = self.load_wfdb_signal(filename, lead_index, db_dir)
        
        if ecg_signal is None or sampling_rate is None:
            print(f"Could not load data for LBBB: {filename}")
            return []
        
        saved_files = []
        
        # 信号清理
        try:
            ecg_cleaned = nk.ecg_clean(ecg_signal, sampling_rate=sampling_rate, method="neurokit")
            print(f"Signal cleaned using 'neurokit' method.")
        except Exception as clean_e:
            print(f"Warning: Could not clean ECG signal: {clean_e}. Using raw signal.")
            ecg_cleaned = ecg_signal
        
        time_axis_cleaned = np.linspace(0, len(ecg_cleaned) / sampling_rate, len(ecg_cleaned), endpoint=False)
        
        # R-peak检测
        try:
            _, rpeaks_detected_obj = nk.ecg_peaks(ecg_cleaned, sampling_rate=sampling_rate, method="neurokit")
            r_peak_indices_np = rpeaks_detected_obj['ECG_R_Peaks']
            print(f"R-peaks detected. Found {r_peak_indices_np.size} R-peaks.")
        except Exception as rpeak_e:
            print(f"R-peak detection failed: {rpeak_e}")
            return []
        
        if r_peak_indices_np.size == 0:
            print(f"No R-peaks detected. Cannot proceed.")
            return []
        
        # QRS持续时间计算（简化版本）
        qrs_durations_sec = []
        highlight_regions_qrs = []
        
        # 简化的QRS边界估计
        for r_idx in r_peak_indices_np:
            # 简单的对称估计
            default_qrs_ms = 150  # LBBB通常更宽
            half_qrs_samples = (int((default_qrs_ms / 1000.0) * sampling_rate)) // 2
            qrs_start_est = max(0, r_idx - half_qrs_samples)
            qrs_end_est = min(len(ecg_cleaned) - 1, r_idx + half_qrs_samples)
            
            actual_est_duration_samples = qrs_end_est - qrs_start_est
            if actual_est_duration_samples > 0:
                qrs_durations_sec.append(actual_est_duration_samples / sampling_rate)
                highlight_regions_qrs.append((qrs_start_est, qrs_end_est))
        
        # 绘图
        fig_main, axes_main = plt.subplots(2, 1, figsize=(15, 10), gridspec_kw={'height_ratios': [3, 1]})
        self.plot_ecg_with_grid(time_axis_cleaned, ecg_cleaned, f'Left Bundle Branch Block ({filename}) ({lead_name}) - QRS Duration Analysis', axes_main[0], sampling_rate)
        
        # 标记R-peaks和QRS区域
        if r_peak_indices_np.size > 0:
            axes_main[0].scatter(time_axis_cleaned[r_peak_indices_np], ecg_cleaned[r_peak_indices_np], c='r', marker='o', s=30, label='R-peaks', zorder=5)
        
        annotated_count = 0
        if highlight_regions_qrs:
            for q_on_idx, q_off_idx in highlight_regions_qrs:
                dur = (q_off_idx - q_on_idx) / sampling_rate
                color = 'purple' if dur > 0.12 else ('green' if dur >= 0.06 else 'lightgray')
                axes_main[0].axvspan(time_axis_cleaned[q_on_idx], time_axis_cleaned[q_off_idx], alpha=0.3, color=color, ymin=0.3, ymax=0.7)
                if annotated_count < 3 and dur > 0.12:
                    text_y_start_idx = max(0, q_on_idx)
                    text_y_end_idx = min(len(ecg_cleaned) - 1, q_off_idx)
                    if text_y_start_idx <= text_y_end_idx:
                        text_y_val = np.max(ecg_cleaned[text_y_start_idx : text_y_end_idx+1])
                        axes_main[0].text((time_axis_cleaned[q_on_idx] + time_axis_cleaned[q_off_idx])/2, 
                                         text_y_val + 0.1 * (np.max(ecg_cleaned) - np.min(ecg_cleaned)), 
                                         f'QRS: {dur:.3f}s', ha='center', c='k', fontsize=9, 
                                         bbox=dict(fc='w', alpha=0.7, pad=1))
                        annotated_count += 1
        axes_main[0].legend(loc='upper right')
        
        # QRS持续时间直方图
        if qrs_durations_sec:
            axes_main[1].hist(qrs_durations_sec, bins='auto', ec='k', alpha=0.7, color='lightcoral')
            mean_qrs = np.mean(qrs_durations_sec)
            axes_main[1].axvline(mean_qrs, c='r', ls='--', lw=2, label=f'Mean QRS: {mean_qrs:.3f}s')
            axes_main[1].axvspan(0.06, 0.11, color='g', alpha=0.2, label='Normal QRS (0.06-0.11s)')
            axes_main[1].axvline(0.12, c='purple', ls=':', lw=2, label='0.12s Threshold (Wide)')
            axes_main[1].set_title('QRS Duration Distribution')
            axes_main[1].set_xlabel('QRS Duration (s)')
            axes_main[1].set_ylabel('Frequency')
            axes_main[1].legend()
            axes_main[1].grid(axis='y', alpha=0.75)
        else:
            axes_main[1].text(0.5, 0.5, "No QRS durations calculated / to display.", ha='center')
            axes_main[1].set_title('QRS Duration Distribution')
        
        plt.tight_layout()
        
        # 保存图片
        main_plot_path = self.output_dir / f"LBBB_main_{filename}.png"
        plt.savefig(main_plot_path, dpi=300, bbox_inches='tight')
        plt.close(fig_main)
        saved_files.append(str(main_plot_path))
        
        print(f"LBBB visualization completed. Saved {len(saved_files)} files.")
        if qrs_durations_sec:
            num_wide = sum(1 for qrs_d in qrs_durations_sec if qrs_d > 0.12)
            print(f"QRS durations: Mean={np.mean(qrs_durations_sec):.3f}s, {num_wide} out of {len(qrs_durations_sec)} are > 0.12s.")
        
        return saved_files

    def visualize_rbbb(self, config: Dict[str, Any]) -> List[str]:
        """右束支传导阻滞可视化"""
        filename = config.get('filename', self.default_files['RBBB'])
        lead_index = config.get('lead_index', 1)
        db_dir = config.get('db_dir', None)
        
        print(f"--- Processing RBBB: {filename} ---")
        ecg_signal, sampling_rate, lead_name = self.load_wfdb_signal(filename, lead_index, db_dir)
        
        if ecg_signal is None or sampling_rate is None:
            print(f"Could not load data for RBBB: {filename}")
            return []
        
        saved_files = []
        
        # 信号清理
        try:
            ecg_cleaned = nk.ecg_clean(ecg_signal, sampling_rate=sampling_rate, method="neurokit")
            print(f"Signal cleaned using 'neurokit' method.")
        except Exception as clean_e:
            print(f"Warning: Could not clean ECG signal: {clean_e}. Using raw signal.")
            ecg_cleaned = ecg_signal
        
        time_axis_cleaned = np.linspace(0, len(ecg_cleaned) / sampling_rate, len(ecg_cleaned), endpoint=False)
        
        # R-peak检测
        try:
            _, rpeaks_detected_obj = nk.ecg_peaks(ecg_cleaned, sampling_rate=sampling_rate, method="neurokit")
            r_peak_indices_np = rpeaks_detected_obj['ECG_R_Peaks']
            print(f"R-peaks detected. Found {r_peak_indices_np.size} R-peaks.")
        except Exception as rpeak_e:
            print(f"R-peak detection failed: {rpeak_e}")
            return []
        
        if r_peak_indices_np.size == 0:
            print(f"No R-peaks detected. Cannot proceed.")
            return []
        
        # QRS持续时间计算
        qrs_durations_sec = []
        highlight_regions_qrs = []
        
        # 简化的QRS边界估计
        for r_idx in r_peak_indices_np:
            # 简单的对称估计
            default_qrs_ms = 130  # RBBB通常比LBBB稍窄
            half_qrs_samples = (int((default_qrs_ms / 1000.0) * sampling_rate)) // 2
            qrs_start_est = max(0, r_idx - half_qrs_samples)
            qrs_end_est = min(len(ecg_cleaned) - 1, r_idx + half_qrs_samples)
            
            actual_est_duration_samples = qrs_end_est - qrs_start_est
            if actual_est_duration_samples > 0:
                qrs_durations_sec.append(actual_est_duration_samples / sampling_rate)
                highlight_regions_qrs.append((qrs_start_est, qrs_end_est))
        
        # 绘图
        fig_main, axes_main = plt.subplots(2, 1, figsize=(15, 10), gridspec_kw={'height_ratios': [3, 1]})
        self.plot_ecg_with_grid(time_axis_cleaned, ecg_cleaned, f'Right Bundle Branch Block ({filename}) ({lead_name}) - QRS Duration Analysis', axes_main[0], sampling_rate)
        
        # 标记R-peaks和QRS区域
        if r_peak_indices_np.size > 0:
            axes_main[0].scatter(time_axis_cleaned[r_peak_indices_np], ecg_cleaned[r_peak_indices_np], c='r', marker='o', s=30, label='R-peaks', zorder=5)
        
        annotated_count = 0
        if highlight_regions_qrs:
            for q_on_idx, q_off_idx in highlight_regions_qrs:
                dur = (q_off_idx - q_on_idx) / sampling_rate
                color = 'purple' if dur > 0.12 else ('green' if dur >= 0.06 else 'lightgray')
                axes_main[0].axvspan(time_axis_cleaned[q_on_idx], time_axis_cleaned[q_off_idx], alpha=0.3, color=color, ymin=0.3, ymax=0.7)
                if annotated_count < 3 and dur > 0.12:
                    text_y_start_idx = max(0, q_on_idx)
                    text_y_end_idx = min(len(ecg_cleaned) - 1, q_off_idx)
                    if text_y_start_idx <= text_y_end_idx:
                        text_y_val = np.max(ecg_cleaned[text_y_start_idx : text_y_end_idx+1])
                        axes_main[0].text((time_axis_cleaned[q_on_idx] + time_axis_cleaned[q_off_idx])/2, 
                                         text_y_val + 0.1 * (np.max(ecg_cleaned) - np.min(ecg_cleaned)), 
                                         f'QRS: {dur:.3f}s', ha='center', c='k', fontsize=9, 
                                         bbox=dict(fc='w', alpha=0.7, pad=1))
                        annotated_count += 1
        axes_main[0].legend(loc='upper right')
        
        # QRS持续时间直方图
        if qrs_durations_sec:
            axes_main[1].hist(qrs_durations_sec, bins='auto', ec='k', alpha=0.7, color='lightcoral')
            mean_qrs = np.mean(qrs_durations_sec)
            axes_main[1].axvline(mean_qrs, c='r', ls='--', lw=2, label=f'Mean QRS: {mean_qrs:.3f}s')
            axes_main[1].axvspan(0.06, 0.11, color='g', alpha=0.2, label='Normal QRS (0.06-0.11s)')
            axes_main[1].axvline(0.12, c='purple', ls=':', lw=2, label='0.12s Threshold (Wide)')
            axes_main[1].set_title('QRS Duration Distribution')
            axes_main[1].set_xlabel('QRS Duration (s)')
            axes_main[1].set_ylabel('Frequency')
            axes_main[1].legend()
            axes_main[1].grid(axis='y', alpha=0.75)
        else:
            axes_main[1].text(0.5, 0.5, "No QRS durations calculated / to display.", ha='center')
            axes_main[1].set_title('QRS Duration Distribution')
        
        plt.tight_layout()
        
        # 保存图片
        main_plot_path = self.output_dir / f"RBBB_main_{filename}.png"
        plt.savefig(main_plot_path, dpi=300, bbox_inches='tight')
        plt.close(fig_main)
        saved_files.append(str(main_plot_path))
        
        print(f"RBBB visualization completed. Saved {len(saved_files)} files.")
        if qrs_durations_sec:
            num_wide = sum(1 for qrs_d in qrs_durations_sec if qrs_d > 0.12)
            print(f"QRS durations: Mean={np.mean(qrs_durations_sec):.3f}s, {num_wide} out of {len(qrs_durations_sec)} are > 0.12s.")
        
        return saved_files

    def visualize_1davb(self, config: Dict[str, Any]) -> List[str]:
        """一度房室传导阻滞可视化"""
        filename = config.get('filename', self.default_files['1DAVB'])
        lead_index = config.get('lead_index', 1)
        db_dir = config.get('db_dir', None)
        
        print(f"--- Processing 1st Degree AV Block: {filename} ---")
        ecg_signal, sampling_rate, lead_name = self.load_wfdb_signal(filename, lead_index, db_dir)
        
        if ecg_signal is None or sampling_rate is None:
            print(f"Could not load data for 1st Degree AV Block: {filename}")
            return []
        
        saved_files = []
        
        # 信号清理
        try:
            ecg_clean = nk.ecg_clean(ecg_signal, sampling_rate=sampling_rate, method="neurokit")
            print(f"Signal cleaned with NeuroKit.")
        except Exception as e:
            print(f"Cleaning failed ({e}) — using raw signal.")
            ecg_clean = ecg_signal
        
        # R-peak检测
        try:
            _, rdict = nk.ecg_peaks(ecg_clean, sampling_rate=sampling_rate, method="neurokit")
            r_idx = np.asarray(rdict["ECG_R_Peaks"], dtype=int)
            print(f"Detected {len(r_idx)} R-peaks.")
        except Exception as e:
            print(f"R-peak detection failed: {e}")
            return []
        
        if len(r_idx) < 2:
            print("Not enough R-peaks detected.")
            return []
        
        # 波形分割
        waves, used_method = None, None
        for m in ["prominence", "dwt", "cwt", "peak"]:
            try:
                _, w = nk.ecg_delineate(ecg_clean, rpeaks=r_idx, sampling_rate=sampling_rate, method=m)
                w = {k.lower(): v for k, v in w.items()}
                if (np.nansum(~np.isnan(self._waves_get(w, "ecg_p_onsets"))) > 0 and 
                    np.nansum(~np.isnan(self._waves_get(w, "ecg_r_onsets"))) > 0):
                    waves, used_method = w, m
                    print(f"✓ delineation success via '{m}'.")
                    break
            except Exception as e:
                print(f"× '{m}' failed ({e}).")
        
        if waves is None:
            print("All delineation methods failed — cannot compute PR.")
            return []
        
        # 提取PR间期
        p_on = np.asarray(self._waves_get(waves, "ecg_p_onsets"), dtype=float)
        r_on = np.asarray(self._waves_get(waves, "ecg_r_onsets"), dtype=float)
        p_on = p_on[~np.isnan(p_on)].astype(int)
        r_on = r_on[~np.isnan(r_on)].astype(int)
        
        pr_intervals, highlight = [], []
        r_ptr = 0
        for p in p_on:
            while r_ptr < len(r_on) and r_on[r_ptr] <= p:
                r_ptr += 1
            if r_ptr >= len(r_on):
                break
            r = r_on[r_ptr]
            pr = (r - p) / sampling_rate
            if 0.05 < pr < 0.6:  # 有效范围
                pr_intervals.append(pr)
                highlight.append((p, r))
        
        if len(pr_intervals) == 0:
            print("Delineation ok but no PR intervals within 0.05–0.6 s.")
            return []
        
        pr_intervals = np.array(pr_intervals)
        
        # 绘图
        t = np.linspace(0, len(ecg_clean) / sampling_rate, len(ecg_clean), endpoint=False)
        
        # 主图
        fig, ax = plt.subplots(figsize=(15, 6))
        self.plot_ecg_with_grid(t, ecg_clean, f"1st Degree AV Block ({filename}) ({lead_name}) – PR intervals", ax, sampling_rate, show_grid=True, style="color")
        ax.scatter(t[r_idx], ecg_clean[r_idx], c="red", s=40, label="R-peaks", zorder=5)
        
        for (p, r) in highlight:
            ax.axvspan(t[p], t[r], alpha=0.3, 
                      color=("orange" if (r - p)/sampling_rate > 0.20 else "green"), zorder=4)
        ax.legend(loc="upper right")
        
        # 保存主图
        main_plot_path = self.output_dir / f"1DAVB_main_{filename}.png"
        plt.savefig(main_plot_path, dpi=300, bbox_inches='tight')
        plt.close(fig)
        saved_files.append(str(main_plot_path))
        
        # PR直方图
        fig_hist, ax_hist = plt.subplots(figsize=(5, 3.5))
        ax_hist.hist(pr_intervals, bins="auto", edgecolor="k", alpha=0.7)
        ax_hist.axvline(0.20, color="orange", ls="--", lw=2, label="0.20 s")
        ax_hist.grid(axis="y", alpha=0.5)
        ax_hist.set_xlabel("PR interval (s)")
        ax_hist.set_ylabel("Count")
        ax_hist.set_title("PR interval distribution")
        ax_hist.legend()
        plt.tight_layout()
        
        # 保存直方图
        hist_plot_path = self.output_dir / f"1DAVB_histogram_{filename}.png"
        plt.savefig(hist_plot_path, dpi=300, bbox_inches='tight')
        plt.close(fig_hist)
        saved_files.append(str(hist_plot_path))
        
        print(f"1st Degree AV Block visualization completed. Saved {len(saved_files)} files.")
        print(f"Computed {len(pr_intervals)} PR intervals (mean {pr_intervals.mean():.3f} s). {np.sum(pr_intervals > 0.20)} longer than 0.20 s.")
        
        return saved_files

    def process_config(self, config: Dict[str, Any]) -> Dict[str, List[str]]:
        """处理配置文件并执行可视化"""
        results = {}
        
        # 获取要处理的心律失常类型
        rhythms = config.get('rhythms', [])
        if not rhythms:
            print("No rhythms specified in config. Using all supported rhythms.")
            rhythms = list(self.supported_rhythms.keys())
        
        # 处理每个心律失常类型
        for rhythm in rhythms:
            if rhythm not in self.supported_rhythms:
                print(f"Warning: Unsupported rhythm type '{rhythm}'. Skipping.")
                continue
            
            print(f"\n{'='*50}")
            print(f"Processing {rhythm} visualization...")
            print(f"{'='*50}")
            
            try:
                # 获取该心律失常的配置
                rhythm_config = config.get('configs', {}).get(rhythm, {})
                saved_files = self.supported_rhythms[rhythm](rhythm_config)
                results[rhythm] = saved_files
            except Exception as e:
                print(f"Error processing {rhythm}: {e}")
                results[rhythm] = []
        
        return results

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='ECG Visualization Script')
    parser.add_argument('--config', '-c', type=str, required=True, 
                       help='Path to JSON configuration file')
    parser.add_argument('--output-dir', '-o', type=str, default='visual_outputs',
                       help='Output directory for generated images')
    
    args = parser.parse_args()
    
    # 读取配置文件
    try:
        with open(args.config, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except Exception as e:
        print(f"Error reading config file: {e}")
        return
    
    # 创建可视化器并处理
    visualizer = ECGVisualizer(output_dir=args.output_dir)
    results = visualizer.process_config(config)
    
    # 输出结果摘要
    print(f"\n{'='*50}")
    print("VISUALIZATION SUMMARY")
    print(f"{'='*50}")
    
    total_files = 0
    for rhythm, files in results.items():
        print(f"{rhythm}: {len(files)} files generated")
        total_files += len(files)
        for file_path in files:
            print(f"  - {file_path}")
    
    print(f"\nTotal files generated: {total_files}")
    print(f"Output directory: {args.output_dir}")

if __name__ == "__main__":
    main() 