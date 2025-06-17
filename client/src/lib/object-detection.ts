import * as tf from '@tensorflow/tfjs';

// Common objects that people typically hold or carry with estimated weights
export const DETECTABLE_OBJECTS = {
  // Tools and equipment
  'hammer': { category: 'tools', estimatedWeight: 500, unit: 'g', icon: '🔨' },
  'wrench': { category: 'tools', estimatedWeight: 300, unit: 'g', icon: '🔧' },
  'screwdriver': { category: 'tools', estimatedWeight: 150, unit: 'g', icon: '🪛' },
  'drill': { category: 'tools', estimatedWeight: 1500, unit: 'g', icon: '🪚' },
  'saw': { category: 'tools', estimatedWeight: 800, unit: 'g', icon: '🪚' },
  
  // Containers and boxes
  'box': { category: 'containers', estimatedWeight: 200, unit: 'g', icon: '📦' },
  'suitcase': { category: 'containers', estimatedWeight: 2000, unit: 'g', icon: '🧳' },
  'bag': { category: 'containers', estimatedWeight: 500, unit: 'g', icon: '🎒' },
  'backpack': { category: 'containers', estimatedWeight: 800, unit: 'g', icon: '🎒' },
  
  // Electronics
  'laptop': { category: 'electronics', estimatedWeight: 2000, unit: 'g', icon: '💻' },
  'phone': { category: 'electronics', estimatedWeight: 200, unit: 'g', icon: '📱' },
  'tablet': { category: 'electronics', estimatedWeight: 600, unit: 'g', icon: '📱' },
  
  // Books and documents
  'book': { category: 'office', estimatedWeight: 400, unit: 'g', icon: '📚' },
  
  // Sports equipment
  'dumbbell': { category: 'fitness', estimatedWeight: 5000, unit: 'g', icon: '🏋️' },
  'ball': { category: 'sports', estimatedWeight: 400, unit: 'g', icon: '⚽' },
  
  // Kitchen items
  'bottle': { category: 'containers', estimatedWeight: 500, unit: 'g', icon: '🍼' },
  'cup': { category: 'containers', estimatedWeight: 200, unit: 'g', icon: '☕' },
  
  // General items
  'chair': { category: 'furniture', estimatedWeight: 5000, unit: 'g', icon: '🪑' },
  'umbrella': { category: 'accessories', estimatedWeight: 300, unit: 'g', icon: '☂️' }
};

export interface DetectedObject {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  estimatedWeight: number;
  category: string;
  icon: string;
}

interface ObjectDetector {
  detect: (img: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<any[]>;
}

let objectDetector: ObjectDetector | null = null;

// Initialize COCO-SSD object detection model
export async function initializeObjectDetection(): Promise<void> {
  try {
    console.log('Loading object detection model...');
    
    // Load TensorFlow.js COCO-SSD model
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    objectDetector = await cocoSsd.load();
    
    console.log('Object detection model loaded successfully');
  } catch (error) {
    console.error('Failed to load object detection model:', error);
    throw error;
  }
}

// Detect objects in the video frame or image data
export async function detectObjects(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | string
): Promise<DetectedObject[]> {
  if (!objectDetector) {
    throw new Error('Object detection model not initialized');
  }

  try {
    let element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

    // Handle base64 image data (from recorded frames)
    if (typeof input === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = input;
      });
      
      element = img;
    } else {
      element = input;
    }

    const predictions = await objectDetector.detect(element);
    
    const detectedObjects: DetectedObject[] = predictions
      .filter(prediction => prediction.score > 0.4) // Lower threshold for recorded frames
      .map(prediction => {
        const className = prediction.class.toLowerCase();
        const objectInfo = DETECTABLE_OBJECTS[className as keyof typeof DETECTABLE_OBJECTS];
        
        return {
          class: prediction.class,
          confidence: prediction.score,
          bbox: prediction.bbox,
          estimatedWeight: objectInfo?.estimatedWeight || 500, // Default 500g if unknown
          category: objectInfo?.category || 'unknown',
          icon: objectInfo?.icon || '📦'
        };
      })
      .filter(obj => {
        // Filter for objects that are typically held or carried
        const handHeldCategories = ['tools', 'containers', 'electronics', 'office', 'fitness', 'sports', 'accessories'];
        return handHeldCategories.includes(obj.category) || obj.category === 'unknown';
      });

    return detectedObjects;
  } catch (error) {
    console.error('Object detection failed:', error);
    return [];
  }
}

// Detect objects from base64 image data (for recorded frames)
export async function detectObjectsFromImageData(imageData: string): Promise<DetectedObject[]> {
  return detectObjects(imageData);
}

// Analyze frame for objects and pose to determine if person is holding something
export function analyzeObjectInteraction(
  detectedObjects: DetectedObject[],
  poseKeypoints: any[],
  frameWidth: number,
  frameHeight: number
): { isHoldingObject: boolean; heldObjects: DetectedObject[]; totalEstimatedWeight: number } {
  if (!poseKeypoints || poseKeypoints.length === 0) {
    return { isHoldingObject: false, heldObjects: [], totalEstimatedWeight: 0 };
  }

  // Get hand and wrist positions (keypoints 9, 10 are left/right wrists)
  const leftWrist = poseKeypoints[9];
  const rightWrist = poseKeypoints[10];
  const leftElbow = poseKeypoints[7];
  const rightElbow = poseKeypoints[8];

  const heldObjects: DetectedObject[] = [];

  detectedObjects.forEach(obj => {
    const [objX, objY, objWidth, objHeight] = obj.bbox;
    const objCenterX = objX + objWidth / 2;
    const objCenterY = objY + objHeight / 2;

    // Check if object is near hands/wrists
    const proximityThreshold = 80; // pixels
    
    let isNearHand = false;

    // Check left hand
    if (leftWrist?.score > 0.3) {
      const leftWristX = leftWrist.x * frameWidth;
      const leftWristY = leftWrist.y * frameHeight;
      const distanceToLeftHand = Math.sqrt(
        Math.pow(objCenterX - leftWristX, 2) + Math.pow(objCenterY - leftWristY, 2)
      );
      if (distanceToLeftHand < proximityThreshold) {
        isNearHand = true;
      }
    }

    // Check right hand
    if (rightWrist?.score > 0.3) {
      const rightWristX = rightWrist.x * frameWidth;
      const rightWristY = rightWrist.y * frameHeight;
      const distanceToRightHand = Math.sqrt(
        Math.pow(objCenterX - rightWristX, 2) + Math.pow(objCenterY - rightWristY, 2)
      );
      if (distanceToRightHand < proximityThreshold) {
        isNearHand = true;
      }
    }

    // Also check if object is between hands and torso (carrying)
    if (leftElbow?.score > 0.3 && rightElbow?.score > 0.3) {
      const torsoX = (leftElbow.x + rightElbow.x) * frameWidth / 2;
      const torsoY = (leftElbow.y + rightElbow.y) * frameHeight / 2;
      const distanceToTorso = Math.sqrt(
        Math.pow(objCenterX - torsoX, 2) + Math.pow(objCenterY - torsoY, 2)
      );
      if (distanceToTorso < proximityThreshold * 1.5) {
        isNearHand = true;
      }
    }

    if (isNearHand) {
      heldObjects.push(obj);
    }
  });

  const totalEstimatedWeight = heldObjects.reduce((sum, obj) => sum + obj.estimatedWeight, 0);

  return {
    isHoldingObject: heldObjects.length > 0,
    heldObjects,
    totalEstimatedWeight
  };
}

// Get weight suggestions based on detected objects
export function getWeightSuggestions(detectedObjects: DetectedObject[]): Array<{
  name: string;
  weight: number;
  icon: string;
  confidence: number;
}> {
  return detectedObjects.map(obj => ({
    name: obj.class,
    weight: obj.estimatedWeight,
    icon: obj.icon,
    confidence: Math.round(obj.confidence * 100)
  }));
}