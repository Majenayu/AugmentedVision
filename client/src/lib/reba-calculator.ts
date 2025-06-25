interface Keypoint {
  x: number;
  y: number;
  score: number;
}

// REBA (Rapid Entire Body Assessment) Calculator
// Full body assessment including legs and load factors

export function calculateREBA(keypoints: Keypoint[], useLeft: boolean = true, manualWeight: number = 0): any {
  try {
    if (!keypoints || keypoints.length < 17) {
      return null;
    }

    // Extract keypoints for COCO-17 format
    const nose = keypoints[0];
    const leftEye = keypoints[1];
    const rightEye = keypoints[2];
    const leftEar = keypoints[3];
    const rightEar = keypoints[4];
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

    // Choose left or right side for analysis
    const shoulder = useLeft ? leftShoulder : rightShoulder;
    const elbow = useLeft ? leftElbow : rightElbow;
    const wrist = useLeft ? leftWrist : rightWrist;
    const hip = useLeft ? leftHip : rightHip;
    const knee = useLeft ? leftKnee : rightKnee;
    const ankle = useLeft ? leftAnkle : rightAnkle;

    // Check if all required points are available
    if (!shoulder || !elbow || !wrist || !hip || !knee || !ankle || !nose) {
      return null;
    }

    // Calculate angles for REBA assessment
    
    // Trunk angle - body lean from vertical
    const trunkAngle = calculateVerticalAngle(hip, shoulder);
    
    // Neck angle - forward head posture
    const neckAngle = calculateVerticalAngle(shoulder, nose);
    
    // Leg analysis - thigh and lower leg
    const thighAngle = calculateVerticalAngle(hip, knee);
    const lowerLegAngle = calculateVerticalAngle(knee, ankle);
    
    // Upper arm angle from vertical
    const upperArmAngle = calculateVerticalAngle(shoulder, elbow);
    
    // Lower arm (forearm) angle
    const lowerArmAngle = calculateAngle(shoulder, elbow, wrist);
    
    // Wrist angles
    const wristAngle = calculateVerticalAngle(elbow, wrist) - 90;

    // REBA postural modifiers
    const isTrunkTwisted = Math.abs(shoulder.x - hip.x) > 20;
    const isTrunkSideBent = Math.abs(leftShoulder.x - rightShoulder.x) > 30;
    const isNeckTwisted = Math.abs(nose.x - shoulder.x) > 20;
    const isNeckSideBent = Math.abs(leftEye.x - rightEye.x) > 15;
    const isUpperArmAbducted = Math.abs(shoulder.x - elbow.x) > Math.abs(shoulder.y - elbow.y);
    const isShoulderRaised = shoulder.y < nose.y * 0.9;
    const armCrossesMidline = useLeft ? wrist.x > rightShoulder.x : wrist.x < leftShoulder.x;
    
    // Weight/force analysis
    const hasLoad = manualWeight > 0;
    const loadScore = getLoadScore(manualWeight);
    
    // Calculate REBA scores
    const trunkScore = getTrunkScoreREBA(trunkAngle, isTrunkTwisted, isTrunkSideBent);
    const neckScore = getNeckScoreREBA(neckAngle, isNeckTwisted, isNeckSideBent);
    const legScore = getLegScoreREBA(thighAngle, lowerLegAngle);
    const upperArmScore = getUpperArmScoreREBA(upperArmAngle, isUpperArmAbducted, isShoulderRaised);
    const lowerArmScore = getLowerArmScoreREBA(lowerArmAngle, armCrossesMidline);
    const wristScore = getWristScoreREBA(wristAngle);
    
    // Calculate intermediate scores
    const scoreA = getScoreAREBA(trunkScore, neckScore, legScore);
    const scoreB = getScoreBREBA(upperArmScore, lowerArmScore, wristScore);
    
    // Apply load/force modifiers
    const scoreAWithLoad = scoreA + loadScore;
    const scoreBWithLoad = scoreB + (hasLoad ? Math.min(loadScore, 1) : 0);
    
    // Calculate final REBA score
    const finalScore = getFinalScoreREBA(scoreAWithLoad, scoreBWithLoad);
    const riskLevel = getRiskLevelREBA(finalScore);
    const actionLevel = getActionLevelREBA(finalScore);

    return {
      // Body part scores
      trunk: trunkScore,
      neck: neckScore,
      legs: legScore,
      upperArm: upperArmScore,
      lowerArm: lowerArmScore,
      wrist: wristScore,
      
      // Group scores
      scoreA: scoreAWithLoad,
      scoreB: scoreBWithLoad,
      finalScore,
      riskLevel,
      actionLevel,
      loadScore,
      
      // Angles for debugging
      trunkAngle: Math.round(trunkAngle * 10) / 10,
      neckAngle: Math.round(neckAngle * 10) / 10,
      thighAngle: Math.round(thighAngle * 10) / 10,
      lowerLegAngle: Math.round(lowerLegAngle * 10) / 10,
      upperArmAngle: Math.round(upperArmAngle * 10) / 10,
      lowerArmAngle: Math.round(lowerArmAngle * 10) / 10,
      wristAngle: Math.round(wristAngle * 10) / 10
    };
    
  } catch (error) {
    console.error("Error calculating REBA score:", error);
    return null;
  }
}

// Helper functions for angle calculations
function calculateVerticalAngle(point1: Keypoint, point2: Keypoint): number {
  const deltaY = point2.y - point1.y;
  const deltaX = point2.x - point1.x;
  return Math.abs(Math.atan2(deltaX, deltaY) * 180 / Math.PI);
}

function calculateAngle(p1: Keypoint, p2: Keypoint, p3: Keypoint): number {
  const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
  let angle = Math.abs(angle1 - angle2) * 180 / Math.PI;
  return angle > 180 ? 360 - angle : angle;
}

// REBA Scoring Functions

function getTrunkScoreREBA(angle: number, twisted: boolean, sideBent: boolean): number {
  let score;
  if (angle <= 5) score = 1;
  else if (angle <= 20) score = 2;
  else if (angle <= 60) score = 3;
  else score = 4;
  
  if (twisted) score += 1;
  if (sideBent) score += 1;
  
  return Math.min(score, 5);
}

function getNeckScoreREBA(angle: number, twisted: boolean, sideBent: boolean): number {
  let score;
  if (angle <= 20) score = 1;
  else if (angle <= 45) score = 2;
  else score = 3;
  
  if (twisted || sideBent) score += 1;
  
  return Math.min(score, 4);
}

function getLegScoreREBA(thighAngle: number, lowerLegAngle: number): number {
  // Simplified leg scoring based on support and flexion
  const avgLegAngle = (thighAngle + lowerLegAngle) / 2;
  
  if (avgLegAngle <= 30) return 1; // Well supported, minimal flexion
  else if (avgLegAngle <= 60) return 2; // Some flexion or uneven support
  else return 3; // Significant flexion or unstable support
}

function getUpperArmScoreREBA(angle: number, abducted: boolean, shoulderRaised: boolean): number {
  let score;
  if (angle <= 20) score = 1;
  else if (angle <= 45) score = 2;
  else if (angle <= 90) score = 3;
  else score = 4;
  
  if (abducted || shoulderRaised) score += 1;
  
  return Math.min(score, 5);
}

function getLowerArmScoreREBA(angle: number, crossesMidline: boolean): number {
  let score;
  if (angle >= 60 && angle <= 100) score = 1;
  else if (angle < 60 || angle > 100) score = 2;
  else score = 2;
  
  if (crossesMidline) score += 1;
  
  return Math.min(score, 3);
}

function getWristScoreREBA(angle: number): number {
  const absAngle = Math.abs(angle);
  if (absAngle <= 15) return 1;
  else if (absAngle <= 30) return 2;
  else return 3;
}

function getLoadScore(weight: number): number {
  if (weight < 5) return 0;
  else if (weight <= 10) return 1;
  else if (weight <= 20) return 2;
  else return 3;
}

// REBA Score combination tables
function getScoreAREBA(trunk: number, neck: number, legs: number): number {
  // REBA Table A (Trunk, Neck, Legs)
  const tableA = [
    [1, 2, 3, 4], // Trunk 1
    [2, 3, 4, 5], // Trunk 2
    [2, 4, 5, 6], // Trunk 3
    [3, 5, 6, 7], // Trunk 4
    [4, 6, 7, 8]  // Trunk 5
  ];
  
  const trunkIndex = Math.min(trunk - 1, 4);
  const combinedNeckLeg = neck + legs;
  const neckLegIndex = Math.min(Math.max(combinedNeckLeg - 2, 0), 3);
  
  return tableA[trunkIndex][neckLegIndex];
}

function getScoreBREBA(upperArm: number, lowerArm: number, wrist: number): number {
  // REBA Table B (Upper Arm, Lower Arm, Wrist)
  const tableB = [
    [1, 2, 2], // Upper Arm 1
    [1, 2, 3], // Upper Arm 2
    [3, 4, 5], // Upper Arm 3
    [4, 5, 5], // Upper Arm 4
    [6, 7, 8], // Upper Arm 5
    [7, 8, 8]  // Upper Arm 6
  ];
  
  const upperArmIndex = Math.min(upperArm - 1, 5);
  const lowerArmWristIndex = Math.min(lowerArm + wrist - 2, 2);
  
  return tableB[upperArmIndex][lowerArmWristIndex];
}

function getFinalScoreREBA(scoreA: number, scoreB: number): number {
  // REBA Table C (Final Score) - Limited to 1-7 range
  const tableC = [
    [1, 1, 1, 2, 3, 3, 4, 5, 6, 7, 7, 7], // Score A 1
    [1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 7], // Score A 2  
    [2, 3, 3, 3, 4, 5, 6, 7, 7, 7, 7, 7], // Score A 3
    [3, 4, 4, 4, 5, 6, 7, 7, 7, 7, 7, 7], // Score A 4
    [4, 4, 4, 5, 6, 7, 7, 7, 7, 7, 7, 7], // Score A 5
    [6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7], // Score A 6
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // Score A 7
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // Score A 8
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // Score A 9
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // Score A 10
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // Score A 11
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7] // Score A 12
  ];
  
  const scoreAIndex = Math.min(scoreA - 1, 11);
  const scoreBIndex = Math.min(scoreB - 1, 11);
  
  // Ensure final score never exceeds 7
  return Math.min(tableC[scoreAIndex][scoreBIndex], 7);
}

function getRiskLevelREBA(score: number): string {
  if (score === 1) return "Negligible";
  else if (score >= 2 && score <= 3) return "Low";
  else if (score >= 4 && score <= 5) return "Medium";
  else if (score >= 6 && score <= 7) return "High";
  else return "High"; // Fallback for any score above 7 (should not occur)
}

function getActionLevelREBA(score: number): string {
  if (score === 1) return "Not necessary";
  else if (score >= 2 && score <= 3) return "May be necessary";
  else if (score >= 4 && score <= 5) return "Necessary";
  else if (score >= 6 && score <= 7) return "Necessary soon";
  else return "Necessary soon"; // Fallback for any score above 7 (should not occur)
}