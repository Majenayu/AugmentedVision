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

// Conservative REBA Scoring Functions
function getTrunkScore(angle: number): number {
  if (angle <= 10) return 1;  // Very upright
  if (angle <= 25) return 2;  // Slight lean
  if (angle <= 45) return 3;  // Moderate lean
  if (angle <= 65) return 4;  // Significant lean
  return 5;                   // Extreme lean
}

function getNeckScore(angle: number): number {
  if (angle <= 12) return 1;  // Neutral neck
  if (angle <= 25) return 2;  // Moderate flexion
  return 3;                   // Significant deviation
}

function getLegScore(thighAngle: number, kneeAngle: number): number {
  // Conservative leg scoring - only penalize clearly problematic positions
  if (thighAngle <= 30 && kneeAngle <= 60) return 1;  // Good support
  if (thighAngle <= 50 && kneeAngle <= 90) return 2;  // Moderate flexion
  return 3;  // Significant flexion or instability
}

function getUpperArmScore(angle: number): number {
  if (angle <= 15) return 1;  // Neutral position
  if (angle <= 35) return 2;  // Slight elevation
  if (angle <= 70) return 3;  // Moderate elevation
  if (angle <= 110) return 4; // High elevation
  return 5;                   // Extreme elevation
}

function getLowerArmScore(angle: number): number {
  if (angle >= 70 && angle <= 110) return 1;  // Good forearm position
  return 2;  // Outside optimal range
}

function getWristScore(angle: number): number {
  if (Math.abs(angle) <= 12) return 1;  // Neutral wrist
  if (Math.abs(angle) <= 25) return 2;  // Moderate deviation
  return 3;  // Significant deviation
}

// Conservative REBA Tables
function getScoreA(trunk: number, neck: number, legs: number): number {
  // Very conservative Group A scoring
  const tableA = [
    [1, 1, 1, 2], // Trunk 1
    [1, 2, 2, 3], // Trunk 2
    [2, 2, 3, 3], // Trunk 3
    [2, 3, 3, 4], // Trunk 4
    [3, 3, 4, 4]  // Trunk 5
  ];
  
  const row = Math.min(trunk - 1, 4);
  const col = Math.min(neck + legs - 2, 3);
  
  return Math.min(tableA[row][Math.max(col, 0)], 7);
}

function getScoreB(upperArm: number, lowerArm: number, wrist: number): number {
  // Conservative Group B scoring
  const tableB = [
    [1, 1, 2], // Upper Arm 1
    [1, 2, 2], // Upper Arm 2
    [2, 2, 3], // Upper Arm 3
    [2, 3, 3], // Upper Arm 4
    [3, 3, 4], // Upper Arm 5
    [3, 4, 4]  // Upper Arm 6
  ];
  
  const row = Math.min(upperArm - 1, 5);
  const col = Math.min(lowerArm + wrist - 2, 2);
  
  return Math.min(tableB[row][Math.max(col, 0)], 7);
}

function getFinalScore(scoreA: number, scoreB: number): number {
  // Ultra-conservative final scoring table
  const finalTable = [
    [1, 1, 1, 2, 2, 3, 3], // Score A 1
    [1, 1, 2, 2, 3, 3, 4], // Score A 2
    [1, 2, 2, 3, 3, 4, 4], // Score A 3
    [2, 2, 3, 3, 4, 4, 5], // Score A 4
    [2, 3, 3, 4, 4, 5, 5], // Score A 5
    [3, 3, 4, 4, 5, 5, 6], // Score A 6
    [3, 4, 4, 5, 5, 6, 6]  // Score A 7
  ];
  
  const row = Math.min(Math.max(scoreA - 1, 0), 6);
  const col = Math.min(Math.max(scoreB - 1, 0), 6);
  
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

    // Calculate angles
    const trunkAngle = calculateVerticalAngle(hip, shoulder);
    const neckAngle = calculateVerticalAngle(shoulder, nose);
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

    console.log('REBA calculation successful:', result);
    return result;

  } catch (error) {
    console.error("Error calculating REBA score:", error);
    return null;
  }
}