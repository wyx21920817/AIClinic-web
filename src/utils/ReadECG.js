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
      console.log('Starting to parse DICOM data...');
      const byteArray = new Uint8Array(this.arrayBuffer);
      console.log('ByteArray length:', byteArray.length);
      
      const dataSet = dicomParser.parseDicom(byteArray);
      console.log('DICOM parsed successfully');

      // 读取并打印所有可用的标签
      console.log('Available tags:');
      for (let tag in dataSet.elements) {
        console.log(tag, ':', dataSet.string(tag));
      }

      // Read DICOM elements
      this.elements = {
        PatientName: dataSet.string('x00100010'),
        PatientID: dataSet.string('x00100020'),
        PatientBirthDate: dataSet.string('x00100030'),
        PatientSex: dataSet.string('x00100040'),
        StudyDate: dataSet.string('x00080020'),
        SOPClassUID: dataSet.string('x00080016'),
        Modality: dataSet.string('x00080060'),
        // ECG特定标签
        WaveformSequence: dataSet.elements['x54000100'],
        WaveformData: dataSet.elements['x54001010'],
        ChannelMinimumValue: dataSet.elements['x54001004'],
        ChannelMaximumValue: dataSet.elements['x54001005'],
        WaveformBitsAllocated: dataSet.elements['x54001006']
      };

      console.log('Parsed elements:', this.elements);

      // 检查波形数据
      if (this.elements.WaveformSequence) {
        console.log('Found WaveformSequence');
        const waveformSequence = dataSet.elements['x54000100'];
        console.log('WaveformSequence:', waveformSequence);
        
        // 尝试不同的方法读取波形数据
        if (this.elements.WaveformData) {
          console.log('Found WaveformData directly');
          const waveformData = this.elements.WaveformData;
          this.waveformData = new Int16Array(this.arrayBuffer.slice(waveformData.dataOffset, waveformData.dataOffset + waveformData.length));
        } else {
          console.log('Trying to read from WaveformSequence');
          const waveformData = new DataView(this.arrayBuffer, waveformSequence.dataOffset, waveformSequence.length);
          this.waveformData = new Int16Array(waveformData.buffer);
        }
        
        console.log('Waveform data length:', this.waveformData ? this.waveformData.length : 'No data');
      } else {
        console.log('No WaveformSequence found');
      }
    } catch (error) {
      console.error('Error parsing DICOM data:', error);
      console.error('Error details:', error.stack);
      return null;
    }
  }

  getWaveform() {
    if (!this.waveformData) {
      console.log('No waveform data available');
      return null;
    }
    
    console.log('Processing waveform data...');
    let waveform = Array.from(this.waveformData);
    console.log('Waveform sample:', waveform.slice(0, 10));
    
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
