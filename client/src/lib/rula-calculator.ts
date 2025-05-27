// RULA (Rapid Upper Limb Assessment) calculation utilities

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
}

function calculateAngle(pointA: Keypoint, pointB: Keypoint, pointC: Keypoint): number {
  const vectorBA = { x: pointA.x - pointB.x, y: pointA.y - pointB.y };
  const vectorBC = { x: pointC.x - pointB.x, y: pointC.y - pointB.y };
  
  const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
  const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2);
  const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);
  
  if (magnitudeBA === 0 || magnitudeBC === 0) return 90; // Default neutral angle
  
  const cosine = dotProduct / (magnitudeBA * magnitudeBC);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosine))); // Clamp to avoid NaN
  
  return (angle * 180) / Math.PI;
}

function calculateVerticalAngle(point1: Keypoint, point2: Keypoint): number {
  // Calculate deviation from vertical (straight up/down)
  const deltaY = Math.abs(point1.y - point2.y);
  const deltaX = Math.abs(point1.x - point2.x);
  
  if (deltaY === 0) return 90; // Horizontal
  
  const angle = Math.atan(deltaX / deltaY) * (180 / Math.PI);
  return angle;
}

function getUpperArmScore(shoulderAngle: number, isRaised: boolean): number {
  // Upper arm score based on shoulder flexion/extension
  let score = 1;
  
  if (shoulderAngle > 20) score = 2;
  if (shoulderAngle > 45) score = 3;
  if (shoulderAngle > 90) score = 4;
  
  // Add 1 if shoulder is raised
  if (isRaised) score += 1;
  
  return Math.min(score, 6); // Cap at 6
}

function getLowerArmScore(elbowAngle: number, acrossMidline: boolean): number {
  // Lower arm score based on elbow flexion
  let score = 1;
  
  if (elbowAngle < 60 || elbowAngle > 100) score = 2;
  
  // Add 1 if working across midline
  if (acrossMidline) score += 1;
  
  return Math.min(score, 3); // Cap at 3
}

function getWristScore(wristAngle: number, deviation: number): number {
  // Wrist score based on flexion/extension
  let score = 1;
  
  if (Math.abs(wristAngle) > 15) score = 2;
  if (Math.abs(wristAngle) > 30) score = 3;
  
  // Add 1 for radial/ulnar deviation
  if (deviation > 15) score += 1;
  
  return Math.min(score, 4); // Cap at 4
}

function getNeckScore(neckAngle: number, twisted: boolean, sideBent: boolean): number {
  // Neck score based on flexion/extension
  let score = 1;
  
  if (neckAngle > 10) score = 2;
  if (neckAngle > 20) score = 3;
  if (neckAngle < -10) score = 4; // Extension
  
  // Add 1 if twisted or side bent
  if (twisted || sideBent) score += 1;
  
  return Math.min(score, 6); // Cap at 6
}

function getTrunkScore(trunkAngle: number, twisted: boolean, sideBent: boolean): number {
  // Trunk score based on flexion/extension
  let score = 1;
  
  if (trunkAngle > 0 && trunkAngle <= 20) score = 2;
  if (trunkAngle > 20 && trunkAngle <= 60) score = 3;
  if (trunkAngle > 60) score = 4;
  
  // Add 1 if twisted or side bent
  if (twisted || sideBent) score += 1;
  
  return Math.min(score, 5); // Cap at 5
}

function calculateFinalRulaScore(upperArm: number, lowerArm: number, wrist: number, neck: number, trunk: number): RulaScore {
  // RULA Table A (Upper Limb) - Correct RULA methodology
  const tableA = [
    // Wrist 1, Wrist 2, Wrist 3, Wrist 4
    [1, 2, 2, 2], // Upper Arm 1, Lower Arm 1
    [2, 2, 3, 3], // Upper Arm 1, Lower Arm 2
    [2, 3, 3, 3], // Upper Arm 1, Lower Arm 3
    [2, 3, 3, 4], // Upper Arm 2, Lower Arm 1
    [3, 3, 4, 4], // Upper Arm 2, Lower Arm 2
    [3, 4, 4, 4], // Upper Arm 2, Lower Arm 3
    [3, 3, 4, 4], // Upper Arm 3, Lower Arm 1
    [3, 4, 4, 5], // Upper Arm 3, Lower Arm 2
    [4, 4, 5, 5], // Upper Arm 3, Lower Arm 3
    [4, 4, 4, 5], // Upper Arm 4, Lower Arm 1
    [4, 4, 5, 5], // Upper Arm 4, Lower Arm 2
    [4, 5, 5, 5], // Upper Arm 4, Lower Arm 3
    [5, 5, 5, 6], // Upper Arm 5, Lower Arm 1
    [5, 6, 6, 7], // Upper Arm 5, Lower Arm 2
    [6, 6, 7, 7], // Upper Arm 5, Lower Arm 3
    [7, 7, 7, 8], // Upper Arm 6, Lower Arm 1
    [8, 8, 8, 9], // Upper Arm 6, Lower Arm 2
    [9, 9, 9, 9], // Upper Arm 6, Lower Arm 3
  ];
  
  // RULA Table B (Neck, Trunk, Legs) - Legs assumed as 1 for sitting/standing
  const tableB = [
    [1, 3, 2, 3, 3, 4], // Neck 1
    [2, 3, 2, 3, 4, 5], // Neck 2
    [3, 3, 3, 4, 5, 5], // Neck 3
    [5, 5, 5, 6, 6, 7], // Neck 4
    [7, 7, 7, 7, 7, 8], // Neck 5
    [8, 8, 8, 8, 8, 8], // Neck 6
  ];
  
  // RULA Table C (Final Score)
  const tableC = [
    [1, 2, 3, 3, 4, 5, 5], // Score A 1
    [2, 2, 3, 4, 4, 5, 5], // Score A 2
    [3, 3, 3, 4, 4, 5, 6], // Score A 3
    [3, 3, 3, 4, 5, 6, 6], // Score A 4
    [4, 4, 4, 5, 6, 7, 7], // Score A 5
    [4, 4, 5, 6, 6, 7, 7], // Score A 6
    [5, 5, 6, 6, 7, 7, 7], // Score A 7
    [5, 5, 6, 7, 7, 7, 7], // Score A 8
    [6, 6, 6, 7, 7, 8, 8], // Score A 9
  ];
  
  // Calculate Score A using proper indexing
  const upperArmIdx = Math.min(Math.max(upperArm - 1, 0), 5);
  const lowerArmIdx = Math.min(Math.max(lowerArm - 1, 0), 2);
  const wristIdx = Math.min(Math.max(wrist - 1, 0), 3);
  
  const tableAIndex = upperArmIdx * 3 + lowerArmIdx;
  const scoreA = tableA[tableAIndex]?.[wristIdx] || 1;
  
  // Calculate Score B
  const neckIdx = Math.min(Math.max(neck - 1, 0), 5);
  const trunkIdx = Math.min(Math.max(trunk - 1, 0), 5);
  
  const scoreB = tableB[neckIdx]?.[trunkIdx] || 1;
  
  // Calculate Final Score
  const scoreAIdx = Math.min(Math.max(scoreA - 1, 0), 8);
  const scoreBIdx = Math.min(Math.max(scoreB - 1, 0), 6);
  
  const finalScore = tableC[scoreAIdx]?.[scoreBIdx] || 1;
  
  // Determine risk level
  let riskLevel: string;
  if (finalScore <= 2) {
    riskLevel = 'Acceptable';
  } else if (finalScore <= 4) {
    riskLevel = 'Investigate';
  } else if (finalScore <= 6) {
    riskLevel = 'Investigate & Change Soon';
  } else {
    riskLevel = 'Investigate & Change ASAP';
  }
  
  return {
    upperArm,
    lowerArm,
    wrist,
    neck,
    trunk,
    scoreA,
    scoreB,
    finalScore,
    riskLevel
  };
}

export function calculateRulaScore(keypoints: Keypoint[]): RulaScore | null {
  if (!keypoints || keypoints.length < 17) {
    return null;
  }
  
  // Filter keypoints with sufficient confidence
  const validKeypoints = keypoints.filter(kp => kp.score > 0.3);
  if (validKeypoints.length < 10) {
    return null;
  }
  
  try {
    // Extract key points (using MoveNet indices)
    const nose = keypoints[0];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    
    // Use right side for assessment (can be modified for left side or average)
    const shoulder = rightShoulder;
    const elbow = rightElbow;
    const wrist = rightWrist;
    const hip = rightHip;
    
    // Calculate improved angles using proper biomechanical reference points
    
    // Upper arm angle (shoulder flexion from vertical)
    const shoulderAngle = calculateVerticalAngle(shoulder, elbow);
    const isShoulderRaised = shoulder.y < leftShoulder.y - 0.05; // Check if shoulder is raised
    
    // Lower arm angle (elbow flexion)
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);
    const acrossMidline = Math.abs(wrist.x - shoulder.x) > Math.abs(leftShoulder.x - rightShoulder.x) * 0.5;
    
    // Wrist angle (wrist flexion/extension and deviation)
    const wristFlexion = calculateVerticalAngle(elbow, wrist) - 90; // Deviation from neutral
    const wristDeviation = Math.abs(wrist.x - elbow.x) * 100; // Simplified deviation calculation
    
    // Neck angle (head flexion from vertical)
    const neckFlexion = calculateVerticalAngle(shoulder, nose);
    const neckTwisted = Math.abs(nose.x - (leftShoulder.x + rightShoulder.x) / 2) > 0.05;
    const neckSideBent = false; // Simplified - would need more complex calculation
    
    // Trunk angle (trunk flexion from vertical)
    const trunkFlexion = calculateVerticalAngle(hip, shoulder);
    const trunkTwisted = Math.abs((leftHip.x + rightHip.x) / 2 - (leftShoulder.x + rightShoulder.x) / 2) > 0.05;
    const trunkSideBent = false; // Simplified
    
    // Get RULA scores for each body part using improved scoring
    const upperArmScore = getUpperArmScore(shoulderAngle, isShoulderRaised);
    const lowerArmScore = getLowerArmScore(elbowAngle, acrossMidline);
    const wristScore = getWristScore(wristFlexion, wristDeviation);
    const neckScore = getNeckScore(neckFlexion, neckTwisted, neckSideBent);
    const trunkScore = getTrunkScore(trunkFlexion, trunkTwisted, trunkSideBent);
    
    // Calculate final RULA score
    return calculateFinalRulaScore(upperArmScore, lowerArmScore, wristScore, neckScore, trunkScore);
    
  } catch (error) {
    console.error("Error calculating RULA score:", error);
    return null;
  }
}
