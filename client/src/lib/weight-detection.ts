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

function analyzePosture(keypoints: Keypoint[]): PostureAnalysis {
  // Get key body points
  const leftShoulder = keypoints[5];
  const rightShoulder = keypoints[6];
  const leftElbow = keypoints[7];
  const rightElbow = keypoints[8];
  const leftWrist = keypoints[9];
  const rightWrist = keypoints[10];
  const leftHip = keypoints[11];
  const rightHip = keypoints[12];
  
  // Calculate arm extension
  const leftArmExtended = calculateDistance(leftShoulder, leftWrist) > calculateDistance(leftShoulder, leftElbow) * 1.5;
  const rightArmExtended = calculateDistance(rightShoulder, rightWrist) > calculateDistance(rightShoulder, rightElbow) * 1.5;
  
  // Detect lifting posture
  const isLifting = (leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y) && 
                   (leftArmExtended || rightArmExtended);
  
  // Detect carrying posture
  const isCarrying = Math.abs(leftWrist.y - rightWrist.y) < 50 && // hands at similar height
                    (leftWrist.y > leftElbow.y && rightWrist.y > rightElbow.y); // hands below elbows
  
  // Analyze arm position
  let armPosition: 'extended' | 'close' | 'overhead' = 'close';
  if (leftWrist.y < leftShoulder.y - 100 || rightWrist.y < rightShoulder.y - 100) {
    armPosition = 'overhead';
  } else if (leftArmExtended || rightArmExtended) {
    armPosition = 'extended';
  }
  
  // Calculate spine deviation
  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2
  };
  const hipCenter = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2
  };
  
  const spineAngle = Math.atan2(
    shoulderCenter.x - hipCenter.x,
    hipCenter.y - shoulderCenter.y
  ) * (180 / Math.PI);
  const spineDeviation = Math.abs(spineAngle);
  
  // Determine load direction
  let loadDirection: 'front' | 'side' | 'back' = 'front';
  if (spineDeviation > 15) {
    loadDirection = spineAngle > 0 ? 'side' : 'side';
  }
  if (shoulderCenter.x < hipCenter.x) {
    loadDirection = 'back';
  }
  
  return {
    isLifting,
    isCarrying,
    armPosition,
    spineDeviation,
    loadDirection
  };
}

function calculateWeightFromPosture(posture: PostureAnalysis, keypoints: Keypoint[]): number {
  let baseWeight = 0;
  
  if (posture.isLifting) {
    // Estimate based on arm position and spine deviation
    if (posture.armPosition === 'overhead') {
      baseWeight = 5 + (posture.spineDeviation / 10); // 5-10 kg for overhead
    } else if (posture.armPosition === 'extended') {
      baseWeight = 10 + (posture.spineDeviation / 5); // 10-20 kg for extended arms
    } else {
      baseWeight = 15 + (posture.spineDeviation / 3); // 15-30 kg for close lifting
    }
  } else if (posture.isCarrying) {
    // Estimate based on spine deviation and load direction
    baseWeight = 8 + (posture.spineDeviation / 4);
    if (posture.loadDirection === 'side') {
      baseWeight *= 0.8; // Side carry typically lighter
    }
  }
  
  return Math.round(baseWeight);
}

function calculateDistance(p1: Keypoint, p2: Keypoint): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Enhanced RULA calculation with weight consideration
export function calculateWeightAdjustedRula(
  baseRulaScore: any,
  weightEstimation: WeightEstimation,
  manualWeight?: number
): any {
  if (!baseRulaScore) return null;
  
  const effectiveWeight = manualWeight || weightEstimation.estimatedWeight;
  
  // Weight adjustment factors
  let weightMultiplier = 1;
  
  if (effectiveWeight > 25) {
    weightMultiplier = 1.5; // High risk for weights > 25kg
  } else if (effectiveWeight > 10) {
    weightMultiplier = 1.3; // Moderate risk for weights > 10kg
  } else if (effectiveWeight > 5) {
    weightMultiplier = 1.1; // Slight risk for weights > 5kg
  }
  
  // Adjust individual scores
  const adjustedScore = {
    ...baseRulaScore,
    upperArm: Math.min(6, Math.round(baseRulaScore.upperArm * weightMultiplier)),
    lowerArm: Math.min(3, Math.round(baseRulaScore.lowerArm * weightMultiplier)),
    trunk: Math.min(6, Math.round(baseRulaScore.trunk * weightMultiplier)),
    effectiveWeight,
    weightMultiplier,
    isWeightBearing: effectiveWeight > 0
  };
  
  // Recalculate final scores
  adjustedScore.scoreA = getScoreA(adjustedScore.upperArm, adjustedScore.lowerArm, adjustedScore.wrist);
  adjustedScore.scoreB = getScoreB(adjustedScore.neck, adjustedScore.trunk);
  adjustedScore.finalScore = getFinalScore(adjustedScore.scoreA, adjustedScore.scoreB);
  adjustedScore.riskLevel = getRiskLevel(adjustedScore.finalScore);
  adjustedScore.stressLevel = getStressLevel(adjustedScore.finalScore);
  
  return adjustedScore;
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