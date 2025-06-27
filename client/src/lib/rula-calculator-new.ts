// RULA (Rapid Upper Limb Assessment) - Corrected Implementation
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
  stressLevel: number;
  // Individual body part angles for debugging
  upperArmAngle: number;
  lowerArmAngle: number;
  wristAngle: number;
  neckAngle: number;
  trunkAngle: number;
}

function calculateAngleBetweenPoints(p1: Keypoint, p2: Keypoint, p3: Keypoint): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 90;
  
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

function calculateVerticalDeviationAngle(upper: Keypoint, lower: Keypoint): number {
  const deltaX = Math.abs(lower.x - upper.x);
  const deltaY = Math.abs(lower.y - upper.y);
  
  if (deltaY === 0) return 90;
  
  const angle = Math.atan(deltaX / deltaY) * (180 / Math.PI);
  return angle;
}

// RULA Upper Arm Score (shoulder to elbow angle from vertical)
function getUpperArmScore(angle: number): number {
  if (angle <= 20) return 1;       // 20° extension to 20° flexion
  if (angle <= 45) return 2;       // 20° to 45° flexion
  if (angle <= 90) return 3;       // 45° to 90° flexion
  return 4;                        // >90° flexion
}

// RULA Lower Arm Score (elbow angle)
function getLowerArmScore(elbowAngle: number): number {
  // Optimal elbow angle is 60-100 degrees
  if (elbowAngle >= 60 && elbowAngle <= 100) return 1;
  return 2; // Outside optimal range
}

// RULA Wrist Score (wrist deviation from neutral)
function getWristScore(deviationAngle: number): number {
  if (deviationAngle <= 15) return 1;  // Neutral position
  return 2;                            // Bent or deviated
}

// RULA Neck Score (neck flexion)
function getNeckScore(flexionAngle: number): number {
  if (flexionAngle <= 10) return 1;    // 0-10° flexion
  if (flexionAngle <= 20) return 2;    // 10-20° flexion
  return 3;                            // >20° flexion
}

// RULA Trunk Score (trunk flexion)
function getTrunkScore(flexionAngle: number): number {
  if (flexionAngle <= 5) return 1;     // Well supported, upright
  if (flexionAngle <= 20) return 2;    // 5-20° flexion
  if (flexionAngle <= 60) return 3;    // 20-60° flexion
  return 4;                            // >60° flexion
}

// RULA Score A Table (Upper Arm, Lower Arm, Wrist)
function getScoreA(upperArm: number, lowerArm: number, wrist: number): number {
  const table = [
    // Upper Arm Score 1
    [[1,2,2,2], [2,2,3,3]],
    // Upper Arm Score 2  
    [[2,2,3,3], [2,3,3,4]],
    // Upper Arm Score 3
    [[2,3,3,4], [3,3,4,4]],
    // Upper Arm Score 4
    [[3,3,4,4], [3,4,4,5]]
  ];
  
  const upperArmIdx = Math.min(Math.max(upperArm - 1, 0), 3);
  const lowerArmIdx = Math.min(Math.max(lowerArm - 1, 0), 1);
  const wristIdx = Math.min(Math.max(wrist - 1, 0), 3);
  
  return table[upperArmIdx][lowerArmIdx][wristIdx];
}

// RULA Score B Table (Neck, Trunk)
function getScoreB(neck: number, trunk: number): number {
  const table = [
    [1,3,2,2,3,3], // Neck Score 1
    [2,3,2,3,4,5], // Neck Score 2
    [3,3,3,4,5,6]  // Neck Score 3
  ];
  
  const neckIdx = Math.min(Math.max(neck - 1, 0), 2);
  const trunkIdx = Math.min(Math.max(trunk - 1, 0), 5);
  
  return table[neckIdx][trunkIdx];
}

// RULA Final Score Table
function getFinalScore(scoreA: number, scoreB: number): number {
  const table = [
    [1,2,3,3,4,5,5], // Score A = 1
    [2,2,3,4,4,5,5], // Score A = 2
    [3,3,3,4,4,5,6], // Score A = 3
    [3,3,3,4,5,6,6], // Score A = 4
    [4,4,4,5,6,7,7], // Score A = 5
    [4,4,5,6,6,7,7], // Score A = 6
    [5,5,6,6,7,7,7], // Score A = 7
    [5,5,6,7,7,7,7]  // Score A = 8
  ];
  
  const scoreAIdx = Math.min(Math.max(scoreA - 1, 0), 7);
  const scoreBIdx = Math.min(Math.max(scoreB - 1, 0), 6);
  
  return table[scoreAIdx][scoreBIdx];
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
    console.log('RULA: Insufficient keypoints detected:', keypoints?.length || 0);
    return null;
  }

  try {
    // COCO pose keypoint indices
    const nose = keypoints[0];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    
    // Check keypoint confidence
    const minConfidence = 0.3;
    const requiredKeypoints = [nose, leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist, leftHip, rightHip];
    const lowConfidenceCount = requiredKeypoints.filter(kp => kp.score < minConfidence).length;
    
    if (lowConfidenceCount > 3) {
      console.log('RULA: Too many low confidence keypoints, skipping calculation');
      return null;
    }
    
    // Calculate midpoints for reference
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
    
    // Use right side for assessment (can be modified for dominant side)
    const shoulder = rightShoulder;
    const elbow = rightElbow;
    const wrist = rightWrist;
    
    // Calculate angles
    const upperArmAngle = calculateVerticalDeviationAngle(shoulder, elbow);
    const lowerArmAngle = calculateAngleBetweenPoints(shoulder, elbow, wrist);
    const wristAngle = calculateVerticalDeviationAngle(elbow, wrist);
    const neckAngle = calculateVerticalDeviationAngle(shoulderMidpoint, nose);
    const trunkAngle = calculateVerticalDeviationAngle(hipMidpoint, shoulderMidpoint);
    
    console.log('RULA Angles:', {
      upperArm: upperArmAngle.toFixed(1) + '°',
      lowerArm: lowerArmAngle.toFixed(1) + '°',
      wrist: wristAngle.toFixed(1) + '°',
      neck: neckAngle.toFixed(1) + '°',
      trunk: trunkAngle.toFixed(1) + '°'
    });
    
    // Get individual scores
    const upperArmScore = getUpperArmScore(upperArmAngle);
    const lowerArmScore = getLowerArmScore(lowerArmAngle);
    const wristScore = getWristScore(wristAngle);
    const neckScore = getNeckScore(neckAngle);
    const trunkScore = getTrunkScore(trunkAngle);
    
    // Calculate composite scores
    const scoreA = getScoreA(upperArmScore, lowerArmScore, wristScore);
    const scoreB = getScoreB(neckScore, trunkScore);
    const finalScore = getFinalScore(scoreA, scoreB);
    const riskLevel = getRiskLevel(finalScore);
    const stressLevel = getStressLevel(finalScore);
    
    console.log('RULA Scores:', {
      upperArm: upperArmScore,
      lowerArm: lowerArmScore,
      wrist: wristScore,
      neck: neckScore,
      trunk: trunkScore,
      scoreA: scoreA,
      scoreB: scoreB,
      final: finalScore,
      risk: riskLevel
    });
    
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