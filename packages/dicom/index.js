import * as dicomParser from "dicom-parser";

/**
 * Parses a DICOM file and returns the dataset.
 * @param {File} file - The DICOM file to parse.
 * @returns {Promise<Object>} - The parsed DICOM dataset.
 */
export function parseDicomFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (event) {
      const arrayBuffer = event.target.result;
      const byteArray = new Uint8Array(arrayBuffer);
      try {
        const dataSet = dicomParser.parseDicom(byteArray);
        resolve(dataSet);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function () {
      reject(reader.error);
    };

    reader.readAsArrayBuffer(file);
  });
}
