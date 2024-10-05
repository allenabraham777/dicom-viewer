// apps/viewer-app/src/App.jsx

import React from "react";
import DicomViewer from "./DicomViewer";

function App() {
  return (
    <div className="App">
      <h1>Medical Image Viewer</h1>
      <DicomViewer />
    </div>
  );
}

export default App;
