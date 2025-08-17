# ECG Visualization Script

这是一个重构自Jupyter notebook的ECG可视化脚本，支持通过JSON配置文件控制可视化过程。

## 功能特性

- 支持多种心律失常类型的可视化：
  - **AF**: 心房颤动 (Atrial Fibrillation)
  - **ST**: 窦性心动过速 (Sinus Tachycardia)
  - **LBBB**: 左束支传导阻滞 (Left Bundle Branch Block)
  - **RBBB**: 右束支传导阻滞 (Right Bundle Branch Block)
  - **1DAVB**: 一度房室传导阻滞 (1st Degree AV Block)

- 通过JSON配置文件灵活控制：
  - 选择要处理的心律失常类型
  - 指定数据文件和参数
  - 支持同时处理多种心律失常

- 自动保存高质量图片：
  - 主ECG信号图
  - 统计分析直方图
  - 适合Web展示的高分辨率图片

## 安装依赖

```bash
pip install wfdb neurokit2 matplotlib numpy pandas scipy
```

## 使用方法

### 1. 基本用法

```bash
python ecg_visualizer.py --config config_example.json --output-dir visual_outputs
```

### 2. 只处理特定心律失常

```bash
python ecg_visualizer.py --config config_af_st.json --output-dir visual_outputs
```

### 3. 自定义输出目录

```bash
python ecg_visualizer.py --config config_example.json --output-dir my_outputs
```

## 配置文件格式

### 完整配置示例 (config_example.json)

```json
{
  "rhythms": ["AF", "ST", "LBBB", "RBBB", "1DAVB"],
  "configs": {
    "AF": {
      "filename": "16731_hr",
      "lead_index": 1,
      "db_dir": null
    },
    "ST": {
      "filename": "04408_hr",
      "lead_index": 1,
      "db_dir": null
    },
    "LBBB": {
      "filename": "03016_hr",
      "lead_index": 1,
      "db_dir": null
    },
    "RBBB": {
      "filename": "03041_hr",
      "lead_index": 1,
      "db_dir": null
    },
    "1DAVB": {
      "filename": "01484_hr",
      "lead_index": 1,
      "db_dir": null
    }
  }
}
```

### 简化配置示例 (config_af_st.json)

```json
{
  "rhythms": ["AF", "ST"],
  "configs": {
    "AF": {
      "filename": "16731_hr",
      "lead_index": 1,
      "db_dir": null
    },
    "ST": {
      "filename": "04408_hr",
      "lead_index": 1,
      "db_dir": null
    }
  }
}
```

## 配置参数说明

### rhythms
- 类型: 字符串数组
- 说明: 指定要处理的心律失常类型
- 可选值: ["AF", "ST", "LBBB", "RBBB", "1DAVB"]
- 示例: `["AF", "ST"]` 只处理心房颤动和窦性心动过速

### configs
- 类型: 对象
- 说明: 每个心律失常类型的详细配置

### 每个心律失常的配置参数

#### filename
- 类型: 字符串
- 说明: WFDB格式的数据文件名（不包含扩展名）
- 示例: "16731_hr"

#### lead_index
- 类型: 整数
- 说明: 要分析的导联索引（从0开始）
- 默认值: 1 (通常是Lead II)

#### db_dir
- 类型: 字符串或null
- 说明: 数据库目录路径，null表示本地文件
- 示例: null (本地文件) 或 "mitdb" (PhysioNet数据库)

## 输出文件

脚本会为每个心律失常类型生成以下文件：

### AF (心房颤动)
- `AF_main_16731_hr.png`: 主ECG信号图，显示R波峰值
- `AF_histogram_16731_hr.png`: RR间隔直方图
- `AF_pwave_16731_hr.png`: P波区域可视化

### ST (窦性心动过速)
- `ST_main_04408_hr.png`: 主ECG信号图，显示RR间隔和心率

### LBBB/RBBB (束支传导阻滞)
- `LBBB_main_03016_hr.png`: 主ECG信号图，显示QRS持续时间分析
- `RBBB_main_03041_hr.png`: 主ECG信号图，显示QRS持续时间分析

### 1DAVB (一度房室传导阻滞)
- `1DAVB_main_01484_hr.png`: 主ECG信号图，显示PR间期
- `1DAVB_histogram_01484_hr.png`: PR间期直方图

## 命令行参数

### --config, -c
- 必需参数
- 说明: JSON配置文件的路径
- 示例: `--config config_example.json`

### --output-dir, -o
- 可选参数
- 默认值: "visual_outputs"
- 说明: 输出图片的目录
- 示例: `--output-dir my_outputs`

## 使用示例

### 示例1: 处理所有支持的心律失常
```bash
python ecg_visualizer.py --config config_example.json
```

### 示例2: 只处理AF和ST
```bash
python ecg_visualizer.py --config config_af_st.json
```

### 示例3: 自定义输出目录
```bash
python ecg_visualizer.py --config config_example.json --output-dir web_images
```

## 注意事项

1. **数据文件**: 确保WFDB格式的数据文件在正确的路径下
2. **依赖库**: 确保所有必需的Python库已正确安装
3. **输出目录**: 脚本会自动创建输出目录（如果不存在）
4. **图片格式**: 所有图片以PNG格式保存，分辨率为300 DPI
5. **无头模式**: 脚本使用matplotlib的Agg后端，无需图形界面

## 错误处理

- 如果数据文件无法加载，脚本会跳过该心律失常类型并继续处理其他类型
- 如果R波检测失败，会生成错误提示并跳过该分析
- 所有错误信息都会在控制台输出，便于调试

## 扩展性

脚本设计为模块化结构，可以轻松添加新的心律失常类型：

1. 在`ECGVisualizer`类中添加新的可视化方法
2. 在`supported_rhythms`字典中注册新方法
3. 在`default_files`字典中添加默认文件名
4. 更新配置文件格式说明

## 技术支持

如有问题或建议，请检查：
1. 数据文件路径是否正确
2. 配置文件格式是否符合要求
3. 所有依赖库是否正确安装
4. 输出目录是否有写入权限 