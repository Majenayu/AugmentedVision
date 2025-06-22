
export function generatePostureAnalysis(rulaScore: any): string {
  const leftSideIssues = [];
  const rightSideIssues = [];
  const generalIssues = [];
  const goodPositions = [];
  
  // Analyze upper arm (left/right arm position)
  if (rulaScore.upperArm >= 4) {
    leftSideIssues.push("left arm is raised too high (>90° from body)");
  } else if (rulaScore.upperArm >= 3) {
    leftSideIssues.push("left arm angle needs adjustment (45-90° elevation)");
  } else if (rulaScore.upperArm >= 2) {
    leftSideIssues.push("left arm position could be improved");
  } else {
    goodPositions.push("left arm position is correct");
  }
  
  // Analyze lower arm (elbow/forearm)
  if (rulaScore.lowerArm >= 2) {
    rightSideIssues.push("right elbow angle is problematic (forearm not 60-100°)");
  } else {
    goodPositions.push("right elbow angle is proper");
  }
  
  // Analyze wrist
  if (rulaScore.wrist >= 3) {
    rightSideIssues.push("right wrist is severely bent or twisted");
  } else if (rulaScore.wrist >= 2) {
    rightSideIssues.push("right wrist has deviation from neutral");
  } else {
    goodPositions.push("right wrist alignment is good");
  }
  
  // Analyze neck (head position)
  if (rulaScore.neck >= 4) {
    generalIssues.push("head position is severely forward or tilted (>45°)");
  } else if (rulaScore.neck >= 3) {
    generalIssues.push("head position needs correction (20-45° forward lean)");
  } else if (rulaScore.neck >= 2) {
    generalIssues.push("slight forward head posture detected");
  } else {
    goodPositions.push("head position is aligned properly");
  }
  
  // Analyze trunk (back/spine)
  if (rulaScore.trunk >= 4) {
    generalIssues.push("back is severely leaning or twisted (>60° from upright)");
  } else if (rulaScore.trunk >= 3) {
    generalIssues.push("back posture needs attention (20-60° lean detected)");
  } else if (rulaScore.trunk >= 2) {
    generalIssues.push("slight back deviation from upright position");
  } else {
    goodPositions.push("back alignment is excellent");
  }
  
  // Build comprehensive analysis
  let analysis = "";
  
  // Report left side issues
  if (leftSideIssues.length > 0) {
    analysis += leftSideIssues.join(", ") + ". ";
  }
  
  // Report right side issues  
  if (rightSideIssues.length > 0) {
    analysis += rightSideIssues.join(", ") + ". ";
  }
  
  // Report general posture issues
  if (generalIssues.length > 0) {
    analysis += generalIssues.join(", ") + ". ";
  }
  
  // Report good positions
  if (goodPositions.length > 0) {
    analysis += "✓ " + goodPositions.slice(0, 2).join(", ");
    if (goodPositions.length > 2) {
      analysis += `, and ${goodPositions.length - 2} other aspects are correct`;
    }
    analysis += ". ";
  }
  
  // Add specific recommendation based on score
  if (rulaScore.finalScore >= 6) {
    analysis += "🚨 Immediate posture correction required to prevent injury.";
  } else if (rulaScore.finalScore >= 4) {
    analysis += "⚠️ Adjust posture soon to reduce ergonomic risk.";
  } else if (rulaScore.finalScore >= 3) {
    analysis += "💡 Minor adjustments recommended for optimal comfort.";
  } else {
    analysis += "✅ Overall posture is within acceptable ergonomic limits.";
  }
  
  return analysis;
}

export function getRiskBorderColor(score: number): string {
  if (score <= 2) return '#00FF00'; // Green
  if (score <= 4) return '#FFFF00'; // Yellow
  if (score <= 6) return '#FF8000'; // Orange
  return '#FF0000'; // Red
}
