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
  
  if (magnitudeBA === 0 || magnitudeBC === 0) return 0;
  
  const cosine = dotProduct / (magnitudeBA * magnitudeBC);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosine))); // Clamp to avoid NaN
  
  return (angle * 180) / Math.PI;
}

function getUpperArmScore(angle: number): number {
  const absAngle = Math.abs(angle - 90); // Deviation from neutral (90 degrees)
  
  if (absAngle <= 20) return 1;
  if (absAngle <= 45) return 2;
  if (absAngle <= 90) return 3;
  return 4;
}

function getLowerArmScore(angle: number): number {
  if (angle >= 60 && angle <= 100) return 1;
  return 2;
}

function getWristScore(angle: number): number {
  const deviation = Math.abs(angle - 180); // Deviation from straight (180 degrees)
  if (deviation <= 15) return 1;
  return 2;
}

function getNeckScore(angle: number): number {
  const deviation = Math.abs(angle - 180); // Deviation from upright
  
  if (deviation <= 10) return 1;
  if (deviation <= 20) return 2;
  if (deviation <= 60) return 3;
  return 4;
}

function getTrunkScore(angle: number): number {
  const deviation = Math.abs(angle - 90); // Deviation from upright
  
  if (deviation <= 10) return 1;
  if (deviation <= 20) return 2;
  if (deviation <= 60) return 3;
  return 4;
}

function calculateFinalRulaScore(upperArm: number, lowerArm: number, wrist: number, neck: number, trunk: number): RulaScore {
  // RULA Table A (Upper Limb)
  const tableA = [
    [[1, 2], [2, 3]], // Upper arm 1
    [[2, 3], [3, 4]], // Upper arm 2
    [[2, 3], [3, 4]], // Upper arm 3
    [[3, 4], [4, 5]], // Upper arm 4
    [[3, 4], [4, 5]], // Upper arm 5
    [[4, 5], [5, 6]], // Upper arm 6
  ];
  
  // RULA Table B (Neck, Trunk, Legs)
  const tableB = [
    [1, 2, 3, 5], // Neck 1
    [2, 3, 4, 6], // Neck 2
    [3, 4, 5, 7], // Neck 3
    [5, 6, 7, 8], // Neck 4
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
  ];
  
  // Calculate Score A
  const upperArmIdx = Math.min(Math.max(upperArm - 1, 0), 5);
  const lowerArmIdx = Math.min(Math.max(lowerArm - 1, 0), 1);
  const wristIdx = Math.min(Math.max(wrist - 1, 0), 1);
  
  const scoreA = tableA[upperArmIdx]?.[lowerArmIdx]?.[wristIdx] || 1;
  
  // Calculate Score B
  const neckIdx = Math.min(Math.max(neck - 1, 0), 3);
  const trunkIdx = Math.min(Math.max(trunk - 1, 0), 3);
  
  const scoreB = tableB[neckIdx]?.[trunkIdx] || 1;
  
  // Calculate Final Score
  const scoreAIdx = Math.min(Math.max(scoreA - 1, 0), 7);
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
    
    // Calculate angles
    const upperArmAngle = calculateAngle(shoulder, elbow, { x: shoulder.x, y: shoulder.y + 0.1, score: 1 });
    const lowerArmAngle = calculateAngle(shoulder, elbow, wrist);
    const wristAngle = calculateAngle(elbow, wrist, { x: wrist.x + 0.1, y: wrist.y, score: 1 });
    const neckAngle = calculateAngle(nose, shoulder, { x: shoulder.x, y: shoulder.y + 0.1, score: 1 });
    const trunkAngle = calculateAngle(shoulder, hip, { x: hip.x, y: hip.y + 0.1, score: 1 });
    
    // Get RULA scores for each body part
    const upperArmScore = getUpperArmScore(upperArmAngle);
    const lowerArmScore = getLowerArmScore(lowerArmAngle);
    const wristScore = getWristScore(wristAngle);
    const neckScore = getNeckScore(neckAngle);
    const trunkScore = getTrunkScore(trunkAngle);
    
    // Calculate final RULA score
    return calculateFinalRulaScore(upperArmScore, lowerArmScore, wristScore, neckScore, trunkScore);
    
  } catch (error) {
    console.error("Error calculating RULA score:", error);
    return null;
  }
}
