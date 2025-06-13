// Weight detection and estimation utilities
interface Keypoint {
  x: number;
  y: number;
  score: number;
}

export interface WeightEstimation {
  estimatedWeight: number; // in kg
  confidence: number; // 0-1
  detectedObjects: DetectedObject[];
  bodyPosture: PostureAnalysis;
}

export interface DetectedObject {
  type: 'box' | 'bag' | 'tool' | 'unknown';
  estimatedWeight: number;
  confidence: number;
  position: { x: number; y: number; width: number; height: number };
}

export interface PostureAnalysis {
  isLifting: boolean;
  isCarrying: boolean;
  armPosition: 'extended' | 'close' | 'overhead';
  spineDeviation: number; // degrees from neutral
  loadDirection: 'front' | 'side' | 'back';
}

export function estimateWeightFromPosture(keypoints: Keypoint[]): WeightEstimation {
  const bodyPosture = analyzePosture(keypoints);
  const estimatedWeight = calculateWeightFromPosture(bodyPosture, keypoints);
  
  return {
    estimatedWeight,
    confidence: bodyPosture.isLifting || bodyPosture.isCarrying ? 0.7 : 0.3,
    detectedObjects: [], // Will be enhanced with object detection
    bodyPosture
  };
}

export function calculateWeightAdjustedRula(originalRula: any, weightEstimation: WeightEstimation, manualWeight?: number): any {
  if (!originalRula) return originalRula;
  
  const effectiveWeight = manualWeight || weightEstimation.estimatedWeight || 0;
  
  // Weight adjustment multiplier based on weight ranges
  let weightMultiplier = 1;
  if (effectiveWeight > 23) {
    weightMultiplier = 3; // Very heavy
  } else if (effectiveWeight > 10) {
    weightMultiplier = 2; // Heavy
  } else if (effectiveWeight > 5) {
    weightMultiplier = 1.5; // Moderate
  }
  
  // Apply weight adjustment to RULA score
  const adjustedFinalScore = Math.min(7, Math.ceil(originalRula.finalScore * weightMultiplier));
  
  return {
    ...originalRula,
    finalScore: adjustedFinalScore,
    effectiveWeight,
    weightMultiplier,
    riskLevel: adjustedFinalScore <= 2 ? 'Low Risk' :
               adjustedFinalScore <= 4 ? 'Medium Risk' : 
               adjustedFinalScore <= 6 ? 'High Risk' : 'Critical Risk'
  };
}

function analyzePosture(keypoints: Keypoint[]): PostureAnalysis {
  // Enhanced posture analysis for detecting external objects (not human body)
  let isLifting = false;
  let isCarrying = false;
  let armPosition: 'extended' | 'close' | 'overhead' = 'close';
  let spineDeviation = 0;
  let loadDirection: 'front' | 'side' | 'back' = 'front';
  
  if (keypoints.length >= 17) {
    // Check arm positions with more sensitivity for external object detection
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    
    if (leftShoulder && rightShoulder && leftWrist && rightWrist && leftElbow && rightElbow) {
      // More specific detection for external objects
      // Check if arms are in a carrying/holding position (bent elbows with objects)
      const leftElbowAngle = calculateElbowAngle(leftShoulder, leftElbow, leftWrist);
      const rightElbowAngle = calculateElbowAngle(rightShoulder, rightElbow, rightWrist);
      
      // Check for specific carrying postures that indicate external objects
      const leftArmBent = leftElbowAngle > 30 && leftElbowAngle < 150;
      const rightArmBent = rightElbowAngle > 30 && rightElbowAngle < 150;
      
      // Check if wrists are positioned to hold objects (not just natural arm movement)
      const leftWristForward = leftWrist.y > leftShoulder.y && Math.abs(leftWrist.x - leftShoulder.x) > 0.1;
      const rightWristForward = rightWrist.y > rightShoulder.y && Math.abs(rightWrist.x - rightShoulder.x) > 0.1;
      
      // Detect carrying only when specific conditions are met
      if ((leftArmBent && leftWristForward) || (rightArmBent && rightWristForward)) {
        isCarrying = true;
        armPosition = 'extended';
      }
      
      // Check for lifting posture (both arms engaged, specific angle patterns)
      const bothArmsEngaged = leftArmBent && rightArmBent;
      const symmetricPosture = Math.abs(leftElbowAngle - rightElbowAngle) < 30;
      
      if (bothArmsEngaged && symmetricPosture && (leftWristForward || rightWristForward)) {
        isLifting = true;
        armPosition = 'extended';
      }
      
      // Check for overhead position (clear lifting motion)
      if ((leftWrist.y < leftShoulder.y - 0.1) || (rightWrist.y < rightShoulder.y - 0.1)) {
        armPosition = 'overhead';
        isLifting = true;
      }
      
      // Analyze spine deviation
      if (leftHip && rightHip) {
        const hipCenter = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
        const shoulderCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
        spineDeviation = Math.abs(shoulderCenter.x - hipCenter.x) * 100;
      }
    }
  }
  
  return {
    isLifting,
    isCarrying,
    armPosition,
    spineDeviation,
    loadDirection
  };
}

function calculateElbowAngle(shoulder: Keypoint, elbow: Keypoint, wrist: Keypoint): number {
  const shoulderToElbow = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y };
  const elbowToWrist = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };
  
  const dot = shoulderToElbow.x * elbowToWrist.x + shoulderToElbow.y * elbowToWrist.y;
  const magA = Math.sqrt(shoulderToElbow.x ** 2 + shoulderToElbow.y ** 2);
  const magB = Math.sqrt(elbowToWrist.x ** 2 + elbowToWrist.y ** 2);
  
  const angle = Math.acos(dot / (magA * magB)) * (180 / Math.PI);
  return isNaN(angle) ? 90 : angle;
}

function calculateWeightFromPosture(bodyPosture: PostureAnalysis, keypoints: Keypoint[]): number {
  // Conservative weight estimation only for confirmed external objects
  let baseWeight = 0;
  
  // Only estimate weight when we have clear indicators of external objects
  if (bodyPosture.isLifting && bodyPosture.armPosition === 'extended') {
    baseWeight = 10; // Confirmed lifting with extended arms
  } else if (bodyPosture.isCarrying && bodyPosture.armPosition === 'extended') {
    baseWeight = 7; // Confirmed carrying with extended arms
  } else if (bodyPosture.armPosition === 'overhead') {
    baseWeight = 12; // Overhead lifting usually involves objects
  }
  
  // Additional checks for object-specific postures
  if (keypoints.length >= 17 && baseWeight > 0) {
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    
    if (leftShoulder && rightShoulder && leftElbow && rightElbow && leftWrist && rightWrist) {
      // Check for asymmetric loading (indicates external object)
      const leftElbowAngle = calculateElbowAngle(leftShoulder, leftElbow, leftWrist);
      const rightElbowAngle = calculateElbowAngle(rightShoulder, rightElbow, rightWrist);
      const asymmetry = Math.abs(leftElbowAngle - rightElbowAngle);
      
      if (asymmetry > 30) {
        baseWeight += 3; // Asymmetric posture suggests external load
      }
      
      // Check for forward lean (indicates heavier objects)
      const shoulderCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
      const wristCenter = { x: (leftWrist.x + rightWrist.x) / 2, y: (leftWrist.y + rightWrist.y) / 2 };
      
      if (wristCenter.y > shoulderCenter.y + 0.15) {
        baseWeight += 5; // Forward lean with extended arms
      }
    }
  }
  
  return baseWeight;
}



// RULA scoring tables (copied from original calculator)
function getScoreA(upperArm: number, lowerArm: number, wrist: number): number {
  const scoreATable = [
    [[1,2,2,2,2,3,3,3], [2,2,2,2,3,3,3,3], [2,3,3,3,3,3,4,4]],
    [[2,2,2,2,3,3,3,3], [2,2,2,2,3,3,3,3], [3,3,3,3,3,4,4,4]],
    [[2,3,3,3,3,4,4,4], [3,3,3,3,3,4,4,4], [3,4,4,4,4,4,5,5]],
    [[3,3,3,4,4,4,5,5], [3,3,4,4,4,4,5,5], [4,4,4,4,5,5,5,6]],
    [[4,4,4,4,4,5,5,5], [4,4,4,4,4,5,5,5], [4,4,4,5,5,5,6,6]],
    [[6,6,6,6,6,7,7,7], [6,6,6,6,6,7,7,7], [6,6,7,7,7,7,7,8]]
  ];
  
  const upperArmIdx = Math.max(0, Math.min(5, upperArm - 1));
  const lowerArmIdx = Math.max(0, Math.min(2, lowerArm - 1));
  const wristIdx = Math.max(0, Math.min(7, wrist - 1));
  
  return scoreATable[upperArmIdx][lowerArmIdx][wristIdx];
}

function getScoreB(neck: number, trunk: number): number {
  const scoreBTable = [
    [1,2,3,3,4,5],
    [2,2,3,4,5,5],
    [3,3,3,4,5,6],
    [3,3,4,4,5,6],
    [4,5,5,5,6,7],
    [4,5,5,6,6,7]
  ];
  
  const neckIdx = Math.max(0, Math.min(5, neck - 1));
  const trunkIdx = Math.max(0, Math.min(5, trunk - 1));
  
  return scoreBTable[neckIdx][trunkIdx];
}

function getFinalScore(scoreA: number, scoreB: number): number {
  const finalScoreTable = [
    [1,1,1,2,3,3,4],
    [1,2,2,3,3,3,4],
    [2,2,2,3,3,3,4],
    [3,3,3,3,3,4,4],
    [4,4,4,4,4,4,5],
    [4,4,4,4,4,4,5],
    [5,5,5,5,5,5,6],
    [5,5,5,5,5,6,6]
  ];
  
  const scoreAIdx = Math.max(0, Math.min(7, scoreA - 1));
  const scoreBIdx = Math.max(0, Math.min(6, scoreB - 1));
  
  return finalScoreTable[scoreAIdx][scoreBIdx];
}

function getRiskLevel(finalScore: number): string {
  if (finalScore <= 2) return "Acceptable";
  if (finalScore <= 4) return "Investigate";
  if (finalScore <= 6) return "Investigate Soon";
  return "Investigate Immediately";
}

function getStressLevel(finalScore: number): number {
  return finalScore;
}