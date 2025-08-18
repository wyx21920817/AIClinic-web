import React, { useEffect, useRef } from 'react';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import cornerstoneMath from 'cornerstone-math';
import cornerstoneWebImageLoader from 'cornerstone-web-image-loader';
import Hammer from 'hammerjs';

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneWebImageLoader.external.cornerstone = cornerstone;

const DicomViewer = ({ dicomFile }) => {
  const elementRef = useRef(null);

  useEffect(() => {
    if (!dicomFile) return;

    const element = elementRef.current;
    cornerstone.enable(element);

    // Load and display the DICOM image
    const imageId = `wadouri:http://localhost:8000/dicom/${dicomFile.id}`;
    
    cornerstone.loadImage(imageId).then(image => {
      cornerstone.displayImage(element, image);
      
      // Initialize tools
      cornerstoneTools.init();
      
      // Add tools
      const WwwcTool = cornerstoneTools.WwwcTool;
      const PanTool = cornerstoneTools.PanTool;
      const ZoomTool = cornerstoneTools.ZoomTool;
      const LengthTool = cornerstoneTools.LengthTool;
      
      cornerstoneTools.addTool(WwwcTool);
      cornerstoneTools.addTool(PanTool);
      cornerstoneTools.addTool(ZoomTool);
      cornerstoneTools.addTool(LengthTool);
      
      // Set active tools
      cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
      cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 2 });
      cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 4 });
      cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1, isTouchActive: true });
    }).catch(error => {
      console.error('Error loading DICOM file:', error);
      alert('Error loading DICOM file');
    });

    return () => {
      cornerstone.disable(element);
    };
  }, [dicomFile]);

  return (
    <div className="dicom-viewer">
      <div 
        ref={elementRef}
        style={{ width: '100%', height: '512px', background: '#000' }}
      />
      <div className="toolbar">
        <button onClick={() => cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 })}>
          Window/Level
        </button>
        <button onClick={() => cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 })}>
          Pan
        </button>
        <button onClick={() => cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 1 })}>
          Zoom
        </button>
        <button onClick={() => cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 })}>
          Length
        </button>
      </div>
    </div>
  );
};

export default DicomViewer;
