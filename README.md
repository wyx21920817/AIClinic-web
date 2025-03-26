# AIClinic Web Application

AIClinic is a modern web-based medical imaging platform that combines AI technology with traditional medical imaging analysis. This application provides an intuitive interface for medical professionals to view, analyze, and process medical images, particularly focusing on ECG and CT scan data.

## Features

- **ECG Viewer**
  - View and analyze DICOM ECG files
  - Interactive waveform display
  - Support for various ECG formats
  - Real-time measurements and analysis

- **CT Scan Processing**
  - Upload and view CT scan images
  - Convert images to DICOM format
  - AI-enhanced image processing
  - High-quality visualization

- **User Interface**
  - Modern, responsive design
  - Intuitive file upload interface
  - Progress tracking for file processing
  - Error handling and user feedback

## Technology Stack

- React.js for front-end development
- Ant Design component library for UI
- DICOM processing libraries
  - dicom-parser
  - ecg-dicom-web-viewer
  - cornerstone-core
- Node.js backend (separate repository)

## Prerequisites

- Node.js (version 14.0 or higher)
- npm (version 6.0 or higher)
- Modern web browser (Chrome, Firefox, Safari, or Edge)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/AIClinic-web.git
   cd AIClinic-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## Usage

1. **Viewing ECG Files**
   - Click the "Upload DICOM File" button or drag and drop a DICOM file
   - The ECG waveform will be displayed in the viewer
   - Use mouse controls to zoom and pan the waveform

2. **Processing CT Scans**
   - Upload CT scan images through the dedicated upload area
   - Wait for the AI processing to complete
   - View the processed DICOM file in the viewer

## Development

- Run tests:
  ```bash
  npm test
  ```

- Build for production:
  ```bash
  npm run build
  ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- ECG DICOM Web Viewer library
- Cornerstone medical imaging libraries
- Ant Design team for the UI components
- All contributors who have helped with the project
