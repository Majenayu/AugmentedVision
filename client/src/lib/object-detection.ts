import * as tf from '@tensorflow/tfjs';

// Common objects that people typically hold or carry with estimated weights
export const DETECTABLE_OBJECTS = {
  // Tools and equipment
  'hammer': { category: 'tools', estimatedWeight: 500, unit: 'g', icon: '🔨' },
  'wrench': { category: 'tools', estimatedWeight: 300, unit: 'g', icon: '🔧' },
  'screwdriver': { category: 'tools', estimatedWeight: 150, unit: 'g', icon: '🪛' },
  'drill': { category: 'tools', estimatedWeight: 1500, unit: 'g', icon: '🪚' },
  'saw': { category: 'tools', estimatedWeight: 800, unit: 'g', icon: '🪚' },
  'scissors': { category: 'tools', estimatedWeight: 100, unit: 'g', icon: '✂️' },
  'knife': { category: 'tools', estimatedWeight: 150, unit: 'g', icon: '🔪' },
  
  // Containers and boxes
  'box': { category: 'containers', estimatedWeight: 200, unit: 'g', icon: '📦' },
  'suitcase': { category: 'containers', estimatedWeight: 2000, unit: 'g', icon: '🧳' },
  'bag': { category: 'containers', estimatedWeight: 500, unit: 'g', icon: '🎒' },
  'backpack': { category: 'containers', estimatedWeight: 800, unit: 'g', icon: '🎒' },
  'handbag': { category: 'containers', estimatedWeight: 600, unit: 'g', icon: '👜' },
  
  // Electronics
  'laptop': { category: 'electronics', estimatedWeight: 2000, unit: 'g', icon: '💻' },
  'phone': { category: 'electronics', estimatedWeight: 200, unit: 'g', icon: '📱' },
  'cell phone': { category: 'electronics', estimatedWeight: 200, unit: 'g', icon: '📱' },
  'mobile phone': { category: 'electronics', estimatedWeight: 200, unit: 'g', icon: '📱' },
  'tablet': { category: 'electronics', estimatedWeight: 600, unit: 'g', icon: '📱' },
  'remote': { category: 'electronics', estimatedWeight: 150, unit: 'g', icon: '📺' },
  'mouse': { category: 'electronics', estimatedWeight: 100, unit: 'g', icon: '🖱️' },
  'keyboard': { category: 'electronics', estimatedWeight: 800, unit: 'g', icon: '⌨️' },
  
  // Books and documents
  'book': { category: 'office', estimatedWeight: 400, unit: 'g', icon: '📚' },
  'paper': { category: 'office', estimatedWeight: 50, unit: 'g', icon: '📄' },
  'clipboard': { category: 'office', estimatedWeight: 300, unit: 'g', icon: '📋' },
  
  // Sports equipment
  'dumbbell': { category: 'fitness', estimatedWeight: 5000, unit: 'g', icon: '🏋️' },
  'ball': { category: 'sports', estimatedWeight: 400, unit: 'g', icon: '⚽' },
  'sports ball': { category: 'sports', estimatedWeight: 400, unit: 'g', icon: '⚽' },
  'baseball': { category: 'sports', estimatedWeight: 150, unit: 'g', icon: '⚾' },
  'tennis racket': { category: 'sports', estimatedWeight: 300, unit: 'g', icon: '🎾' },
  
  // Kitchen items
  'bottle': { category: 'containers', estimatedWeight: 500, unit: 'g', icon: '🍼' },
  'wine bottle': { category: 'containers', estimatedWeight: 1000, unit: 'g', icon: '🍷' },
  'cup': { category: 'containers', estimatedWeight: 200, unit: 'g', icon: '☕' },
  'mug': { category: 'containers', estimatedWeight: 300, unit: 'g', icon: '☕' },
  'bowl': { category: 'containers', estimatedWeight: 250, unit: 'g', icon: '🥣' },
  'fork': { category: 'utensils', estimatedWeight: 50, unit: 'g', icon: '🍴' },
  'spoon': { category: 'utensils', estimatedWeight: 40, unit: 'g', icon: '🥄' },
  'banana': { category: 'food', estimatedWeight: 120, unit: 'g', icon: '🍌' },
  'apple': { category: 'food', estimatedWeight: 180, unit: 'g', icon: '🍎' },
  'orange': { category: 'food', estimatedWeight: 150, unit: 'g', icon: '🍊' },
  'sandwich': { category: 'food', estimatedWeight: 200, unit: 'g', icon: '🥪' },
  
  // General items
  'umbrella': { category: 'accessories', estimatedWeight: 300, unit: 'g', icon: '☂️' },
  'keys': { category: 'accessories', estimatedWeight: 100, unit: 'g', icon: '🔑' },
  'glasses': { category: 'accessories', estimatedWeight: 50, unit: 'g', icon: '👓' },
  'watch': { category: 'accessories', estimatedWeight: 80, unit: 'g', icon: '⌚' },
  'pen': { category: 'office', estimatedWeight: 20, unit: 'g', icon: '✏️' },
  'pencil': { category: 'office', estimatedWeight: 10, unit: 'g', icon: '✏️' },
  'flashlight': { category: 'tools', estimatedWeight: 200, unit: 'g', icon: '🔦' },
  'wallet': { category: 'accessories', estimatedWeight: 150, unit: 'g', icon: '💼' },
  'purse': { category: 'accessories', estimatedWeight: 400, unit: 'g', icon: '👛' },
  
  // Workplace items
  'stapler': { category: 'office', estimatedWeight: 300, unit: 'g', icon: '📎' },
  'calculator': { category: 'office', estimatedWeight: 150, unit: 'g', icon: '🧮' },
  'ruler': { category: 'office', estimatedWeight: 50, unit: 'g', icon: '📏' },
  'folder': { category: 'office', estimatedWeight: 100, unit: 'g', icon: '📁' },
  'binder': { category: 'office', estimatedWeight: 500, unit: 'g', icon: '📂' }
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
      .filter(prediction => {
        // Lower confidence threshold to catch more objects
        if (prediction.score < 0.3) return false;
        
        // Only exclude objects that are definitely not handheld
        const className = prediction.class.toLowerCase();
        const excludedObjects = [
          'person', 'car', 'bus', 'truck', 'boat', 'airplane', 'motorcycle', 
          'bicycle', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant',
          'bear', 'zebra', 'giraffe'
        ];
        
        return !excludedObjects.includes(className);
      })
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
        // Very permissive size filtering for handheld objects
        const [x, y, width, height] = obj.bbox;
        const frameWidth = element.width || (element as HTMLImageElement).naturalWidth || 640;
        const frameHeight = element.height || (element as HTMLImageElement).naturalHeight || 480;
        
        // Basic size validation - objects must be at least 10x10 pixels
        if (width < 10 || height < 10) return false;
        
        const objectArea = width * height;
        const frameArea = frameWidth * frameHeight;
        const sizeRatio = objectArea / frameArea;
        
        // Allow very large objects - increase threshold to 70%
        if (sizeRatio > 0.7) return false;
        
        // Very permissive aspect ratio filtering
        const aspectRatio = width / height;
        if (aspectRatio > 10 || aspectRatio < 0.05) return false;
        
        // Accept all objects that pass basic filtering
        return true;
      })
      .sort((a, b) => b.confidence - a.confidence) // Sort by confidence
      .slice(0, 10); // Limit to top 10 most confident detections

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

  // Get key body points
  const leftWrist = poseKeypoints[9];
  const rightWrist = poseKeypoints[10];
  const leftElbow = poseKeypoints[7];
  const rightElbow = poseKeypoints[8];
  const leftShoulder = poseKeypoints[5];
  const rightShoulder = poseKeypoints[6];

  const heldObjects: DetectedObject[] = [];

  detectedObjects.forEach(obj => {
    const [objX, objY, objWidth, objHeight] = obj.bbox;
    const objCenterX = objX + objWidth / 2;
    const objCenterY = objY + objHeight / 2;

    // Enhanced proximity analysis with multiple criteria
    let isHeldObject = false;
    let confidenceScore = 0;

    // Check proximity to hands/wrists with tighter thresholds
    const handProximityThreshold = 60; // Reduced for tighter detection
    
    // Left hand analysis
    if (leftWrist?.score > 0.4 && leftElbow?.score > 0.4) {
      const leftWristX = leftWrist.x * frameWidth;
      const leftWristY = leftWrist.y * frameHeight;
      const leftElbowX = leftElbow.x * frameWidth;
      const leftElbowY = leftElbow.y * frameHeight;
      
      const distanceToLeftWrist = Math.sqrt(
        Math.pow(objCenterX - leftWristX, 2) + Math.pow(objCenterY - leftWristY, 2)
      );
      
      // Check if object is in the forearm area (between wrist and elbow)
      const distanceToLeftElbow = Math.sqrt(
        Math.pow(objCenterX - leftElbowX, 2) + Math.pow(objCenterY - leftElbowY, 2)
      );
      
      if (distanceToLeftWrist < handProximityThreshold) {
        confidenceScore += 0.4;
      }
      
      // Object between wrist and elbow indicates holding
      if (distanceToLeftWrist < handProximityThreshold * 1.5 && 
          distanceToLeftElbow < handProximityThreshold * 2) {
        confidenceScore += 0.3;
      }
    }

    // Right hand analysis
    if (rightWrist?.score > 0.4 && rightElbow?.score > 0.4) {
      const rightWristX = rightWrist.x * frameWidth;
      const rightWristY = rightWrist.y * frameHeight;
      const rightElbowX = rightElbow.x * frameWidth;
      const rightElbowY = rightElbow.y * frameHeight;
      
      const distanceToRightWrist = Math.sqrt(
        Math.pow(objCenterX - rightWristX, 2) + Math.pow(objCenterY - rightWristY, 2)
      );
      
      const distanceToRightElbow = Math.sqrt(
        Math.pow(objCenterX - rightElbowX, 2) + Math.pow(objCenterY - rightElbowY, 2)
      );
      
      if (distanceToRightWrist < handProximityThreshold) {
        confidenceScore += 0.4;
      }
      
      if (distanceToRightWrist < handProximityThreshold * 1.5 && 
          distanceToRightElbow < handProximityThreshold * 2) {
        confidenceScore += 0.3;
      }
    }

    // Check for two-handed objects (between both hands)
    if (leftWrist?.score > 0.4 && rightWrist?.score > 0.4) {
      const leftWristX = leftWrist.x * frameWidth;
      const leftWristY = leftWrist.y * frameHeight;
      const rightWristX = rightWrist.x * frameWidth;
      const rightWristY = rightWrist.y * frameHeight;
      
      const midpointX = (leftWristX + rightWristX) / 2;
      const midpointY = (leftWristY + rightWristY) / 2;
      
      const distanceToMidpoint = Math.sqrt(
        Math.pow(objCenterX - midpointX, 2) + Math.pow(objCenterY - midpointY, 2)
      );
      
      if (distanceToMidpoint < handProximityThreshold * 1.2) {
        confidenceScore += 0.5;
      }
    }

    // Filter out objects that are too large to be handheld
    const objectArea = objWidth * objHeight;
    const frameArea = frameWidth * frameHeight;
    const objectSizeRatio = objectArea / frameArea;
    
    // If object takes up more than 25% of frame, it's likely not handheld
    if (objectSizeRatio > 0.25) {
      confidenceScore *= 0.3;
    }

    // Filter out objects that are too far from torso (background objects)
    if (leftShoulder?.score > 0.4 && rightShoulder?.score > 0.4) {
      const torsoX = (leftShoulder.x + rightShoulder.x) * frameWidth / 2;
      const torsoY = (leftShoulder.y + rightShoulder.y) * frameHeight / 2;
      
      const distanceFromTorso = Math.sqrt(
        Math.pow(objCenterX - torsoX, 2) + Math.pow(objCenterY - torsoY, 2)
      );
      
      // Objects too far from torso are likely background objects
      if (distanceFromTorso > frameWidth * 0.4) {
        confidenceScore *= 0.2;
      }
    }

    // Object position validation (should be in front of person, not behind)
    if (leftWrist?.score > 0.4 && rightWrist?.score > 0.4 && 
        leftShoulder?.score > 0.4 && rightShoulder?.score > 0.4) {
      
      const avgWristY = (leftWrist.y + rightWrist.y) * frameHeight / 2;
      const avgShoulderY = (leftShoulder.y + rightShoulder.y) * frameHeight / 2;
      
      // Object should generally be below shoulders and near wrist level
      if (objCenterY > avgShoulderY && Math.abs(objCenterY - avgWristY) < frameHeight * 0.3) {
        confidenceScore += 0.2;
      }
    }

    // Final decision based on confidence score
    if (confidenceScore > 0.5) {
      isHeldObject = true;
    }

    if (isHeldObject) {
      heldObjects.push({
        ...obj,
        confidence: Math.min(obj.confidence * confidenceScore, 1.0) // Adjust confidence
      });
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
  return detectedObjects.map((obj, index) => ({
    name: `Object ${index + 1}`,
    weight: obj.estimatedWeight,
    icon: '📦',
    confidence: Math.round(obj.confidence * 100)
  }));
}