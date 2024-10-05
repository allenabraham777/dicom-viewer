// apps/viewer-app/src/DicomViewer.jsx

import React, { useState, useRef, useEffect } from "react";
import { parseDicomFile } from "dicom";

function DicomViewer() {
  const [dicomData, setDicomData] = useState(null);
  const [windowCenter, setWindowCenter] = useState(null);
  const [windowWidth, setWindowWidth] = useState(null);
  const canvasRef = useRef(null);

  const handleFileInput = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const dataSet = await parseDicomFile(file);

        // Extract necessary metadata
        const pixelDataElement = dataSet.elements.x7fe00010;
        if (pixelDataElement) {
          const pixelDataOffset = pixelDataElement.dataOffset;
          const pixelDataLength = pixelDataElement.length;
          const bitsAllocated = dataSet.uint16("x00280100");
          const bitsStored = dataSet.uint16("x00280101");
          const pixelRepresentation = dataSet.uint16("x00280103"); // 0 = unsigned, 1 = signed
          const samplesPerPixel = dataSet.uint16("x00280002") || 1;
          const photometricInterpretation = dataSet.string("x00280004");
          const width = dataSet.uint16("x00280011");
          const height = dataSet.uint16("x00280010");
          const windowCenterValue = dataSet.floatString("x00281050");
          const windowWidthValue = dataSet.floatString("x00281051");

          // Read pixel data
          const pixelDataArrayBuffer = dataSet.byteArray.buffer.slice(
            pixelDataOffset,
            pixelDataOffset + pixelDataLength
          );

          setDicomData({
            width,
            height,
            pixelData: pixelDataArrayBuffer,
            bitsAllocated,
            bitsStored,
            pixelRepresentation,
            samplesPerPixel,
            photometricInterpretation,
          });

          // Set initial window center and width
          setWindowCenter(windowCenterValue || 0);
          setWindowWidth(windowWidthValue || 0);
        } else {
          console.error("Pixel data not found in DICOM file.");
        }
      } catch (error) {
        console.error("Error parsing DICOM file:", error);
      }
    }
  };

  useEffect(() => {
    if (dicomData && canvasRef.current) {
      const {
        width,
        height,
        pixelData,
        bitsAllocated,
        bitsStored,
        pixelRepresentation,
        samplesPerPixel,
        photometricInterpretation,
      } = dicomData;

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = width;
      canvas.height = height;

      // Determine the typed array based on bits allocated and pixel representation
      let typedArray;
      if (bitsAllocated === 8) {
        typedArray = new Uint8Array(pixelData);
      } else if (bitsAllocated === 16) {
        if (pixelRepresentation === 0) {
          typedArray = new Uint16Array(pixelData);
        } else {
          typedArray = new Int16Array(pixelData);
        }
      } else {
        console.error("Unsupported Bits Allocated:", bitsAllocated);
        return;
      }

      // Apply window level and width
      const wc =
        windowCenter !== null
          ? windowCenter
          : (Math.max(...typedArray) + Math.min(...typedArray)) / 2;
      const ww =
        windowWidth !== null && windowWidth !== 0
          ? windowWidth
          : Math.max(...typedArray) - Math.min(...typedArray);

      const minPixelValue = wc - ww / 2;
      const maxPixelValue = wc + ww / 2;
      const range = maxPixelValue - minPixelValue;

      const imageData = context.createImageData(width, height);
      const numPixels = width * height;

      if (photometricInterpretation === "MONOCHROME1") {
        // Inverted grayscale
        for (let i = 0; i < numPixels; i++) {
          let pixelValue = typedArray[i];
          let intensity = ((maxPixelValue - pixelValue) / range) * 255;
          intensity = Math.min(Math.max(intensity, 0), 255);

          imageData.data[i * 4] = intensity;
          imageData.data[i * 4 + 1] = intensity;
          imageData.data[i * 4 + 2] = intensity;
          imageData.data[i * 4 + 3] = 255;
        }
      } else if (photometricInterpretation === "MONOCHROME2") {
        // Standard grayscale
        for (let i = 0; i < numPixels; i++) {
          let pixelValue = typedArray[i];
          let intensity = ((pixelValue - minPixelValue) / range) * 255;
          intensity = Math.min(Math.max(intensity, 0), 255);

          imageData.data[i * 4] = intensity;
          imageData.data[i * 4 + 1] = intensity;
          imageData.data[i * 4 + 2] = intensity;
          imageData.data[i * 4 + 3] = 255;
        }
      } else if (photometricInterpretation === "RGB") {
        // Handle RGB images
        const pixelDataBytes = new Uint8Array(pixelData);
        const bytesPerPixel = samplesPerPixel * (bitsAllocated / 8);

        for (let i = 0; i < numPixels; i++) {
          const idx = i * bytesPerPixel;
          imageData.data[i * 4] = pixelDataBytes[idx];
          imageData.data[i * 4 + 1] = pixelDataBytes[idx + 1];
          imageData.data[i * 4 + 2] = pixelDataBytes[idx + 2];
          imageData.data[i * 4 + 3] = 255;
        }
      } else {
        console.error(
          "Unsupported Photometric Interpretation:",
          photometricInterpretation
        );
        return;
      }

      context.putImageData(imageData, 0, 0);
    }
  }, [dicomData, windowCenter, windowWidth]);

  return (
    <div>
      <h2>DICOM Viewer</h2>
      <input type="file" accept=".dcm" onChange={handleFileInput} />

      {dicomData && (
        <div style={{ marginTop: "20px" }}>
          <div>
            <label>
              Window Center: {windowCenter}
              <input
                type="range"
                min={-1024}
                max={3071}
                value={windowCenter}
                onChange={(e) => setWindowCenter(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
          </div>
          <div>
            <label>
              Window Width: {windowWidth}
              <input
                type="range"
                min={1}
                max={4096}
                value={windowWidth}
                onChange={(e) => setWindowWidth(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ marginTop: "20px" }}></canvas>
    </div>
  );
}

export default DicomViewer;
