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
  // Enhanced posture analysis for better object detection
  let isLifting = false;
  let isCarrying = false;
  let armPosition: 'extended' | 'close' | 'overhead' = 'close';
  let spineDeviation = 0;
  let loadDirection: 'front' | 'side' | 'back' = 'front';
  
  if (keypoints.length >= 17) {
    // Check arm positions with more sensitivity
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    
    if (leftShoulder && rightShoulder && leftWrist && rightWrist) {
      // Calculate arm extension (more sensitive)
      const leftArmExtension = Math.abs(leftWrist.y - leftShoulder.y);
      const rightArmExtension = Math.abs(rightWrist.y - rightShoulder.y);
      const avgArmExtension = (leftArmExtension + rightArmExtension) / 2;
      
      // Check for arm spread (carrying detection)
      const leftArmSpread = Math.abs(leftWrist.x - leftShoulder.x);
      const rightArmSpread = Math.abs(rightWrist.x - rightShoulder.x);
      const avgArmSpread = (leftArmSpread + rightArmSpread) / 2;
      
      // More sensitive thresholds
      if (avgArmExtension > 0.2 || avgArmSpread > 0.25) {
        isLifting = true;
        armPosition = 'extended';
      }
      
      // Check for carrying posture (arms bent, holding objects)
      if (leftElbow && rightElbow) {
        const leftElbowBend = Math.abs(leftElbow.y - leftShoulder.y) - Math.abs(leftWrist.y - leftElbow.y);
        const rightElbowBend = Math.abs(rightElbow.y - rightShoulder.y) - Math.abs(rightWrist.y - rightElbow.y);
        
        if ((leftElbowBend > 0.1 || rightElbowBend > 0.1) && (avgArmSpread > 0.15)) {
          isCarrying = true;
        }
      }
      
      // Check for overhead position
      if (leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y) {
        armPosition = 'overhead';
        isLifting = true;
      }
      
      // Analyze spine deviation
      if (leftHip && rightHip) {
        const hipCenter = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
        const shoulderCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
        spineDeviation = Math.abs(shoulderCenter.x - hipCenter.x) * 100; // Convert to degrees approximation
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
  // Enhanced weight estimation based on posture and arm positions
  let baseWeight = 0;
  
  if (bodyPosture.isLifting) {
    baseWeight = 8; // Base weight when lifting detected
  }
  
  if (bodyPosture.isCarrying) {
    baseWeight = Math.max(baseWeight, 6);
  }
  
  // Check arm extension patterns more sensitively
  if (keypoints.length >= 11) {
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    
    if (leftShoulder && rightShoulder && leftWrist && rightWrist) {
      // Calculate arm extension
      const leftArmExtension = Math.abs(leftWrist.y - leftShoulder.y);
      const rightArmExtension = Math.abs(rightWrist.y - rightShoulder.y);
      const avgExtension = (leftArmExtension + rightArmExtension) / 2;
      
      // More sensitive detection
      if (avgExtension > 0.15) {
        baseWeight += 6;
      }
      
      // Check for carrying position (arms away from body)
      const leftArmSpread = Math.abs(leftWrist.x - leftShoulder.x);
      const rightArmSpread = Math.abs(rightWrist.x - rightShoulder.x);
      const avgSpread = (leftArmSpread + rightArmSpread) / 2;
      
      if (avgSpread > 0.2) {
        baseWeight += 4;
      }
    }
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