import React, { useState, useRef } from 'react';
import {
  Button,
  Card,
  Space,
  Typography,
  message,
  Progress,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Divider,
  Alert,
  Row,
  Col
} from 'antd';
import {
  FilePdfOutlined,
  DownloadOutlined,
  PrinterOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// import { saveAs } from 'file-saver';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PDFReportExport = ({
  ecgData,
  aiDiagnosis,
  doctorFeedback,
  patientInfo,
  reportSettings = {},
  onExportComplete
}) => {
  const [form] = Form.useForm();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const reportRef = useRef(null);

  const defaultSettings = {
    includeECG: true,
    includeAIDiagnosis: true,
    includeDoctorFeedback: true,
    includePatientInfo: true,
    includeMetadata: true,
    reportTitle: 'ECG Analysis Report',
    reportSubtitle: 'AI Clinical Decision Support System',
    pageSize: 'A4',
    orientation: 'portrait',
    margins: 'standard',
    customNotes: ''
  };

  const [settings] = useState({ ...defaultSettings, ...reportSettings });

  const generatePDF = async () => {
    setIsGenerating(true);
    setProgress(0);
    
    try {
      const pdf = new jsPDF(settings.orientation, 'mm', settings.pageSize);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = settings.margins === 'narrow' ? 10 : 20;
      
      setProgress(10);

      // Add header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(settings.reportTitle, pageWidth / 2, margin + 10, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(settings.reportSubtitle, pageWidth / 2, margin + 20, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, margin + 30, { align: 'center' });
      
      setProgress(20);

      let yPosition = margin + 40;

      // Add patient information
      if (settings.includePatientInfo && patientInfo) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Patient Information', margin, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Name: ${patientInfo.name || 'N/A'}`, margin, yPosition);
        yPosition += 5;
        pdf.text(`ID: ${patientInfo.id || 'N/A'}`, margin, yPosition);
        yPosition += 5;
        pdf.text(`Date of Birth: ${patientInfo.birthDate || 'N/A'}`, margin, yPosition);
        yPosition += 5;
        pdf.text(`Gender: ${patientInfo.gender || 'N/A'}`, margin, yPosition);
        yPosition += 15;
        
        setProgress(30);
      }

      // Add ECG data
      if (settings.includeECG && ecgData) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ECG Recording', margin, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Recording Date: ${ecgData.recordingDate || 'N/A'}`, margin, yPosition);
        yPosition += 5;
        pdf.text(`Duration: ${ecgData.duration || 'N/A'}`, margin, yPosition);
        yPosition += 5;
        pdf.text(`Leads: ${ecgData.leads?.join(', ') || 'N/A'}`, margin, yPosition);
        yPosition += 15;
        
        setProgress(40);

        // Add ECG image if available
        if (ecgData.imageUrl) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = ecgData.imageUrl;
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });
            
            const imgWidth = pageWidth - 2 * margin;
            const imgHeight = (img.height * imgWidth) / img.width;
            
            if (yPosition + imgHeight > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            
            pdf.addImage(img, 'JPEG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10;
            
            setProgress(60);
          } catch (error) {
            console.error('Error adding ECG image:', error);
            pdf.text('ECG image could not be included', margin, yPosition);
            yPosition += 10;
          }
        }
      }

      // Add AI diagnosis
      if (settings.includeAIDiagnosis && aiDiagnosis) {
        if (yPosition > pageHeight - 100) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('AI Diagnosis', margin, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Confidence Score: ${aiDiagnosis.confidence || 0}%`, margin, yPosition);
        yPosition += 5;
        
        if (aiDiagnosis.primary) {
          pdf.text(`Primary Diagnosis: ${aiDiagnosis.primary}`, margin, yPosition);
          yPosition += 5;
        }
        
        if (aiDiagnosis.secondary && aiDiagnosis.secondary.length > 0) {
          pdf.text('Secondary Findings:', margin, yPosition);
          yPosition += 5;
          aiDiagnosis.secondary.forEach((finding, index) => {
            pdf.text(`  ${index + 1}. ${finding}`, margin, yPosition);
            yPosition += 5;
          });
        }
        
        if (aiDiagnosis.highlightedLeads && aiDiagnosis.highlightedLeads.length > 0) {
          pdf.text(`Key Leads: ${aiDiagnosis.highlightedLeads.join(', ')}`, margin, yPosition);
          yPosition += 5;
        }
        
        yPosition += 10;
        setProgress(70);
      }

      // Add doctor feedback (timestamp, label, then text)
      if (settings.includeDoctorFeedback && doctorFeedback) {
        if (yPosition > pageHeight - 100) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Doctor feedback:', margin, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const tsDate = doctorFeedback.timestamp ? new Date(doctorFeedback.timestamp) : new Date();
        pdf.text(`Time: ${tsDate.toLocaleString()}` , margin, yPosition);
        // Add an extra spacer line to make it less congested
        yPosition += 12;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Doctor Feedback', margin, yPosition);
        yPosition += 10;

        pdf.setFont('helvetica', 'normal');
        const notesText = (doctorFeedback.notes || doctorFeedback.comment || '').trim();
        const words = notesText.split(' ');
        let line = '';
        if (!notesText) {
          pdf.text('No notes provided.', margin, yPosition);
          yPosition += 5;
        } else {
          for (const word of words) {
            const testLine = line + word + ' ';
            if (pdf.getTextWidth(testLine) > pageWidth - 2 * margin) {
              pdf.text(line, margin, yPosition);
              yPosition += 5;
              line = word + ' ';
            } else {
              line = testLine;
            }
          }
          if (line) {
            pdf.text(line, margin, yPosition);
            yPosition += 5;
          }
        }
        // Extra spacing after section
        yPosition += 5;
        
        yPosition += 10;
        setProgress(80);
      }

      // Add custom notes
      if (settings.customNotes) {
        if (yPosition > pageHeight - 100) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Additional Notes', margin, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const words = settings.customNotes.split(' ');
        let line = '';
        for (const word of words) {
          const testLine = line + word + ' ';
          if (pdf.getTextWidth(testLine) > pageWidth - 2 * margin) {
            pdf.text(line, margin, yPosition);
            yPosition += 5;
            line = word + ' ';
          } else {
            line = testLine;
          }
        }
        if (line) {
          pdf.text(line, margin, yPosition);
        }
        
        setProgress(90);
      }

      // Add footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Generated by AIClinic - AI Clinical Decision Support System', pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      setProgress(100);

      // Save the PDF
      const fileName = `ECG_Report_${patientInfo?.name || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      message.success('PDF report generated successfully!');
      
      if (onExportComplete) {
        onExportComplete(fileName);
      }
      
    } catch (error) {
      console.error('PDF generation error:', error);
      message.error('Failed to generate PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handlePreview = async () => {
    if (!reportRef.current) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const url = canvas.toDataURL('image/png');
      setPreviewUrl(url);
    } catch (error) {
      console.error('Preview generation error:', error);
      message.error('Failed to generate preview.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderSettingsModal = () => (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Report Settings</span>
        </Space>
      }
      open={showSettings}
      onOk={() => setShowSettings(false)}
      onCancel={() => setShowSettings(false)}
      width={600}
    >
      <Form form={form} layout="vertical" initialValues={settings}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="reportTitle" label="Report Title">
              <Input placeholder="ECG Analysis Report" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="pageSize" label="Page Size">
              <Select>
                <Option value="A4">A4</Option>
                <Option value="A3">A3</Option>
                <Option value="Letter">Letter</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="orientation" label="Orientation">
              <Select>
                <Option value="portrait">Portrait</Option>
                <Option value="landscape">Landscape</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="margins" label="Margins">
              <Select>
                <Option value="standard">Standard</Option>
                <Option value="narrow">Narrow</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Divider>Content Options</Divider>
        
        <Form.Item name="includeECG" valuePropName="checked">
          <Checkbox>Include ECG Recording</Checkbox>
        </Form.Item>
        
        <Form.Item name="includeAIDiagnosis" valuePropName="checked">
          <Checkbox>Include AI Diagnosis</Checkbox>
        </Form.Item>
        
        <Form.Item name="includeDoctorFeedback" valuePropName="checked">
          <Checkbox>Include Doctor Feedback</Checkbox>
        </Form.Item>
        
        <Form.Item name="includePatientInfo" valuePropName="checked">
          <Checkbox>Include Patient Information</Checkbox>
        </Form.Item>
        
        <Form.Item name="includeMetadata" valuePropName="checked">
          <Checkbox>Include Metadata</Checkbox>
        </Form.Item>
        
        <Form.Item name="customNotes" label="Additional Notes">
          <TextArea rows={3} placeholder="Enter any additional notes for the report..." />
        </Form.Item>
      </Form>
    </Modal>
  );

  const renderPreviewModal = () => (
    <Modal
      title="Report Preview"
      open={!!previewUrl}
      onCancel={() => setPreviewUrl(null)}
      width={800}
      footer={[
        <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
          Print
        </Button>,
        <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={generatePDF}>
          Download PDF
        </Button>
      ]}
    >
      {previewUrl && (
        <img 
          src={previewUrl} 
          alt="Report Preview" 
          style={{ width: '100%', height: 'auto' }} 
        />
      )}
    </Modal>
  );

  return (
    <div style={{ padding: 16 }}>
      <Card title="📄 PDF Report Export">
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* Progress indicator */}
          {isGenerating && (
            <div>
              <Text>Generating PDF Report...</Text>
              <Progress percent={progress} status="active" />
            </div>
          )}
          
          {/* Action buttons */}
          <Row gutter={16}>
            <Col span={8}>
              <Button
                type="primary"
                icon={<FilePdfOutlined />}
                size="large"
                block
                onClick={generatePDF}
                loading={isGenerating}
                disabled={!ecgData}
              >
                Generate PDF
              </Button>
            </Col>
            <Col span={8}>
              <Button
                icon={<EyeOutlined />}
                size="large"
                block
                onClick={handlePreview}
                disabled={!ecgData}
              >
                Preview
              </Button>
            </Col>
            <Col span={8}>
              <Button
                icon={<SettingOutlined />}
                size="large"
                block
                onClick={() => setShowSettings(true)}
              >
                Settings
              </Button>
            </Col>
          </Row>
          
          {/* Report content preview */}
          <div ref={reportRef} style={{ display: 'none' }}>
            <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
              <h1 style={{ textAlign: 'center' }}>{settings.reportTitle}</h1>
              <h3 style={{ textAlign: 'center', color: '#666' }}>{settings.reportSubtitle}</h3>
              
              {settings.includePatientInfo && patientInfo && (
                <div>
                  <h2>Patient Information</h2>
                  <p><strong>Name:</strong> {patientInfo.name}</p>
                  <p><strong>ID:</strong> {patientInfo.id}</p>
                  <p><strong>Date of Birth:</strong> {patientInfo.birthDate}</p>
                </div>
              )}
              
              {settings.includeECG && ecgData && (
                <div>
                  <h2>ECG Recording</h2>
                  <p><strong>Recording Date:</strong> {ecgData.recordingDate}</p>
                  <p><strong>Duration:</strong> {ecgData.duration}</p>
                </div>
              )}
              
              {settings.includeAIDiagnosis && aiDiagnosis && (
                <div>
                  <h2>AI Diagnosis</h2>
                  <p><strong>Confidence:</strong> {aiDiagnosis.confidence}%</p>
                  <p><strong>Primary Diagnosis:</strong> {aiDiagnosis.primary}</p>
                </div>
              )}
              
              {settings.includeDoctorFeedback && doctorFeedback && (
                <div>
                  <h2>Doctor Feedback</h2>
                  <p><strong>Time:</strong> {new Date(doctorFeedback.timestamp || Date.now()).toLocaleString()}</p>
                  <p><strong>Doctor feedback:</strong></p>
                  <p>{(doctorFeedback.notes || doctorFeedback.comment || '').trim() || 'No notes provided.'}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Status information */}
          <Alert
            message="Report Generation Ready"
            description="Click 'Generate PDF' to create a professional clinical report with all selected components."
            type="info"
            showIcon
          />
        </Space>
      </Card>
      
      {renderSettingsModal()}
      {renderPreviewModal()}
    </div>
  );
};

export default PDFReportExport; 