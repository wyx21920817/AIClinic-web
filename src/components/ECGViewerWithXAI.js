import React, { useRef, useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Tooltip,
  Tag,
  Alert
} from 'antd';
import {
  EyeOutlined,
  HeatMapOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import styled from '@emotion/styled';

const { Title, Text } = Typography;

const ECGContainer = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
`;

const ECGGrid = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
`;

const ECGWaveform = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;

const ConfidenceOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
`;

const ConfidenceRegion = styled.div`
  position: absolute;
  height: 100%;
  opacity: 0.3;
  border-left: 2px solid ${props => props.color};
  border-right: 2px solid ${props => props.color};
  background: ${props => props.color}20;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.color}10;
  }
`;

const RPeakMarker = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  cursor: pointer;
  
  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
`;

const ECGViewerWithXAI = ({ 
  ecgData, 
  xaiData, 
  showXAIOverlay = true,
  showRPeaks = true,
  onToggleXAIView,
  onToggleRPeaks 
}) => {
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10); // 10 seconds ECG

  // Real ECG data structure
  const realEcgData = ecgData || {
    samplingRate: 500, // Hz
    duration: 10, // seconds
    leads: {
      "II": {
        data: generateMockECGData(5000), // 10 seconds * 500 Hz
        rPeaks: [0.2, 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2], // R-peak timings
        name: "Lead II"
      }
    }
  };

  // Real XAI data structure
  const realXaiData = xaiData || {
    confidenceHeatmap: {
      regions: [
        {
          start: 0.8,
          end: 1.0,
          confidence: 0.94,
          color: "#52c41a",
          explanation: "High confidence in PR interval measurement",
          lead: "II"
        },
        {
          start: 1.6,
          end: 1.8,
          confidence: 0.87,
          color: "#52c41a",
          explanation: "Clear QRS complex detection",
          lead: "II"
        },
        {
          start: 7.6,
          end: 7.8,
          confidence: 0.78,
          color: "#faad14",
          explanation: "Moderate confidence in T-wave analysis",
          lead: "II"
        }
      ]
    },
    rPeaks: [0.2, 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2]
  };

  // Generate mock ECG data for demonstration
  function generateMockECGData(length) {
    const data = [];
    for (let i = 0; i < length; i++) {
      const time = i / 500; // 500 Hz sampling rate
      const heartRate = 72; // bpm
      const cycleLength = 60 / heartRate; // seconds per beat
      
      // Generate ECG-like waveform
      let value = 0;
      
      // Add P wave
      const pWaveTime = (time % cycleLength) - 0.2;
      if (pWaveTime > 0 && pWaveTime < 0.1) {
        value += 0.1 * Math.sin(pWaveTime * 20 * Math.PI);
      }
      
      // Add QRS complex
      const qrsTime = (time % cycleLength) - 0.4;
      if (qrsTime > 0 && qrsTime < 0.12) {
        value += 0.8 * Math.exp(-Math.pow((qrsTime - 0.06) / 0.02, 2));
      }
      
      // Add T wave
      const tWaveTime = (time % cycleLength) - 0.6;
      if (tWaveTime > 0 && tWaveTime < 0.2) {
        value += 0.3 * Math.exp(-Math.pow((tWaveTime - 0.1) / 0.05, 2));
      }
      
      // Add some noise
      value += (Math.random() - 0.5) * 0.05;
      
      data.push(value);
    }
    return data;
  }

  // Convert time to pixel position
  const timeToPixel = (time) => {
    if (!containerRef.current) return 0;
    const containerWidth = containerRef.current.offsetWidth;
    return (time / duration) * containerWidth;
  };

  // Convert amplitude to pixel position
  const amplitudeToPixel = (amplitude) => {
    if (!containerRef.current) return 0;
    const containerHeight = containerRef.current.offsetHeight;
    const centerY = containerHeight / 2;
    const scale = containerHeight / 4; // Scale factor for ECG display
    return centerY - (amplitude * scale);
  };

  // Generate SVG path for ECG waveform
  const generateECGPath = () => {
    const leadData = realEcgData.leads.II.data;
    const path = [];
    
    leadData.forEach((amplitude, index) => {
      const time = index / realEcgData.samplingRate;
      const x = timeToPixel(time);
      const y = amplitudeToPixel(amplitude);
      
      if (index === 0) {
        path.push(`M ${x} ${y}`);
      } else {
        path.push(`L ${x} ${y}`);
      }
    });
    
    return path.join(' ');
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#52c41a'; // Green
    if (confidence >= 0.6) return '#faad14'; // Orange
    return '#ff4d4f'; // Red
  };

  const renderConfidenceRegions = () => {
    if (!showXAIOverlay) return null;
    
    const regions = realXaiData?.confidenceHeatmap?.regions;
    if (!regions || !Array.isArray(regions)) return null;
    
    return regions.map((region, index) => {
      const left = timeToPixel(region.start);
      const width = timeToPixel(region.end) - left;
      
      return (
        <Tooltip
          key={index}
          title={
            <div>
              <div><strong>Confidence: {Math.round(region.confidence * 100)}%</strong></div>
              <div>Time: {region.start}s - {region.end}s</div>
              <div>Lead: {region.lead}</div>
              <div>{region.explanation}</div>
            </div>
          }
        >
          <ConfidenceRegion
            style={{
              left: `${left}px`,
              width: `${width}px`
            }}
            color={getConfidenceColor(region.confidence)}
          />
        </Tooltip>
      );
    });
  };

  const renderRPeaks = () => {
    if (!showRPeaks) return null;
    
    // Get R-peaks from either XAI data or ECG data, with fallback to default
    const rPeaks = realXaiData?.rPeaks || realEcgData?.leads?.II?.rPeaks || [0.2, 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2];
    
    if (!rPeaks || !Array.isArray(rPeaks)) return null;
    
    return rPeaks.map((peakTime, index) => {
      const x = timeToPixel(peakTime);
      const y = amplitudeToPixel(0.8); // R-peak amplitude
      
      return (
        <Tooltip
          key={index}
          title={`R-peak ${index + 1}: ${peakTime.toFixed(1)}s`}
        >
          <RPeakMarker
            style={{
              left: `${x}px`,
              top: `${y}px`
            }}
          />
        </Tooltip>
      );
    });
  };

  const renderECGWaveform = () => {
    const path = generateECGPath();
    
    return (
      <ECGWaveform>
        <path
          d={path}
          stroke="#1890ff"
          strokeWidth="2"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </ECGWaveform>
    );
  };

  const renderControls = () => (
    <ControlsContainer>
      <Space>
        <Button
          type={showXAIOverlay ? 'primary' : 'default'}
          icon={<HeatMapOutlined />}
          onClick={onToggleXAIView}
        >
          {showXAIOverlay ? 'Hide XAI' : 'Show XAI'}
        </Button>
        
        <Button
          type={showRPeaks ? 'primary' : 'default'}
          icon={<EyeOutlined />}
          onClick={onToggleRPeaks}
        >
          {showRPeaks ? 'Hide R-peaks' : 'Show R-peaks'}
        </Button>
        
        <Button
          type={isPlaying ? 'default' : 'primary'}
          icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
      </Space>
      
      <Space>
        <Text type="secondary">Lead: {realEcgData.leads.II.name}</Text>
        <Text type="secondary">Duration: {duration}s</Text>
        <Text type="secondary">Sampling: {realEcgData.samplingRate} Hz</Text>
      </Space>
    </ControlsContainer>
  );

  const renderLegend = () => (
    <div style={{ marginTop: 16 }}>
      <Alert
        message="ECG Analysis Legend"
        description={
          <Space direction="vertical" size="small">
            <div>
              <Tag color="#1890ff">Blue Line</Tag> - ECG Waveform (Lead II)
            </div>
            {showRPeaks && (
              <div>
                <Tag color="#ff4d4f">Red Dots</Tag> - Detected R-peaks
              </div>
            )}
            {showXAIOverlay && (
              <div>
                <Tag color="#52c41a">Green Regions</Tag> - High Confidence
                <Tag color="#faad14">Orange Regions</Tag> - Moderate Confidence
                <Tag color="#ff4d4f">Red Regions</Tag> - Low Confidence
              </div>
            )}
          </Space>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
      />
    </div>
  );

  return (
    <Card title="ECG Viewer with XAI Analysis">
      {renderControls()}
      
      <ECGContainer ref={containerRef}>
        <ECGGrid />
        {renderECGWaveform()}
        <ConfidenceOverlay>
          {renderConfidenceRegions()}
          {renderRPeaks()}
        </ConfidenceOverlay>
      </ECGContainer>
      
      {renderLegend()}
    </Card>
  );
};

export default ECGViewerWithXAI; 