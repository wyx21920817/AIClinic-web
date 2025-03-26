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
      
      // Check key tags
      const criticalTags = {
        'TransferSyntaxUID': 'x00020010',
        'SOPClassUID': 'x00080016',
        'Modality': 'x00080060',
        'WaveformSequence': 'x54000100'
      };

      // Analyze tags
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

      // Save key parameters
      this.elements = {
        TransferSyntaxUID: dataSet.string('x00020010'),
        SOPClassUID: dataSet.string('x00080016'),
        Modality: dataSet.string('x00080060'),
        WaveformSequence: dataSet.elements['x54000100']
      };

      // Analyze waveform sequence
      if (this.elements.WaveformSequence) {
        const sequenceInfo = {
          length: this.elements.WaveformSequence.length,
          vr: this.elements.WaveformSequence.vr,
          dataOffset: this.elements.WaveformSequence.dataOffset,
          items: this.elements.WaveformSequence.items ? this.elements.WaveformSequence.items.length : 0
        };
        console.log('WaveformSequence Info:', sequenceInfo);

        if (this.elements.WaveformSequence.items) {
          // Iterate through all sequence items
          for (let i = 0; i < this.elements.WaveformSequence.items.length; i++) {
            const item = this.elements.WaveformSequence.items[i];
            console.log(`Analyzing Item ${i}:`, {
              length: item.length,
              dataOffset: item.dataOffset,
              elements: Object.keys(item.elements || {})
            });

            // Parse data set directly from item's byte range
            try {
              const itemData = byteArray.slice(item.dataOffset, item.dataOffset + item.length);
              console.log(`Item ${i} data sample:`, Array.from(itemData.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));

              // Check if explicit VR
              const isExplicitVR = this.elements.TransferSyntaxUID && 
                                 this.elements.TransferSyntaxUID.includes('1.2.840.10008.1.2.1');
              console.log('Transfer Syntax:', this.elements.TransferSyntaxUID);
              console.log('Using Explicit VR:', isExplicitVR);

              // Parse all tags in item
              let offset = 0;
              while (offset < itemData.length - 8) { // At least 8 bytes needed
                // Read group and element numbers
                const group = itemData[offset] + (itemData[offset + 1] << 8);
                const element = itemData[offset + 2] + (itemData[offset + 3] << 8);
                const tag = `(${group.toString(16).padStart(4, '0')},${element.toString(16).padStart(4, '0')})`;

                let valueLength;
                let dataStart;
                let vr = '';

                if (isExplicitVR) {
                  // Explicit VR format
                  vr = String.fromCharCode(itemData[offset + 4], itemData[offset + 5]);
                  
                  if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
                    // These VRs use 32-bit length field, need 2 bytes padding
                    valueLength = itemData[offset + 8] + 
                                (itemData[offset + 9] << 8) +
                                (itemData[offset + 10] << 16) +
                                (itemData[offset + 11] << 24);
                    dataStart = offset + 12;
                  } else {
                    // Other VRs use 16-bit length field
                    valueLength = itemData[offset + 6] + (itemData[offset + 7] << 8);
                    dataStart = offset + 8;
                  }
                } else {
                  // Implicit VR format
                  valueLength = itemData[offset + 4] + 
                              (itemData[offset + 5] << 8) +
                              (itemData[offset + 6] << 16) +
                              (itemData[offset + 7] << 24);
                  dataStart = offset + 8;
                  
                  // Infer VR from tag
                  if (group === 0x5400 && element === 0x1010) {
                    vr = 'OW';
                  }
                }

                // Verify length is reasonable
                if (valueLength > itemData.length - dataStart) {
                  console.log(`Invalid length ${valueLength} for tag ${tag} (VR: ${vr}) at offset ${offset}, skipping to next item`);
                  break;
                }

                const vrInfo = vr ? ` (VR: ${vr})` : '';
                console.log(`Found tag ${tag}${vrInfo} at offset ${offset}, length ${valueLength}, data starts at ${dataStart}`);

                // If waveform data tag (5400,1010)
                if (group === 0x5400 && element === 0x1010) {
                  console.log(`Found waveform data at offset ${offset}, length ${valueLength}`);
                  
                  const waveformDataBuffer = itemData.slice(dataStart, dataStart + valueLength);

                  // Print first 32 bytes for debugging
                  console.log('Waveform data sample:', Array.from(waveformDataBuffer.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));

                  // Check if 16-bit data
                  const bitsAllocated = 16; // Default to 16-bit
                  if (bitsAllocated === 16) {
                    // Create 16-bit integer array
                    const dataView = new DataView(waveformDataBuffer.buffer, 
                                                waveformDataBuffer.byteOffset, 
                                                waveformDataBuffer.length);
                    const samples = new Int16Array(waveformDataBuffer.length / 2);
                    
                    // Read each sample
                    for (let k = 0; k < samples.length; k++) {
                      samples[k] = dataView.getInt16(k * 2, true); // true indicates little-endian
                    }
                    
                    this.waveformData = samples;

                    // Analyze waveform data
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

                // Move to next tag
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

      // Validate waveform data
      if (!this.waveformData || this.waveformData.length === 0) {
        throw new Error('No valid waveform data found in DICOM file');
      }

      // Return success
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
