// RULA (Rapid Upper Limb Assessment) calculation - Full body including trunk
interface Keypoint {
  x: number;
  y: number;
  score: number;
}

interface RulaScore {
  upperArm: number;
  lowerArm: number;
  wrist: number;
  neck: number;
  trunk: number;
  scoreA: number;
  scoreB: number;
  finalScore: number;
  riskLevel: string;
  stressLevel: number; // 1-7 scale (1: minimal stress, 7: high stress)
  // Individual body part angles for debugging
  upperArmAngle: number;
  lowerArmAngle: number;
  wristAngle: number;
  neckAngle: number;
  trunkAngle: number;
}

function calculateAngle(p1: Keypoint, p2: Keypoint, p3: Keypoint): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 90;
  
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

function calculateVerticalAngle(point1: Keypoint, point2: Keypoint): number {
  const deltaY = point2.y - point1.y;
  const deltaX = point2.x - point1.x;
  
  // Calculate angle from vertical (positive Y-axis)
  const angle = Math.atan2(Math.abs(deltaX), Math.abs(deltaY)) * (180 / Math.PI);
  return angle;
}

// RULA-specific scoring functions
function getUpperArmScore(angle: number, isRaised: boolean = false, isAbducted: boolean = false): number {
  let score = 1;
  
  if (angle <= 20) {
    score = 1;
  } else if (angle <= 45) {
    score = 2;
  } else if (angle <= 90) {
    score = 3;
  } else {
    score = 4;
  }
  
  // Adjustments
  if (isRaised || isAbducted) score += 1;
  
  return Math.min(score, 4);
}

function getLowerArmScore(angle: number, crossesMidline: boolean = false): number {
  let score = 1;
  
  if (angle >= 60 && angle <= 100) {
    score = 1;
  } else {
    score = 2;
  }
  
  // Adjustment for crossing midline
  if (crossesMidline) score += 1;
  
  return Math.min(score, 3);
}

function getWristScore(flexionAngle: number, deviationAngle: number, isTwisted: boolean = false): number {
  let score = 1;
  
  // Flexion/Extension scoring
  if (Math.abs(flexionAngle) <= 15) {
    score = 1;
  } else {
    score = 2;
  }
  
  // Deviation adjustment
  if (Math.abs(deviationAngle) > 15) {
    score += 1;
  }
  
  // Twist adjustment
  if (isTwisted) {
    score += 1;
  }
  
  return Math.min(score, 4);
}

function getNeckScore(angle: number, isTwisted: boolean = false, isSideBent: boolean = false): number {
  let score = 1;
  
  if (angle <= 10) {
    score = 1;
  } else if (angle <= 20) {
    score = 2;
  } else {
    score = 3;
  }
  
  // Adjustments
  if (isTwisted || isSideBent) score += 1;
  
  return Math.min(score, 4);
}

function getTrunkScore(angle: number, isTwisted: boolean = false, isSideBent: boolean = false): number {
  let score = 1;
  
  if (angle <= 0) {
    score = 1;
  } else if (angle <= 20) {
    score = 2;
  } else if (angle <= 60) {
    score = 3;
  } else {
    score = 4;
  }
  
  // Adjustments for twisting or side bending
  if (isTwisted || isSideBent) score += 1;
  
  return Math.min(score, 5);
}

// RULA Score A calculation (Upper Arm + Lower Arm + Wrist)
function getScoreA(upperArm: number, lowerArm: number, wrist: number): number {
  // RULA Score A table
  const scoreATable = [
    [[1,2,2,2],[2,2,3,3],[2,3,3,3],[3,3,3,4]], // Upper arm score 1
    [[2,2,3,3],[2,3,3,4],[3,3,4,4],[3,4,4,4]], // Upper arm score 2
    [[2,3,3,4],[3,3,4,4],[3,4,4,5],[4,4,5,5]], // Upper arm score 3
    [[3,3,4,4],[3,4,4,5],[4,4,5,5],[4,5,5,6]]  // Upper arm score 4
  ];
  
  const upperArmIndex = Math.min(Math.max(upperArm - 1, 0), 3);
  const lowerArmIndex = Math.min(Math.max(lowerArm - 1, 0), 1);
  const wristIndex = Math.min(Math.max(wrist - 1, 0), 3);
  
  return scoreATable[upperArmIndex][lowerArmIndex][wristIndex];
}

// RULA Score B calculation (Neck + Trunk for complete upper body assessment)
function getScoreB(neck: number, trunk: number): number {
  // RULA Score B table (Neck + Trunk)
  const scoreBTable = [
    [1,3,2,2,3,3], // Neck score 1
    [2,3,2,3,4,5], // Neck score 2
    [3,3,3,4,5,6], // Neck score 3
    [5,5,4,5,6,7], // Neck score 4
    [6,6,6,7,7,8], // Neck score 5
    [7,7,7,8,8,9]  // Neck score 6
  ];
  
  const neckIndex = Math.min(Math.max(neck - 1, 0), 5);
  const trunkIndex = Math.min(Math.max(trunk - 1, 0), 4);
  
  return scoreBTable[neckIndex][trunkIndex];
}

// RULA Final Score calculation (simplified for upper body only)
function getFinalScore(scoreA: number, scoreB: number): number {
  // Simplified RULA Final Score table for upper body assessment
  // Since Score B is now just neck score (1-6), we use a simplified table
  const finalScoreTable = [
    [1,2,3,3,4,5], // Score A = 1
    [2,2,3,4,4,5], // Score A = 2
    [3,3,3,4,4,5], // Score A = 3
    [3,3,4,4,5,6], // Score A = 4
    [4,4,4,5,6,6], // Score A = 5
    [4,4,5,6,6,7], // Score A = 6
    [5,5,6,6,7,7], // Score A = 7
    [5,5,6,7,7,7]  // Score A = 8
  ];
  
  const scoreAIndex = Math.min(Math.max(scoreA - 1, 0), 7);
  const scoreBIndex = Math.min(Math.max(scoreB - 1, 0), 5);
  
  return finalScoreTable[scoreAIndex][scoreBIndex];
}

function getRiskLevel(finalScore: number): string {
  if (finalScore <= 2) return 'Acceptable';
  if (finalScore <= 4) return 'Low Risk';
  if (finalScore <= 6) return 'Medium Risk';
  return 'High Risk';
}

function getStressLevel(finalScore: number): number {
  return Math.min(Math.max(finalScore, 1), 7);
}

export function calculateRulaScore(keypoints: Keypoint[]): RulaScore | null {
  if (!keypoints || keypoints.length < 17) {
    return null;
  }

  try {
    // COCO pose keypoint indices for full body
    const nose = keypoints[0];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    
    // Use average of both sides for RULA assessment
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      score: Math.min(leftShoulder.score, rightShoulder.score)
    };
    
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      score: Math.min(leftHip.score, rightHip.score)
    };
    
    // Calculate angles for dominant side (right side as default) - RULA complete upper body
    const upperArmAngle = calculateVerticalAngle(rightShoulder, rightElbow);
    const lowerArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const wristAngle = calculateVerticalAngle(rightElbow, rightWrist);
    const neckAngle = calculateVerticalAngle(shoulderMidpoint, nose);
    const trunkAngle = calculateVerticalAngle(hipMidpoint, shoulderMidpoint);
    
    // Get individual body part scores (RULA complete upper body with trunk)
    const upperArmScore = getUpperArmScore(upperArmAngle);
    const lowerArmScore = getLowerArmScore(lowerArmAngle);
    const wristScore = getWristScore(wristAngle, 0); // Simplified wrist deviation
    const neckScore = getNeckScore(neckAngle);
    const trunkScore = getTrunkScore(trunkAngle);
    
    // Calculate RULA scores (including trunk for complete upper body)
    const scoreA = getScoreA(upperArmScore, lowerArmScore, wristScore);
    const scoreB = getScoreB(neckScore, trunkScore); // Neck + trunk for complete upper body
    const finalScore = getFinalScore(scoreA, scoreB);
    const riskLevel = getRiskLevel(finalScore);
    const stressLevel = getStressLevel(finalScore);
    
    return {
      upperArm: upperArmScore,
      lowerArm: lowerArmScore,
      wrist: wristScore,
      neck: neckScore,
      trunk: trunkScore,
      scoreA,
      scoreB,
      finalScore,
      riskLevel,
      stressLevel,
      upperArmAngle,
      lowerArmAngle,
      wristAngle,
      neckAngle,
      trunkAngle
    };
  } catch (error) {
    console.error('Error calculating RULA score:', error);
    return null;
  }
}