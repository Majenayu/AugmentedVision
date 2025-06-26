// Corrected REBA (Rapid Upper Limb Assessment) calculation
interface Keypoint {
  x: number;
  y: number;
  score: number;
}

interface RebaScore {
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

function getUpperArmScore(angle: number, isRaised: boolean = false, isAbducted: boolean = false): number {
  let score = 1;
  
  // Base score from angle
  if (angle > 90) score = 4;
  else if (angle > 45) score = 3;
  else if (angle > 20) score = 2;
  else score = 1;
  
  // Add 1 if shoulder is raised or arm is abducted
  if (isRaised || isAbducted) score += 1;
  
  // Support reduces score by 1
  // if (hasSupport) score -= 1;
  
  return Math.max(1, Math.min(6, score)); // Clamp between 1-6
}

function getLowerArmScore(angle: number, crossesMidline: boolean = false): number {
  let score = 1;
  
  // Elbow angle assessment (60-100° is optimal)
  if (angle < 60 || angle > 100) score = 2;
  else score = 1;
  
  // Add 1 if working across midline or to side of body
  if (crossesMidline) score += 1;
  
  return Math.max(1, Math.min(3, score)); // Clamp between 1-3
}

function getWristScore(flexionAngle: number, deviationAngle: number, isTwisted: boolean = false): number {
  let score = 1;
  
  // Wrist flexion/extension from neutral
  const maxDeviation = Math.max(Math.abs(flexionAngle), Math.abs(deviationAngle));
  
  if (maxDeviation > 15) score = 3;
  else if (maxDeviation > 0) score = 2;
  else score = 1;
  
  // Add 1 if wrist is twisted (mid-range)
  if (isTwisted) score += 1;
  
  return Math.max(1, Math.min(4, score)); // Clamp between 1-4
}

function getNeckScore(angle: number, isTwisted: boolean = false, isSideBent: boolean = false): number {
  let score = 1;
  
  // Neck flexion from neutral
  if (angle > 45) score = 4;
  else if (angle > 20) score = 3;
  else if (angle > 10) score = 2;
  else score = 1;
  
  // Add 1 if neck is twisted or side bent
  if (isTwisted || isSideBent) score += 1;
  
  return Math.max(1, Math.min(6, score)); // Clamp between 1-6
}

function getTrunkScore(angle: number, isTwisted: boolean = false, isSideBent: boolean = false): number {
  let score = 1;
  
  // Trunk lean from vertical
  if (angle > 60) score = 4;
  else if (angle > 20) score = 3;
  else if (angle > 5) score = 2;
  else score = 1;
  
  // Add 1 if trunk is twisted or side bent
  if (isTwisted || isSideBent) score += 1;
  
  return Math.max(1, Math.min(5, score)); // Clamp between 1-5
}

function getScoreA(upperArm: number, lowerArm: number, wrist: number): number {
  // Corrected REBA Table A - properly structured 4x3x4 table
  // [upperArm-1][lowerArm-1][wrist-1]
  const tableA = [
    // Upper Arm 1 (20° or less)
    [
      [1, 2, 2, 2], // Lower Arm 1, Wrist 1-4
      [2, 2, 2, 3], // Lower Arm 2, Wrist 1-4
      [2, 3, 3, 3]  // Lower Arm 3, Wrist 1-4
    ],
    // Upper Arm 2 (20-45°)
    [
      [2, 3, 3, 3], // Lower Arm 1, Wrist 1-4
      [3, 3, 3, 4], // Lower Arm 2, Wrist 1-4
      [3, 4, 4, 4]  // Lower Arm 3, Wrist 1-4
    ],
    // Upper Arm 3 (45-90°)
    [
      [3, 3, 4, 4], // Lower Arm 1, Wrist 1-4
      [4, 4, 4, 5], // Lower Arm 2, Wrist 1-4
      [4, 4, 5, 5]  // Lower Arm 3, Wrist 1-4
    ],
    // Upper Arm 4 (>90°)
    [
      [4, 4, 4, 5], // Lower Arm 1, Wrist 1-4
      [5, 5, 5, 6], // Lower Arm 2, Wrist 1-4
      [5, 6, 6, 7]  // Lower Arm 3, Wrist 1-4
    ]
  ];
  
  const uaIndex = Math.min(Math.max(upperArm - 1, 0), 3);
  const laIndex = Math.min(Math.max(lowerArm - 1, 0), 2);
  const wIndex = Math.min(Math.max(wrist - 1, 0), 3);
  
  return tableA[uaIndex][laIndex][wIndex];
}

function getScoreB(neck: number, trunk: number): number {
  // Corrected REBA Table B - 6x5 table
  const tableB = [
    [1, 2, 3, 4, 5], // Neck 1
    [2, 2, 3, 4, 5], // Neck 2
    [3, 3, 3, 4, 5], // Neck 3
    [5, 5, 5, 6, 6], // Neck 4
    [6, 6, 6, 7, 7], // Neck 5
    [7, 7, 7, 7, 7]  // Neck 6
  ];
  
  const neckIndex = Math.min(Math.max(neck - 1, 0), 5);
  const trunkIndex = Math.min(Math.max(trunk - 1, 0), 4);
  
  return tableB[neckIndex][trunkIndex];
}

function getFinalScore(scoreA: number, scoreB: number): number {
  // Corrected REBA Table C - 7x7 table
  const tableC = [
    [1, 1, 1, 2, 3, 3, 4], // Score A 1
    [1, 2, 2, 3, 3, 3, 4], // Score A 2
    [2, 2, 2, 3, 3, 3, 4], // Score A 3
    [3, 3, 3, 3, 3, 4, 5], // Score A 4
    [4, 4, 4, 4, 4, 4, 5], // Score A 5
    [6, 6, 6, 6, 6, 6, 6], // Score A 6
    [7, 7, 7, 7, 7, 7, 7]  // Score A 7
  ];
  
  const scoreAIndex = Math.min(Math.max(scoreA - 1, 0), 6);
  const scoreBIndex = Math.min(Math.max(scoreB - 1, 0), 6);
  
  return tableC[scoreAIndex][scoreBIndex];
}

function getRiskLevel(finalScore: number): string {
  switch (finalScore) {
    case 1:
    case 2:
      return 'Acceptable - Negligible Risk';
    case 3:
    case 4:
      return 'Low Risk - Investigate';
    case 5:
    case 6:
      return 'Medium Risk - Investigate & Change Soon';
    case 7:
      return 'High Risk - Investigate & Change ASAP';
    default:
      return 'Unknown Risk Level';
  }
}

function getStressLevel(finalScore: number): number {
  // Map REBA score (1-7) to stress level (1-7)
  return Math.min(Math.max(finalScore, 1), 7);
}

export function calculateRebaScore(keypoints: Keypoint[]): RebaScore | null {
  if (!keypoints || keypoints.length < 17) {
    return null;
  }

  const validKeypoints = keypoints.filter(kp => kp.score > 0.3);
  if (validKeypoints.length < 8) {
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

    // Use the side with better confidence
    const leftConfidence = (leftShoulder.score + leftElbow.score + leftWrist.score) / 3;
    const rightConfidence = (rightShoulder.score + rightElbow.score + rightWrist.score) / 3;
    
    const useLeft = leftConfidence > rightConfidence;
    const shoulder = useLeft ? leftShoulder : rightShoulder;
    const elbow = useLeft ? leftElbow : rightElbow;
    const wrist = useLeft ? leftWrist : rightWrist;
    const hip = useLeft ? leftHip : rightHip;

    // Calculate angles for REBA assessment
    
    // Upper arm angle from vertical
    const upperArmAngle = calculateVerticalAngle(shoulder, elbow);
    
    // Lower arm (elbow angle) - angle at elbow joint
    const lowerArmAngle = calculateAngle(shoulder, elbow, wrist);
    
    // Wrist angles - flexion and deviation
    const wristFlexionAngle = calculateVerticalAngle(elbow, wrist) - 90;
    const wristDeviationAngle = Math.abs(wristFlexionAngle) * 0.5; // Simplified deviation
    
    // Neck angle - forward head posture
    const neckAngle = calculateVerticalAngle(shoulder, nose);
    
    // Trunk angle - body lean from vertical
    const trunkAngle = calculateVerticalAngle(hip, shoulder);

    // Enhanced scoring with posture modifiers
    const isShoulderRaised = shoulder.y < nose.y * 0.9; // Simplified check
    const isArmAbducted = Math.abs(shoulder.x - elbow.x) > Math.abs(shoulder.y - elbow.y);
    const armCrossesMidline = useLeft ? wrist.x > rightShoulder.x : wrist.x < leftShoulder.x;
    const isWristTwisted = Math.abs(wristFlexionAngle) > 30;
    const isNeckTwisted = Math.abs(nose.x - shoulder.x) > 20;
    const isTrunkTwisted = Math.abs(shoulder.x - hip.x) > 30;

    // Get REBA scores with enhanced logic
    const upperArmScore = getUpperArmScore(upperArmAngle, isShoulderRaised, isArmAbducted);
    const lowerArmScore = getLowerArmScore(lowerArmAngle, armCrossesMidline);
    const wristScore = getWristScore(wristFlexionAngle, wristDeviationAngle, isWristTwisted);
    const neckScore = getNeckScore(neckAngle, isNeckTwisted);
    const trunkScore = getTrunkScore(trunkAngle, isTrunkTwisted);

    // Calculate final scores using corrected REBA tables
    const scoreA = getScoreA(upperArmScore, lowerArmScore, wristScore);
    const scoreB = getScoreB(neckScore, trunkScore);
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
      // Individual body part angles for debugging
      upperArmAngle: Math.round(upperArmAngle * 10) / 10,
      lowerArmAngle: Math.round(lowerArmAngle * 10) / 10,
      wristAngle: Math.round(wristFlexionAngle * 10) / 10,
      neckAngle: Math.round(neckAngle * 10) / 10,
      trunkAngle: Math.round(trunkAngle * 10) / 10
    };
    
  } catch (error) {
    console.error("Error calculating REBA score:", error);
    return null;
  }
}