
export function generatePostureAnalysis(rulaScore: any): string {
  const issues = [];
  const good = [];
  
  // Analyze upper arm
  if (rulaScore.upperArm >= 4) {
    issues.push("upper arm position is problematic (raised >90°)");
  } else if (rulaScore.upperArm >= 3) {
    issues.push("upper arm angle needs attention (45-90°)");
  } else {
    good.push("upper arm position");
  }
  
  // Analyze lower arm
  if (rulaScore.lowerArm >= 2) {
    issues.push("elbow angle is suboptimal (outside 60-100°)");
  } else {
    good.push("elbow angle");
  }
  
  // Analyze wrist
  if (rulaScore.wrist >= 3) {
    issues.push("wrist is severely bent or twisted");
  } else if (rulaScore.wrist >= 2) {
    issues.push("wrist deviation detected");
  } else {
    good.push("wrist alignment");
  }
  
  // Analyze neck
  if (rulaScore.neck >= 4) {
    issues.push("neck is severely forward or tilted (>45°)");
  } else if (rulaScore.neck >= 3) {
    issues.push("neck posture needs correction (20-45° forward)");
  } else if (rulaScore.neck >= 2) {
    issues.push("slight forward head posture detected");
  } else {
    good.push("neck position");
  }
  
  // Analyze trunk
  if (rulaScore.trunk >= 4) {
    issues.push("trunk is severely leaning or twisted (>60°)");
  } else if (rulaScore.trunk >= 3) {
    issues.push("trunk posture needs attention (20-60° lean)");
  } else if (rulaScore.trunk >= 2) {
    issues.push("slight trunk deviation from upright");
  } else {
    good.push("trunk alignment");
  }
  
  // Build analysis text
  let analysis = "";
  
  if (issues.length > 0) {
    analysis += "Issues detected: " + issues.slice(0, 2).join(", ");
    if (issues.length > 2) analysis += `, and ${issues.length - 2} more`;
    analysis += ". ";
  }
  
  if (good.length > 0) {
    analysis += "Good: " + good.slice(0, 2).join(", ");
    if (good.length > 2) analysis += `, +${good.length - 2} more`;
    analysis += ". ";
  }
  
  // Add recommendation
  if (rulaScore.finalScore >= 5) {
    analysis += "Immediate posture correction recommended.";
  } else if (rulaScore.finalScore >= 3) {
    analysis += "Consider adjusting posture soon.";
  } else {
    analysis += "Overall posture is acceptable.";
  }
  
  return analysis;
}

export function getRiskBorderColor(score: number): string {
  if (score <= 2) return '#00FF00'; // Green
  if (score <= 4) return '#FFFF00'; // Yellow
  if (score <= 6) return '#FF8000'; // Orange
  return '#FF0000'; // Red
}
