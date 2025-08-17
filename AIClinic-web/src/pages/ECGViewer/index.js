import React, { useState } from 'react';
import { Card, Space, Button, Typography } from 'antd';
import { Box, Grid } from '@mui/material';

const { Title } = Typography;

const ECGViewerPage = () => {
  const [selectedView, setSelectedView] = useState('grid'); // 'grid' or 'single'

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Title level={2}>ECG Analysis</Title>
            <Space>
              <Button type={selectedView === 'grid' ? 'primary' : 'default'} 
                      onClick={() => setSelectedView('grid')}>
                Grid View
              </Button>
              <Button type={selectedView === 'single' ? 'primary' : 'default'} 
                      onClick={() => setSelectedView('single')}>
                Single View
              </Button>
            </Space>
          </Box>
        </Grid>

        {/* ECG Display Area */}
        <Grid item xs={12} md={8}>
          <Card style={{ height: '600px' }}>
            {/* ECG Visualization will go here */}
            <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              ECG Display
            </div>
          </Card>
        </Grid>

        {/* Analysis Panel */}
        <Grid item xs={12} md={4}>
          <Card title="Analysis Results" style={{ height: '600px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* Analysis details will go here */}
              <Card type="inner" title="Heart Rate">
                75 BPM
              </Card>
              <Card type="inner" title="Rhythm">
                Normal Sinus Rhythm
              </Card>
              <Card type="inner" title="Abnormalities">
                None detected
              </Card>
              <Card type="inner" title="Additional Notes">
                Regular rhythm, normal intervals
              </Card>
            </Space>
          </Card>
        </Grid>

        {/* Controls and Tools */}
        <Grid item xs={12}>
          <Card>
            <Space size="large">
              <Button type="primary">Play</Button>
              <Button>Pause</Button>
              <Button>Reset</Button>
              <Button>Export</Button>
              <Button>Print</Button>
            </Space>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ECGViewerPage;
