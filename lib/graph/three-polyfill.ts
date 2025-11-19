// Polyfill THREE.js to prevent errors (react-force-graph imports 3d-force-graph-vr which needs THREE.js)
// We only use ForceGraph2D, but the library still imports the 3D/VR version
// This must be imported BEFORE react-force-graph to ensure THREE exists when the module loads

// Execute immediately when this module is loaded
(function setupTHREE() {
    if (typeof window !== 'undefined' && typeof (window as any).THREE === 'undefined') {
      // Create a more complete THREE.js mock
      const createMockClass = () => {
        const MockClass: any = function() {};
        MockClass.prototype = {};
        return MockClass;
      };
      
      (window as any).THREE = {
        // Core classes
        Object3D: createMockClass(),
        Scene: createMockClass(),
        Camera: createMockClass(),
        WebGLRenderer: createMockClass(),
        Group: createMockClass(),
        
        // Math/Geometry classes
        Vector2: createMockClass(),
        Vector3: createMockClass(),
        Vector4: createMockClass(),
        Quaternion: createMockClass(),
        Euler: createMockClass(),
        Matrix3: createMockClass(),
        Matrix4: createMockClass(),
        Raycaster: createMockClass(),
        Box3: createMockClass(),
        Sphere: createMockClass(),
        Plane: createMockClass(),
        Color: createMockClass(),
        
        // Geometry classes
        Geometry: createMockClass(),
        BufferGeometry: createMockClass(),
        PlaneGeometry: createMockClass(),
        BoxGeometry: createMockClass(),
        SphereGeometry: createMockClass(),
        CylinderGeometry: createMockClass(),
        ConeGeometry: createMockClass(),
        TorusGeometry: createMockClass(),
        RingGeometry: createMockClass(),
        TorusKnotGeometry: createMockClass(),
        
        // Material classes
        Material: createMockClass(),
        MeshBasicMaterial: createMockClass(),
        MeshStandardMaterial: createMockClass(),
        LineBasicMaterial: createMockClass(),
        LineDashedMaterial: createMockClass(),
        PointsMaterial: createMockClass(),
        SpriteMaterial: createMockClass(),
        
        // Mesh and object classes
        Mesh: createMockClass(),
        Line: createMockClass(),
        LineSegments: createMockClass(),
        Points: createMockClass(),
        Sprite: createMockClass(),
        
        // Camera classes
        PerspectiveCamera: createMockClass(),
        OrthographicCamera: createMockClass(),
        
        // Light classes
        AmbientLight: createMockClass(),
        DirectionalLight: createMockClass(),
        PointLight: createMockClass(),
        SpotLight: createMockClass(),
        
        // Control classes
        OrbitControls: createMockClass(),
        TrackballControls: createMockClass(),
        
        // Texture and loader classes
        Texture: createMockClass(),
        TextureLoader: createMockClass(),
        ImageLoader: createMockClass(),
        LoadingManager: createMockClass(),
        GLTFLoader: createMockClass(),
        OBJLoader: createMockClass(),
        FBXLoader: createMockClass(),
        
        // Common constants - Side
        DoubleSide: 2,
        FrontSide: 0,
        BackSide: 1,
        
        // Wrapping constants
        RepeatWrapping: 1000,
        ClampToEdgeWrapping: 1001,
        MirroredRepeatWrapping: 1002,
        
        // Filter constants
        LinearFilter: 1006,
        NearestFilter: 1004,
        NearestMipmapNearestFilter: 1008,
        NearestMipmapLinearFilter: 1009,
        LinearMipmapNearestFilter: 1010,
        LinearMipmapLinearFilter: 1011,
        
        // Format constants
        RGBAFormat: 1023,
        RGBFormat: 1022,
        AlphaFormat: 1021,
        LuminanceFormat: 1024,
        LuminanceAlphaFormat: 1025,
        
        // Type constants
        UnsignedByteType: 1001,
        ByteType: 1000,
        ShortType: 1002,
        UnsignedShortType: 1003,
        IntType: 1004,
        UnsignedIntType: 1005,
        FloatType: 1015,
        HalfFloatType: 1016,
        
        // Common methods that might be called
        Math: {
          degToRad: (deg: number) => deg * (Math.PI / 180),
          radToDeg: (rad: number) => rad * (180 / Math.PI),
          clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
          lerp: (x: number, y: number, t: number) => x + (y - x) * t,
        },
      };
    }
  })();