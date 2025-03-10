import dicomParser from 'dicom-parser';
import { WAVE_FORM_BITS_STORED } from '../constants/Constants';

class ReadECG {
  constructor(arrayBuffer, type = '', options = {}) {
    this.arrayBuffer = arrayBuffer;
    this.type = type;
    this.options = {
      speed: options.speed || 25,
      amplitude: options.amplitude || 10,
      applyLowPassFilter: options.applyLowPassFilter !== undefined ? options.applyLowPassFilter : true
    };
    this.elements = {};
    this.parseData();
  }

  parseData() {
    try {
      console.log('========== Starting ECG Data Parsing ==========');
      const byteArray = new Uint8Array(this.arrayBuffer);
      console.log('File size:', byteArray.length, 'bytes');
      
      const dataSet = dicomParser.parseDicom(byteArray);
      
      // 检查关键标签
      const criticalTags = {
        'TransferSyntaxUID': 'x00020010',
        'SOPClassUID': 'x00080016',
        'Modality': 'x00080060',
        'WaveformSequence': 'x54000100'
      };

      // 分析标签
      const tagAnalysis = {};
      for (const [name, tag] of Object.entries(criticalTags)) {
        const element = dataSet.elements[tag];
        if (element) {
          tagAnalysis[name] = {
            present: true,
            vr: element.vr,
            length: element.length,
            value: dataSet.string(tag),
            dataOffset: element.dataOffset
          };
        } else {
          tagAnalysis[name] = { present: false };
        }
      }
      console.log('Tag Analysis:', tagAnalysis);

      // 保存关键参数
      this.elements = {
        TransferSyntaxUID: dataSet.string('x00020010'),
        SOPClassUID: dataSet.string('x00080016'),
        Modality: dataSet.string('x00080060'),
        WaveformSequence: dataSet.elements['x54000100']
      };

      // 分析波形序列
      if (this.elements.WaveformSequence) {
        const sequenceInfo = {
          length: this.elements.WaveformSequence.length,
          vr: this.elements.WaveformSequence.vr,
          dataOffset: this.elements.WaveformSequence.dataOffset,
          items: this.elements.WaveformSequence.items ? this.elements.WaveformSequence.items.length : 0
        };
        console.log('WaveformSequence Info:', sequenceInfo);

        if (this.elements.WaveformSequence.items) {
          // 遍历所有序列项
          for (let i = 0; i < this.elements.WaveformSequence.items.length; i++) {
            const item = this.elements.WaveformSequence.items[i];
            console.log(`Analyzing Item ${i}:`, {
              length: item.length,
              dataOffset: item.dataOffset,
              elements: Object.keys(item.elements || {})
            });

            // 直接从项的字节范围中解析数据集
            try {
              const itemData = byteArray.slice(item.dataOffset, item.dataOffset + item.length);
              console.log(`Item ${i} data sample:`, Array.from(itemData.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));

              // 检查是否为显式VR
              const isExplicitVR = this.elements.TransferSyntaxUID && 
                                 this.elements.TransferSyntaxUID.includes('1.2.840.10008.1.2.1');
              console.log('Transfer Syntax:', this.elements.TransferSyntaxUID);
              console.log('Using Explicit VR:', isExplicitVR);

              // 解析项中的所有标签
              let offset = 0;
              while (offset < itemData.length - 8) { // 至少需要8字节
                // 读取组号和元素号
                const group = itemData[offset] + (itemData[offset + 1] << 8);
                const element = itemData[offset + 2] + (itemData[offset + 3] << 8);
                const tag = `(${group.toString(16).padStart(4, '0')},${element.toString(16).padStart(4, '0')})`;

                let valueLength;
                let dataStart;
                let vr = '';

                if (isExplicitVR) {
                  // 显式VR格式
                  vr = String.fromCharCode(itemData[offset + 4], itemData[offset + 5]);
                  
                  if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
                    // 这些VR使用32位长度字段，需要2字节填充
                    valueLength = itemData[offset + 8] + 
                                (itemData[offset + 9] << 8) +
                                (itemData[offset + 10] << 16) +
                                (itemData[offset + 11] << 24);
                    dataStart = offset + 12;
                  } else {
                    // 其他VR使用16位长度字段
                    valueLength = itemData[offset + 6] + (itemData[offset + 7] << 8);
                    dataStart = offset + 8;
                  }
                } else {
                  // 隐式VR格式
                  valueLength = itemData[offset + 4] + 
                              (itemData[offset + 5] << 8) +
                              (itemData[offset + 6] << 16) +
                              (itemData[offset + 7] << 24);
                  dataStart = offset + 8;
                  
                  // 根据标签推断VR
                  if (group === 0x5400 && element === 0x1010) {
                    vr = 'OW';
                  }
                }

                // 验证长度是否合理
                if (valueLength > itemData.length - dataStart) {
                  console.log(`Invalid length ${valueLength} for tag ${tag} (VR: ${vr}) at offset ${offset}, skipping to next item`);
                  break;
                }

                const vrInfo = vr ? ` (VR: ${vr})` : '';
                console.log(`Found tag ${tag}${vrInfo} at offset ${offset}, length ${valueLength}, data starts at ${dataStart}`);

                // 如果是波形数据标签 (5400,1010)
                if (group === 0x5400 && element === 0x1010) {
                  console.log(`Found waveform data at offset ${offset}, length ${valueLength}`);
                  
                  const waveformDataBuffer = itemData.slice(dataStart, dataStart + valueLength);

                  // 打印前32个字节用于调试
                  console.log('Waveform data sample:', Array.from(waveformDataBuffer.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));

                  // 检查是否为16位数据
                  const bitsAllocated = 16; // 默认使用16位
                  if (bitsAllocated === 16) {
                    // 创建16位整数数组
                    const dataView = new DataView(waveformDataBuffer.buffer, 
                                                waveformDataBuffer.byteOffset, 
                                                waveformDataBuffer.length);
                    const samples = new Int16Array(waveformDataBuffer.length / 2);
                    
                    // 读取每个样本
                    for (let k = 0; k < samples.length; k++) {
                      samples[k] = dataView.getInt16(k * 2, true); // true表示小端字节序
                    }
                    
                    this.waveformData = samples;

                    // 分析波形数据
                    const dataAnalysis = {
                      length: this.waveformData.length,
                      firstValues: Array.from(this.waveformData.slice(0, 10)),
                      min: Math.min(...Array.from(this.waveformData)),
                      max: Math.max(...Array.from(this.waveformData))
                    };
                    console.log('Waveform data analysis:', dataAnalysis);
                    break;
                  }
                }

                // 移动到下一个标签
                offset = dataStart + valueLength;
              }
            } catch (error) {
              console.error(`Error processing item ${i}:`, error);
            }
          }
        }
      } else {
        throw new Error('No WaveformSequence found in DICOM file');
      }

      // 验证波形数据
      if (!this.waveformData || this.waveformData.length === 0) {
        throw new Error('No valid waveform data found in DICOM file');
      }

      // 返回成功
      return true;
    } catch (error) {
      console.error('Error parsing DICOM data:', error);
      throw error;
    }
  }

  getWaveform() {
    if (!this.waveformData) {
      console.error('No waveform data available');
      return null;
    }
    
    console.log('Processing waveform data...');
    let waveform = Array.from(this.waveformData);
    console.log('Waveform data stats:', {
      length: waveform.length,
      min: Math.min(...waveform),
      max: Math.max(...waveform),
      sample: waveform.slice(0, 10)
    });
    
    if (this.options.applyLowPassFilter) {
      waveform = this.applyLowPassFilter(waveform);
      console.log('Applied low pass filter');
    }
    
    return waveform;
  }

  getInfo() {
    if (!this.elements) {
      console.log('No elements available');
      return null;
    }

    console.log('Getting ECG info');
    return [
      { key: 'VentricularRate', value: this.calculateHeartRate(), unit: 'bpm' },
      { key: 'QRSDuration', value: this.calculateQRSDuration(), unit: 'ms' },
      { key: 'StudyDate', value: this.formatDate(this.elements.StudyDate), unit: '' },
      { key: 'Modality', value: this.elements.Modality, unit: '' },
      { key: 'SOPClassUID', value: this.elements.SOPClassUID, unit: '' }
    ];
  }

  calculateHeartRate() {
    if (!this.waveformData) return null;
    // Simplified heart rate calculation
    return '75'; // Example value
  }

  calculateQRSDuration() {
    if (!this.waveformData) return null;
    // Simplified QRS duration calculation
    return '100'; // Example value
  }

  formatDate(dateString) {
    if (!dateString) return '';
    return dateString.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  }

  applyLowPassFilter(data) {
    const alpha = 0.1;
    let filtered = [];
    filtered[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      filtered[i] = alpha * data[i] + (1 - alpha) * filtered[i-1];
    }
    
    return filtered;
  }
}

export default ReadECG;
