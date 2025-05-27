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

function getPostureScore(angle: number, type: 'upperArm' | 'lowerArm' | 'wrist' | 'neck' | 'trunk'): number {
  switch (type) {
    case 'upperArm':
      // Based on shoulder elevation angle
      if (angle < 20) return 1;
      if (angle < 45) return 2;
      if (angle < 90) return 3;
      return 4;
      
    case 'lowerArm':
      // Based on elbow angle
      if (angle > 60 && angle < 100) return 1;
      return 2;
      
    case 'wrist':
      // Based on wrist position
      if (angle > 165 && angle < 195) return 1; // Neutral
      if (angle > 150 && angle < 210) return 2;
      return 3;
      
    case 'neck':
      // Based on neck flexion
      if (angle > 170) return 1; // Upright
      if (angle > 160) return 2;
      if (angle > 140) return 3;
      return 4;
      
    case 'trunk':
      // Based on trunk flexion
      if (angle > 175) return 1; // Upright
      if (angle > 160) return 2;
      if (angle > 140) return 3;
      return 4;
      
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

    // Calculate angles for posture assessment
    const upperArmAngle = Math.abs(shoulder.y - elbow.y) * 180; // Simplified shoulder elevation
    const lowerArmAngle = calculateAngle(shoulder, elbow, wrist);
    const wristAngle = 180 - Math.abs(elbow.x - wrist.x) * 50; // Simplified wrist angle
    const neckAngle = 180 - Math.abs(nose.y - shoulder.y) * 100; // Neck flexion
    const trunkAngle = 180 - Math.abs(shoulder.y - hip.y) * 80; // Trunk angle

    // Get RULA scores
    const upperArmScore = getPostureScore(upperArmAngle, 'upperArm');
    const lowerArmScore = getPostureScore(lowerArmAngle, 'lowerArm');
    const wristScore = getPostureScore(wristAngle, 'wrist');
    const neckScore = getPostureScore(neckAngle, 'neck');
    const trunkScore = getPostureScore(trunkAngle, 'trunk');

    return calculateFinalScore(upperArmScore, lowerArmScore, wristScore, neckScore, trunkScore);
    
  } catch (error) {
    console.error("Error calculating RULA score:", error);
    return null;
  }
}