import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';

export const initializeCornerstone = (element) => {
  cornerstone.enable(element);
  cornerstoneTools.init();
};

export const loadAndDisplayImage = async (element, imageId) => {
  try {
    const image = await cornerstone.loadImage(imageId);
    cornerstone.displayImage(element, image);
    return image;
  } catch (error) {
    console.error('Error loading DICOM image:', error);
    throw error;
  }
};
