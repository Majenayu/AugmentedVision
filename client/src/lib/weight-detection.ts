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
  // Enhanced posture analysis for detecting only grabbed/held objects (not environment objects)
  let isLifting = false;
  let isCarrying = false;
  let armPosition: 'extended' | 'close' | 'overhead' = 'close';
  let spineDeviation = 0;
  let loadDirection: 'front' | 'side' | 'back' = 'front';
  
  if (keypoints.length >= 17) {
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    
    if (leftShoulder && rightShoulder && leftWrist && rightWrist && leftElbow && rightElbow) {
      const leftElbowAngle = calculateElbowAngle(leftShoulder, leftElbow, leftWrist);
      const rightElbowAngle = calculateElbowAngle(rightShoulder, rightElbow, rightWrist);
      
      // Stricter criteria for detecting grabbed objects only
      const leftArmActive = leftElbowAngle > 45 && leftElbowAngle < 135;
      const rightArmActive = rightElbowAngle > 45 && rightElbowAngle < 135;
      
      // Check for intentional grasping positions (hands positioned for holding objects)
      const leftHandGrasping = leftWrist.y > leftElbow.y && Math.abs(leftWrist.x - leftElbow.x) > 0.05;
      const rightHandGrasping = rightWrist.y > rightElbow.y && Math.abs(rightWrist.x - rightElbow.x) > 0.05;
      
      // Detect actual object manipulation (not just arm movement)
      const leftGraspingObject = leftArmActive && leftHandGrasping && 
        (leftWrist.y > leftShoulder.y + 0.1) && // Hand below shoulder level
        (Math.abs(leftWrist.x - leftShoulder.x) > 0.15); // Hand away from body
        
      const rightGraspingObject = rightArmActive && rightHandGrasping && 
        (rightWrist.y > rightShoulder.y + 0.1) && // Hand below shoulder level
        (Math.abs(rightWrist.x - rightShoulder.x) > 0.15); // Hand away from body
      
      // Only detect carrying when hands are clearly holding something
      if (leftGraspingObject || rightGraspingObject) {
        isCarrying = true;
        armPosition = 'extended';
      }
      
      // Lifting detection - both hands engaged in coordinated motion
      const bothHandsEngaged = leftGraspingObject && rightGraspingObject;
      const coordinatedMotion = Math.abs(leftElbowAngle - rightElbowAngle) < 25;
      const liftingHeight = (leftWrist.y + rightWrist.y) / 2 > (leftShoulder.y + rightShoulder.y) / 2 + 0.05;
      
      if (bothHandsEngaged && coordinatedMotion && liftingHeight) {
        isLifting = true;
        armPosition = 'extended';
      }
      
      // Overhead lifting - clear object manipulation above shoulder level
      const leftOverhead = leftWrist.y < leftShoulder.y - 0.15 && leftArmActive;
      const rightOverhead = rightWrist.y < rightShoulder.y - 0.15 && rightArmActive;
      
      if (leftOverhead || rightOverhead) {
        armPosition = 'overhead';
        isLifting = true;
      }
      
      // Analyze spine deviation for load assessment
      if (leftHip && rightHip) {
        const hipCenter = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
        const shoulderCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
        spineDeviation = Math.abs(shoulderCenter.x - hipCenter.x) * 100;
        
        // Determine load direction based on hand positions
        const handCenter = { x: (leftWrist.x + rightWrist.x) / 2, y: (leftWrist.y + rightWrist.y) / 2 };
        if (handCenter.x < shoulderCenter.x - 0.1) {
          loadDirection = 'side';
        } else if (handCenter.x > shoulderCenter.x + 0.1) {
          loadDirection = 'side';
        } else {
          loadDirection = 'front';
        }
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
  // Very conservative weight estimation - only for clearly grabbed objects
  let baseWeight = 0;
  
  // Only estimate weight when we have strong indicators of actual object manipulation
  if (bodyPosture.isLifting && bodyPosture.armPosition === 'extended') {
    baseWeight = 8; // Confirmed lifting with clear grasping posture
  } else if (bodyPosture.isCarrying && bodyPosture.armPosition === 'extended') {
    baseWeight = 5; // Confirmed carrying with intentional hand positioning
  } else if (bodyPosture.armPosition === 'overhead') {
    baseWeight = 10; // Overhead manipulation typically involves objects
  }
  
  // Additional validation for object presence (not just posture)
  if (keypoints.length >= 17 && baseWeight > 0) {
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    
    if (leftShoulder && rightShoulder && leftElbow && rightElbow && leftWrist && rightWrist) {
      // Check for grip-specific posture indicators
      const leftElbowAngle = calculateElbowAngle(leftShoulder, leftElbow, leftWrist);
      const rightElbowAngle = calculateElbowAngle(rightShoulder, rightElbow, rightWrist);
      
      // Object-specific asymmetry (different from natural movement asymmetry)
      const significantAsymmetry = Math.abs(leftElbowAngle - rightElbowAngle) > 40;
      const oneArmDominant = (leftElbowAngle < 90 && rightElbowAngle > 120) || 
                            (rightElbowAngle < 90 && leftElbowAngle > 120);
      
      if (significantAsymmetry && oneArmDominant) {
        baseWeight += 2; // Clear indication of holding an object with one hand
      }
      
      // Load-bearing posture analysis
      const shoulderCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
      const wristCenter = { x: (leftWrist.x + rightWrist.x) / 2, y: (leftWrist.y + rightWrist.y) / 2 };
      
      // Forward reach with load compensation
      const forwardReach = wristCenter.y > shoulderCenter.y + 0.2;
      const lateralStability = Math.abs(wristCenter.x - shoulderCenter.x) > 0.1;
      
      if (forwardReach && lateralStability) {
        baseWeight += 3; // Clear object manipulation with body compensation
      }
      
      // Spine compensation for external load
      if (bodyPosture.spineDeviation > 15) {
        baseWeight += 2; // Body compensating for external weight
      }
    }
  }
  
  // Final validation - only return weight if multiple indicators confirm object presence
  const hasMultipleIndicators = (bodyPosture.isLifting || bodyPosture.isCarrying) && 
                                bodyPosture.spineDeviation > 10 && 
                                baseWeight > 5;
  
  return hasMultipleIndicators ? baseWeight : 0;
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