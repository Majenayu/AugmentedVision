// Fixed REBA (Rapid Entire Body Assessment) Calculator
interface Keypoint {
  x: number;
  y: number;
  score: number;
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
  return Math.atan2(Math.abs(deltaX), Math.abs(deltaY)) * (180 / Math.PI);
}

// Dynamic REBA Scoring Functions - More responsive to posture changes
function getTrunkScore(angle: number): number {
  // More sensitive trunk scoring
  if (angle <= 5) return 1;         // Perfect upright posture
  if (angle <= 15) return 2;        // Good posture with slight lean
  if (angle <= 30) return 3;        // Moderate lean - caution needed
  if (angle <= 50) return 4;        // Significant lean - action needed
  return 5;                         // Severe lean - immediate action
}

function getNeckScore(angle: number): number {
  // Dynamic neck scoring
  if (angle <= 8) return 1;         // Neutral neck position
  if (angle <= 20) return 2;        // Slight forward head posture
  if (angle <= 35) return 3;        // Moderate neck deviation
  return 4;                         // Severe neck problems
}

function getLegScore(thighAngle: number, kneeAngle: number): number {
  // More dynamic leg scoring
  const avgFlexion = (thighAngle + kneeAngle) / 2;
  
  if (avgFlexion <= 20) return 1;   // Well supported, minimal flexion
  if (avgFlexion <= 40) return 2;   // Some flexion, stable support
  if (avgFlexion <= 65) return 3;   // Moderate flexion, some instability
  return 4;                         // High flexion, unstable
}

function getUpperArmScore(angle: number): number {
  // More responsive upper arm scoring
  if (angle <= 12) return 1;        // Arms at sides, excellent
  if (angle <= 25) return 2;        // Slight elevation, good
  if (angle <= 45) return 3;        // Moderate elevation, caution
  if (angle <= 75) return 4;        // High elevation, action needed
  if (angle <= 105) return 5;       // Very high elevation, problem
  return 6;                         // Extreme elevation, immediate action
}

function getLowerArmScore(angle: number): number {
  // Dynamic forearm scoring
  if (angle >= 90 && angle <= 120) return 1;  // Optimal elbow angle
  if (angle >= 70 && angle <= 140) return 2;  // Good range
  if (angle >= 50 && angle <= 160) return 3;  // Acceptable range
  return 4;                                    // Poor elbow positioning
}

function getWristScore(angle: number): number {
  const absAngle = Math.abs(angle);
  if (absAngle <= 6) return 1;      // Perfect neutral wrist
  if (absAngle <= 15) return 2;     // Slight deviation
  if (absAngle <= 30) return 3;     // Moderate deviation
  return 4;                         // Severe wrist deviation
}

// Dynamic REBA Tables - More responsive scoring
function getScoreA(trunk: number, neck: number, legs: number): number {
  // Dynamic Group A scoring with better differentiation
  const tableA = [
    [1, 2, 3, 4, 5], // Trunk 1
    [2, 3, 4, 5, 6], // Trunk 2
    [2, 4, 5, 6, 7], // Trunk 3
    [3, 5, 6, 7, 7], // Trunk 4
    [4, 6, 7, 7, 7]  // Trunk 5
  ];
  
  const row = Math.min(trunk - 1, 4);
  const col = Math.min(Math.max(neck + legs - 2, 0), 4);
  
  return Math.min(tableA[row][col], 7);
}

function getScoreB(upperArm: number, lowerArm: number, wrist: number): number {
  // Dynamic Group B scoring
  const tableB = [
    [1, 2, 3, 4], // Upper Arm 1
    [2, 3, 4, 5], // Upper Arm 2
    [3, 4, 5, 5], // Upper Arm 3
    [4, 5, 5, 6], // Upper Arm 4
    [5, 6, 6, 7], // Upper Arm 5
    [6, 7, 7, 7]  // Upper Arm 6
  ];
  
  const row = Math.min(upperArm - 1, 5);
  const col = Math.min(Math.max(lowerArm + wrist - 2, 0), 3);
  
  return Math.min(tableB[row][col], 7);
}

function getFinalScore(scoreA: number, scoreB: number): number {
  // More dynamic final scoring table
  const finalTable = [
    [1, 1, 2, 3, 4, 5, 6, 7], // Score A 1
    [1, 2, 3, 4, 5, 6, 7, 7], // Score A 2
    [2, 3, 4, 5, 6, 7, 7, 7], // Score A 3
    [3, 4, 5, 6, 7, 7, 7, 7], // Score A 4
    [4, 5, 6, 7, 7, 7, 7, 7], // Score A 5
    [5, 6, 7, 7, 7, 7, 7, 7], // Score A 6
    [6, 7, 7, 7, 7, 7, 7, 7]  // Score A 7
  ];
  
  const row = Math.min(Math.max(scoreA - 1, 0), 6);
  const col = Math.min(Math.max(scoreB - 1, 0), 7);
  
  return Math.min(finalTable[row][col], 7);
}

function getRiskLevel(score: number): string {
  if (score === 1) return "Negligible";
  if (score <= 3) return "Low";
  if (score <= 5) return "Medium";
  return "High";
}

function getActionLevel(score: number): string {
  if (score === 1) return "Not necessary";
  if (score <= 3) return "May be necessary";
  if (score <= 5) return "Necessary";
  return "Necessary soon";
}

export function calculateREBA(keypoints: Keypoint[], useLeft: boolean = true, manualWeight: number = 0): any {
  try {
    if (!keypoints || keypoints.length < 17) {
      console.log('REBA: Insufficient keypoints');
      return null;
    }

    // Extract keypoints
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

    // Choose side for analysis
    const shoulder = useLeft ? leftShoulder : rightShoulder;
    const elbow = useLeft ? leftElbow : rightElbow;
    const wrist = useLeft ? leftWrist : rightWrist;
    const hip = useLeft ? leftHip : rightHip;
    const knee = useLeft ? leftKnee : rightKnee;
    const ankle = useLeft ? leftAnkle : rightAnkle;

    // Check required keypoints
    if (!shoulder || !elbow || !wrist || !hip || !knee || !ankle || !nose) {
      console.log('REBA: Missing essential keypoints');
      return null;
    }

    // Calculate angles with improved accuracy
    const midShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      score: Math.min(leftShoulder.score, rightShoulder.score)
    };
    const midHip = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      score: Math.min(leftHip.score, rightHip.score)
    };
    
    const trunkAngle = calculateVerticalAngle(midHip, midShoulder);
    
    // Better neck calculation
    const headCenter = {
      x: nose.x,
      y: nose.y - 8,
      score: nose.score
    };
    const neckAngle = calculateVerticalAngle(midShoulder, headCenter);
    
    // Leg angles
    const thighAngle = calculateVerticalAngle(hip, knee);
    const kneeAngle = calculateAngle(hip, knee, ankle);
    const upperArmAngle = calculateVerticalAngle(shoulder, elbow);
    const lowerArmAngle = calculateAngle(shoulder, elbow, wrist);
    const wristAngle = calculateVerticalAngle(elbow, wrist) - 90;

    // Calculate scores
    const trunkScore = getTrunkScore(trunkAngle);
    const neckScore = getNeckScore(neckAngle);
    const legScore = getLegScore(thighAngle, kneeAngle);
    const upperArmScore = getUpperArmScore(upperArmAngle);
    const lowerArmScore = getLowerArmScore(lowerArmAngle);
    const wristScore = getWristScore(wristAngle);

    // Calculate intermediate scores
    const scoreA = getScoreA(trunkScore, neckScore, legScore);
    const scoreB = getScoreB(upperArmScore, lowerArmScore, wristScore);

    // Calculate final score (capped at 7)
    const finalScore = Math.min(getFinalScore(scoreA, scoreB), 7);
    const riskLevel = getRiskLevel(finalScore);
    const actionLevel = getActionLevel(finalScore);

    const result = {
      trunk: trunkScore,
      neck: neckScore,
      legs: legScore,
      upperArm: upperArmScore,
      lowerArm: lowerArmScore,
      wrist: wristScore,
      scoreA,
      scoreB,
      finalScore,
      riskLevel,
      actionLevel,
      trunkAngle: Math.round(trunkAngle * 10) / 10,
      neckAngle: Math.round(neckAngle * 10) / 10,
      upperArmAngle: Math.round(upperArmAngle * 10) / 10,
      lowerArmAngle: Math.round(lowerArmAngle * 10) / 10,
      wristAngle: Math.round(wristAngle * 10) / 10
    };

    console.log('REBA calculation successful:', {
      angles: { trunkAngle, neckAngle, upperArmAngle, lowerArmAngle, wristAngle },
      scores: { trunkScore, neckScore, legScore, upperArmScore, lowerArmScore, wristScore },
      final: { scoreA, scoreB, finalScore, riskLevel }
    });
    return result;

  } catch (error) {
    console.error("Error calculating REBA score:", error);
    return null;
  }
}