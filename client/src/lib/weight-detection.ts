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
  // Basic posture analysis - can be enhanced
  let isLifting = false;
  let isCarrying = false;
  let armPosition: 'extended' | 'close' | 'overhead' = 'close';
  let spineDeviation = 0;
  let loadDirection: 'front' | 'side' | 'back' = 'front';
  
  if (keypoints.length >= 17) {
    // Check arm positions
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    
    if (leftShoulder && rightShoulder && leftWrist && rightWrist) {
      const armExtension = Math.abs(leftWrist.y - leftShoulder.y) + Math.abs(rightWrist.y - rightShoulder.y);
      
      if (armExtension > 0.3) {
        isLifting = true;
        armPosition = 'extended';
      }
      
      if (leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y) {
        armPosition = 'overhead';
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

function calculateWeightFromPosture(bodyPosture: PostureAnalysis, keypoints: Keypoint[]): number {
  // Simple weight estimation based on posture
  let baseWeight = 0;
  
  if (bodyPosture.isLifting) {
    baseWeight = 10; // Assume 10kg base weight when lifting detected
  }
  
  if (bodyPosture.armPosition === 'extended') {
    baseWeight += 5;
  }
  
  if (bodyPosture.armPosition === 'overhead') {
    baseWeight += 8;
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