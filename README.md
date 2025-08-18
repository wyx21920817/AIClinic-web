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

- React.js for frontend development
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

## Docker Deployment

The AIClinic Web application can be containerized using Docker, providing a consistent runtime environment.

### Prerequisites

- Install [Docker](https://www.docker.com/get-started)
- Install [Docker Compose](https://docs.docker.com/compose/install/) (optional, for simplified container management)

### Building and Running with Docker

1. **Build the Docker image**

   ```bash
   # Run in the project root directory
   docker build -t aiclinic-web .
   ```

2. **Run the Docker container**

   ```bash
   # Basic run command
   docker run -d -p 80:80 aiclinic-web
   
   # Or using Docker Compose
   docker-compose up -d
   ```

3. **Access the application**

   The application will be available at `http://localhost`

### Publishing the Docker Image

To publish your Docker image to Docker Hub:

1. **Create a Docker Hub account**
   - Register at [Docker Hub](https://hub.docker.com/) if you don't have an account

2. **Login to Docker Hub**
   ```bash
   docker login
   # Enter your Docker Hub username and password when prompted
   ```

3. **Tag your image**
   ```bash
   docker tag aiclinic-web YOUR_USERNAME/aiclinic-web:latest
   # Replace YOUR_USERNAME with your Docker Hub username
   ```

4. **Push the image to Docker Hub**
   ```bash
   docker push YOUR_USERNAME/aiclinic-web:latest
   ```

5. **Verify the upload**
   - Visit your Docker Hub repository to confirm the image was uploaded

### Docker Configuration Files

- **Dockerfile**: Defines how to build the Docker image for the application
  - Uses nginx:stable-alpine as the base image
  - Copies the React build output to Nginx's web root directory
  - Uses custom nginx configuration to support React routing

- **docker-compose.yml**: Simplifies building and running the container
  - Defines service name and build context
  - Configures port mapping or network mode
  - Sets container restart policy

- **nginx.conf**: Custom Nginx configuration
  - Configures static file serving
  - Handles React routing
  - Enables gzip compression

### Troubleshooting

- **Token Issues**: If you encounter API authentication problems when running in a container, try logging in again in the containerized version of the application to obtain a new token
- **Network Issues**: If running on Linux, you can try using the `network_mode: "host"` configuration
- **Docker Hub Push Errors**: If you see errors like `push access denied, repository does not exist or may require authorization`, try these solutions:
  - Ensure you're logged in with `docker login`
  - Verify your username is correct in the tag command
  - Create the repository on Docker Hub website first
  - Check your account permissions and email verification status

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- ECG DICOM Web Viewer library
- Cornerstone medical imaging libraries
- Ant Design team for the UI components
- All contributors who have helped with the project
