// Simplified RULA (Rapid Upper Limb Assessment) calculation
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

function calculateAngle(p1: Keypoint, p2: Keypoint, p3: Keypoint): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 90;
  
  const cosAngle = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

function getPostureScore(deviation: number, type: 'upperArm' | 'lowerArm' | 'wrist' | 'neck' | 'trunk'): number {
  switch (type) {
    case 'upperArm':
      // Based on arm elevation from neutral position
      if (deviation < 0.1) return 1; // Arms down
      if (deviation < 0.25) return 2; // Slight elevation
      if (deviation < 0.4) return 3; // Moderate elevation
      return 4; // High elevation
      
    case 'lowerArm':
      // Based on elbow position
      if (deviation < 0.15) return 1; // Natural position
      return 2; // Extended or extreme flexion
      
    case 'wrist':
      // Based on wrist deviation from straight
      if (deviation < 0.1) return 1; // Straight
      if (deviation < 0.2) return 2; // Slight bend
      return 3; // Extreme bend
      
    case 'neck':
      // Based on head position
      if (deviation < 0.08) return 1; // Upright
      if (deviation < 0.15) return 2; // Slight forward
      if (deviation < 0.25) return 3; // Forward lean
      return 4; // Extreme forward
      
    case 'trunk':
      // Based on body lean
      if (deviation < 0.05) return 1; // Upright
      if (deviation < 0.12) return 2; // Slight lean
      if (deviation < 0.2) return 3; // Moderate lean
      return 4; // Extreme lean
      
    default:
      return 1;
  }
}

function calculateFinalScore(upperArm: number, lowerArm: number, wrist: number, neck: number, trunk: number): RulaScore {
  // Simplified RULA table lookup
  const scoreA = Math.min(upperArm + lowerArm + wrist - 2, 8);
  const scoreB = Math.min(neck + trunk - 1, 7);
  const finalScore = Math.min(scoreA + scoreB - 1, 7);
  
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

  // Filter for good confidence keypoints
  const validKeypoints = keypoints.filter(kp => kp.score > 0.3);
  if (validKeypoints.length < 8) {
    return null;
  }

  try {
    // Extract keypoints (MoveNet indices)
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

    // Calculate deviations for posture assessment (more accurate)
    const upperArmDeviation = Math.abs(shoulder.y - elbow.y); // Arm elevation
    const lowerArmDeviation = Math.abs(calculateAngle(shoulder, elbow, wrist) - 90) / 90; // Elbow deviation from 90°
    const wristDeviation = Math.abs(elbow.x - wrist.x); // Wrist lateral deviation
    const neckDeviation = Math.abs(nose.y - shoulder.y); // Head forward position
    const trunkDeviation = Math.abs(shoulder.y - hip.y - 0.3); // Trunk deviation from upright

    // Get RULA scores
    const upperArmScore = getPostureScore(upperArmDeviation, 'upperArm');
    const lowerArmScore = getPostureScore(lowerArmDeviation, 'lowerArm');
    const wristScore = getPostureScore(wristDeviation, 'wrist');
    const neckScore = getPostureScore(neckDeviation, 'neck');
    const trunkScore = getPostureScore(trunkDeviation, 'trunk');

    return calculateFinalScore(upperArmScore, lowerArmScore, wristScore, neckScore, trunkScore);
    
  } catch (error) {
    console.error("Error calculating RULA score:", error);
    return null;
  }
}