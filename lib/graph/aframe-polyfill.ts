// Polyfill AFRAME to prevent errors (react-force-graph imports 3d-force-graph-vr which needs AFRAME)
// We only use ForceGraph2D, but the library still imports the 3D/VR version
// This must be imported BEFORE react-force-graph to ensure AFRAME exists when the module loads

// Execute immediately when this module is loaded
(function setupAFRAME() {
  if (typeof window !== 'undefined' && typeof (window as any).AFRAME === 'undefined') {
    (window as any).AFRAME = {
      registerComponent: () => {},
      components: {},
      geometries: {},
      materials: {},
      primitives: {},
      scenes: [],
      utils: {},
      version: '1.0.0',
    };
  }
})();

