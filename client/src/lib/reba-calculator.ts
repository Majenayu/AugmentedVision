interface Keypoint {
  x: number;
  y: number;
  score: number;
}

interface RebaScore {
  neck: number;
  trunk: number;
  legs: number;
  upperArm: number;
  lowerArm: number;
  wrist: number;
  scoreA: number;
  scoreB: number;
  finalScore: number;
  riskLevel: string;
  stressLevel: number;
  // Individual body part angles for debugging
  neckAngle: number;
  trunkAngle: number;
  upperArmAngle: number;
  lowerArmAngle: number;
  wristAngle: number;
  legAngle: number;
}

function calculateAngle(p1: Keypoint, p2: Keypoint, p3: Keypoint): number {
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) {
    angle = 360 - angle;
  }
  return angle;
}

function calculateVerticalAngle(point1: Keypoint, point2: Keypoint): number {
  const deltaY = point2.y - point1.y;
  const deltaX = point2.x - point1.x;
  const radians = Math.atan2(deltaX, deltaY);
  return Math.abs(radians * (180 / Math.PI));
}

// REBA Scoring Functions
function getNeckScore(angle: number, isTwisted: boolean = false, isSideBent: boolean = false): number {
  let score = 1;
  
  if (angle > 20) score = 2;
  if (angle > 60) score = 3;
  
  // Add 1 if neck is twisted or side bent
  if (isTwisted || isSideBent) score += 1;
  
  return Math.min(score, 3);
}

function getTrunkScore(angle: number, isTwisted: boolean = false, isSideBent: boolean = false): number {
  let score = 1;
  
  if (angle > 0 && angle <= 20) score = 2;
  if (angle > 20 && angle <= 60) score = 3;
  if (angle > 60) score = 4;
  
  // Add 1 if trunk is twisted or side bent
  if (isTwisted || isSideBent) score += 1;
  
  return Math.min(score, 5);
}

function getLegScore(kneeAngle: number, isWalking: boolean = false): number {
  let score = 1;
  
  // Basic leg scoring - sitting vs standing
  if (kneeAngle < 60) {
    score = 2; // Sitting or crouching
  }
  
  // Add 1 if walking or uneven weight distribution
  if (isWalking) score += 1;
  
  return Math.min(score, 2);
}

function getUpperArmScore(angle: number, isRaised: boolean = false, isAbducted: boolean = false): number {
  let score = 1;
  
  if (angle > 20) score = 2;
  if (angle > 45) score = 3;
  if (angle > 90) score = 4;
  
  // Add 1 if shoulder is raised or arm is abducted
  if (isRaised || isAbducted) score += 1;
  
  return Math.min(score, 6);
}

function getLowerArmScore(angle: number): number {
  if (angle >= 60 && angle <= 100) return 1;
  return 2;
}

function getWristScore(flexionAngle: number, deviationAngle: number): number {
  let score = 1;
  
  if (Math.abs(flexionAngle) > 15) score = 2;
  if (Math.abs(flexionAngle) > 30) score = 3;
  
  // Add 1 if wrist is deviated from midline
  if (deviationAngle > 15) score += 1;
  
  return Math.min(score, 3);
}

// REBA Table A (Neck, Trunk, Legs)
function getScoreA(neck: number, trunk: number, legs: number): number {
  const tableA = [
    [[1,2,3,4],[2,3,4,5],[2,4,5,6],[3,5,6,7],[4,6,7,8]], // Neck 1
    [[2,3,4,5],[3,4,5,6],[4,5,6,7],[5,6,7,8],[6,7,8,9]], // Neck 2
    [[3,4,5,6],[4,5,6,7],[5,6,7,8],[6,7,8,9],[7,8,9,9]]  // Neck 3
  ];
  
  const neckIdx = Math.min(neck - 1, 2);
  const trunkIdx = Math.min(trunk - 1, 4);
  const legsIdx = Math.min(legs - 1, 1);
  
  return tableA[neckIdx][trunkIdx][legsIdx];
}

// REBA Table B (Upper Arm, Lower Arm, Wrist)
function getScoreB(upperArm: number, lowerArm: number, wrist: number): number {
  const tableB = [
    [[1,2,2],[1,2,3]], // Upper Arm 1
    [[1,2,3],[2,3,4]], // Upper Arm 2
    [[3,4,5],[4,5,5]], // Upper Arm 3
    [[4,5,5],[5,6,7]], // Upper Arm 4
    [[6,7,8],[7,8,8]], // Upper Arm 5
    [[7,8,8],[8,9,9]]  // Upper Arm 6
  ];
  
  const upperArmIdx = Math.min(upperArm - 1, 5);
  const lowerArmIdx = Math.min(lowerArm - 1, 1);
  const wristIdx = Math.min(wrist - 1, 1);
  
  return tableB[upperArmIdx][lowerArmIdx][wristIdx];
}

// REBA Table C (Score A, Score B)
function getFinalScore(scoreA: number, scoreB: number): number {
  const tableC = [
    [1,1,1,2,3,3,4,5,6,7,7,7], // Score A 1
    [1,2,2,3,4,4,5,6,6,7,7,8], // Score A 2
    [2,3,3,3,4,5,6,7,7,8,8,8], // Score A 3
    [3,4,4,4,5,6,7,8,8,9,9,9], // Score A 4
    [4,4,4,5,6,7,8,8,9,9,9,9], // Score A 5
    [6,6,6,7,8,8,9,9,10,10,10,10], // Score A 6
    [7,7,7,8,9,9,9,10,10,11,11,11], // Score A 7
    [8,8,8,9,10,10,10,10,10,11,11,11], // Score A 8
    [9,9,9,10,10,10,11,11,11,12,12,12], // Score A 9
    [10,10,10,11,11,11,11,12,12,12,12,12], // Score A 10
    [11,11,11,11,12,12,12,12,12,12,12,12], // Score A 11
    [12,12,12,12,12,12,12,12,12,12,12,12]  // Score A 12
  ];
  
  const scoreAIdx = Math.min(scoreA - 1, 11);
  const scoreBIdx = Math.min(scoreB - 1, 11);
  
  return tableC[scoreAIdx][scoreBIdx];
}

function getRiskLevel(finalScore: number): string {
  if (finalScore === 1) return "Negligible";
  if (finalScore >= 2 && finalScore <= 3) return "Low";
  if (finalScore >= 4 && finalScore <= 7) return "Medium";
  if (finalScore >= 8 && finalScore <= 10) return "High";
  return "Very High";
}

function getStressLevel(finalScore: number): number {
  if (finalScore === 1) return 1;
  if (finalScore >= 2 && finalScore <= 3) return 2;
  if (finalScore >= 4 && finalScore <= 7) return 4;
  if (finalScore >= 8 && finalScore <= 10) return 6;
  return 7;
}

export function calculateRebaScore(keypoints: Keypoint[]): RebaScore | null {
  if (!keypoints || keypoints.length < 17) {
    return null;
  }

  const validKeypoints = keypoints.filter(kp => kp.score > 0.3);
  if (validKeypoints.length < 10) {
    return null;
  }

  try {
    const nose = keypoints[0];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];

    // Use the side with better confidence
    const leftConfidence = (leftShoulder.score + leftElbow.score + leftWrist.score) / 3;
    const rightConfidence = (rightShoulder.score + rightElbow.score + rightWrist.score) / 3;
    
    const useLeft = leftConfidence > rightConfidence;
    const shoulder = useLeft ? leftShoulder : rightShoulder;
    const elbow = useLeft ? leftElbow : rightElbow;
    const wrist = useLeft ? leftWrist : rightWrist;
    const hip = useLeft ? leftHip : rightHip;
    const knee = useLeft ? leftKnee : rightKnee;
    const ankle = useLeft ? leftAnkle : rightAnkle;

    // Calculate angles for REBA assessment
    const neckAngle = calculateVerticalAngle(shoulder, nose);
    const trunkAngle = calculateVerticalAngle(hip, shoulder);
    const upperArmAngle = calculateVerticalAngle(shoulder, elbow);
    const lowerArmAngle = calculateAngle(shoulder, elbow, wrist);
    const wristFlexionAngle = calculateVerticalAngle(elbow, wrist) - 90;
    const wristDeviationAngle = Math.abs(wristFlexionAngle) * 0.5;
    const legAngle = calculateAngle(hip, knee, ankle);

    // Calculate modifiers
    const isShoulderRaised = shoulder.y < nose.y * 0.9;
    const isArmAbducted = Math.abs(shoulder.x - elbow.x) > Math.abs(shoulder.y - elbow.y);
    const isNeckTwisted = Math.abs(nose.x - shoulder.x) > 20;
    const isTrunkTwisted = Math.abs(shoulder.x - hip.x) > 30;
    const isWalking = Math.abs(leftKnee.y - rightKnee.y) > 20;

    // Get REBA scores
    const neckScore = getNeckScore(neckAngle, isNeckTwisted);
    const trunkScore = getTrunkScore(trunkAngle, isTrunkTwisted);
    const legScore = getLegScore(legAngle, isWalking);
    const upperArmScore = getUpperArmScore(upperArmAngle, isShoulderRaised, isArmAbducted);
    const lowerArmScore = getLowerArmScore(lowerArmAngle);
    const wristScore = getWristScore(wristFlexionAngle, wristDeviationAngle);

    // Calculate final scores
    const scoreA = getScoreA(neckScore, trunkScore, legScore);
    const scoreB = getScoreB(upperArmScore, lowerArmScore, wristScore);
    const finalScore = getFinalScore(scoreA, scoreB);
    const riskLevel = getRiskLevel(finalScore);
    const stressLevel = getStressLevel(finalScore);

    return {
      neck: neckScore,
      trunk: trunkScore,
      legs: legScore,
      upperArm: upperArmScore,
      lowerArm: lowerArmScore,
      wrist: wristScore,
      scoreA,
      scoreB,
      finalScore,
      riskLevel,
      stressLevel,
      neckAngle: Math.round(neckAngle * 10) / 10,
      trunkAngle: Math.round(trunkAngle * 10) / 10,
      upperArmAngle: Math.round(upperArmAngle * 10) / 10,
      lowerArmAngle: Math.round(lowerArmAngle * 10) / 10,
      wristAngle: Math.round(wristFlexionAngle * 10) / 10,
      legAngle: Math.round(legAngle * 10) / 10
    };
    
  } catch (error) {
    console.error("Error calculating REBA score:", error);
    return null;
  }
}