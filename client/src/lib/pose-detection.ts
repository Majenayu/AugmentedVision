// TensorFlow.js pose detection utilities
declare global {
  interface Window {
    poseDetection: any;
    tf: any;
  }
}

export async function initializePoseDetection() {
  try {
    // Wait for TensorFlow.js to load
    while (!window.tf) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Wait for pose detection library to load
    while (!window.poseDetection) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log("Initializing TensorFlow.js backend...");
    
    // Set up TensorFlow.js backend with fallbacks
    try {
      // Try WebGL backend first (most compatible)
      await window.tf.setBackend('webgl');
      console.log("Using WebGL backend");
    } catch (webglError) {
      console.warn("WebGL backend failed, trying CPU backend:", webglError);
      try {
        await window.tf.setBackend('cpu');
        console.log("Using CPU backend");
      } catch (cpuError) {
        console.error("All backends failed:", cpuError);
        throw new Error("No compatible TensorFlow.js backend available");
      }
    }

    // Wait for backend to be ready
    await window.tf.ready();
    console.log("TensorFlow.js backend ready");

    console.log("Initializing pose detection model...");
    
    const model = window.poseDetection.SupportedModels.MoveNet;
    const detectorConfig = {
      modelType: window.poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      enableSmoothing: true,
      multiPoseMaxDimension: 512,
      enableTracking: true,
      trackerType: window.poseDetection.TrackerType.BoundingBox
    };
    
    const detector = await window.poseDetection.createDetector(model, detectorConfig);
    console.log("Pose detection model initialized successfully");
    
    return detector;
  } catch (error) {
    console.error("Failed to initialize pose detection:", error);
    throw error;
  }
}

export async function detectPose(detector: any, video: HTMLVideoElement) {
  try {
    if (!detector || !video || video.readyState < 2) {
      return null;
    }

    const poses = await detector.estimatePoses(video);
    return poses;
  } catch (error) {
    console.error("Error detecting pose:", error);
    return null;
  }
}

// MoveNet keypoint indices
export const KEYPOINT_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4], // Head
  [5, 6], // Shoulders  
  [5, 7], [7, 9], // Left arm
  [6, 8], [8, 10], // Right arm
  [5, 11], [6, 12], // Torso
  [11, 12], // Hips
  [11, 13], [13, 15], // Left leg
  [12, 14], [14, 16] // Right leg
];

export const KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];
