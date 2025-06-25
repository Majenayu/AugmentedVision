// Fixed RULA (Rapid Upper Limb Assessment) Calculator
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
  return Math.atan2(Math.abs(deltaX), Math.abs(deltaY)) * (180 / Math.PI);
}

// Dynamic RULA Scoring Functions
function getUpperArmScore(angle: number): number {
  // More sensitive to postural changes
  if (angle <= 10) return 1;      // Very good posture
  if (angle <= 25) return 2;      // Good posture
  if (angle <= 50) return 3;      // Moderate risk
  if (angle <= 80) return 4;      // High risk
  return 5;                       // Very high risk
}

function getLowerArmScore(angle: number): number {
  // Dynamic forearm scoring based on elbow angle
  if (angle >= 80 && angle <= 120) return 1;  // Optimal range
  if (angle >= 60 && angle <= 140) return 2;  // Acceptable range
  return 3;                                    // Poor positioning
}

function getWristScore(flexion: number): number {
  const absFlexion = Math.abs(flexion);
  if (absFlexion <= 8) return 1;    // Neutral wrist
  if (absFlexion <= 20) return 2;   // Slight deviation
  if (absFlexion <= 35) return 3;   // Moderate deviation
  return 4;                          // Severe deviation
}

function getNeckScore(angle: number): number {
  // More responsive neck scoring
  if (angle <= 8) return 1;         // Neutral neck
  if (angle <= 18) return 2;        // Slight forward head
  if (angle <= 30) return 3;        // Moderate forward head
  if (angle <= 45) return 4;        // Significant forward head
  return 5;                          // Severe neck deviation
}

function getTrunkScore(angle: number): number {
  // Dynamic trunk scoring
  if (angle <= 3) return 1;         // Very upright
  if (angle <= 12) return 2;        // Slight lean
  if (angle <= 25) return 3;        // Moderate lean
  if (angle <= 45) return 4;        // Significant lean
  return 5;                          // Severe lean
}

// RULA Tables
function getScoreA(upperArm: number, lowerArm: number, wrist: number): number {
  const tableA = [
    [[1,2,2], [2,2,3], [2,3,3]], // Upper Arm 1
    [[2,2,3], [2,3,4], [3,4,4]], // Upper Arm 2
    [[2,3,3], [3,4,4], [4,4,5]], // Upper Arm 3
    [[3,4,4], [4,4,5], [5,5,5]], // Upper Arm 4
    [[4,4,5], [5,5,5], [5,6,6]], // Upper Arm 5
    [[5,5,5], [5,6,6], [6,6,7]]  // Upper Arm 6
  ];
  
  const row = Math.min(Math.max(upperArm - 1, 0), 5);
  const col = Math.min(Math.max(lowerArm - 1, 0), 2);
  const depth = Math.min(Math.max(wrist - 1, 0), 2);
  
  return tableA[row][col][depth];
}

function getScoreB(neck: number, trunk: number): number {
  const tableB = [
    [1,2,3,5,6,7], // Neck 1
    [2,2,4,5,6,8], // Neck 2
    [3,3,4,5,6,8], // Neck 3
    [5,5,4,6,7,8], // Neck 4
    [6,6,6,7,7,8], // Neck 5
    [7,7,7,7,7,8]  // Neck 6
  ];
  
  const row = Math.min(Math.max(neck - 1, 0), 5);
  const col = Math.min(Math.max(trunk - 1, 0), 5);
  
  return tableB[row][col];
}

function getFinalScore(scoreA: number, scoreB: number): number {
  const finalTable = [
    [1,1,2,3,5,6,7,8], // Score A 1
    [1,2,2,3,5,6,7,8], // Score A 2
    [2,2,3,4,5,6,7,8], // Score A 3
    [3,3,3,4,5,6,7,8], // Score A 4
    [5,5,5,5,6,7,7,8], // Score A 5
    [6,6,6,6,6,7,7,8], // Score A 6
    [7,7,7,7,7,7,7,8], // Score A 7
    [8,8,8,8,8,8,8,8]  // Score A 8
  ];
  
  const row = Math.min(Math.max(scoreA - 1, 0), 7);
  const col = Math.min(Math.max(scoreB - 1, 0), 7);
  
  return finalTable[row][col];
}

function getRiskLevel(score: number): string {
  if (score <= 2) return "Low";
  if (score <= 4) return "Medium";
  if (score <= 6) return "High";
  return "Very High";
}

function getStressLevel(score: number): number {
  return Math.min(Math.max(Math.ceil(score), 1), 7);
}

export function calculateRulaScore(keypoints: Keypoint[]): RulaScore | null {
  try {
    if (!keypoints || keypoints.length < 13) {
      console.log('RULA: Insufficient keypoints', keypoints?.length);
      return null;
    }

    // Extract essential keypoints
    const nose = keypoints[0];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];

    // Validate keypoints
    const minConfidence = 0.2;
    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || 
        !leftWrist || !rightWrist || !leftHip || !rightHip || !nose) {
      console.log('RULA: Missing essential keypoints');
      return null;
    }

    if (leftShoulder.score < minConfidence || rightShoulder.score < minConfidence ||
        leftElbow.score < minConfidence || rightElbow.score < minConfidence ||
        leftWrist.score < minConfidence || rightWrist.score < minConfidence) {
      console.log('RULA: Low confidence keypoints');
      return null;
    }

    // Use the side with higher confidence
    const leftConfidence = (leftShoulder.score + leftElbow.score + leftWrist.score) / 3;
    const rightConfidence = (rightShoulder.score + rightElbow.score + rightWrist.score) / 3;
    const useLeft = leftConfidence >= rightConfidence;

    const shoulder = useLeft ? leftShoulder : rightShoulder;
    const elbow = useLeft ? leftElbow : rightElbow;
    const wrist = useLeft ? leftWrist : rightWrist;
    const hip = useLeft ? leftHip : rightHip;

    // Calculate angles with proper body mechanics
    const upperArmAngle = calculateVerticalAngle(shoulder, elbow);
    const lowerArmAngle = calculateAngle(shoulder, elbow, wrist);
    const wristFlexionAngle = calculateVerticalAngle(elbow, wrist) - 90;
    
    // Better neck angle calculation (from shoulder to head center)
    const headCenter = {
      x: nose.x,
      y: nose.y - 10, // Adjust for head center
      score: nose.score
    };
    const neckAngle = calculateVerticalAngle(shoulder, headCenter);
    
    // More accurate trunk angle calculation
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

    // Get RULA scores
    const upperArmScore = getUpperArmScore(upperArmAngle);
    const lowerArmScore = getLowerArmScore(lowerArmAngle);
    const wristScore = getWristScore(wristFlexionAngle);
    const neckScore = getNeckScore(neckAngle);
    const trunkScore = getTrunkScore(trunkAngle);

    // Calculate final scores
    const scoreA = getScoreA(upperArmScore, lowerArmScore, wristScore);
    const scoreB = getScoreB(neckScore, trunkScore);
    const finalScore = getFinalScore(scoreA, scoreB);
    const riskLevel = getRiskLevel(finalScore);
    const stressLevel = getStressLevel(finalScore);

    const result = {
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
      upperArmAngle: Math.round(upperArmAngle * 10) / 10,
      lowerArmAngle: Math.round(lowerArmAngle * 10) / 10,
      wristAngle: Math.round(wristFlexionAngle * 10) / 10,
      neckAngle: Math.round(neckAngle * 10) / 10,
      trunkAngle: Math.round(trunkAngle * 10) / 10
    };

    console.log('RULA calculation successful:', {
      angles: { upperArmAngle, lowerArmAngle, wristFlexionAngle, neckAngle, trunkAngle },
      scores: { upperArmScore, lowerArmScore, wristScore, neckScore, trunkScore },
      final: { scoreA, scoreB, finalScore, riskLevel }
    });
    return result;
    
  } catch (error) {
    console.error("Error calculating RULA score:", error);
    return null;
  }
}