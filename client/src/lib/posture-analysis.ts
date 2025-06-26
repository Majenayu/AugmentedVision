
export function generatePostureAnalysis(rebaScore: any, context?: 'live' | 'recorded' | 'manual' | 'estimated'): string {
  if (!rebaScore) return "No posture data available for analysis.";
  
  const leftArmIssues = [];
  const rightArmIssues = [];
  const headIssues = [];
  const backIssues = [];
  const goodAspects = [];
  
  // Analyze upper arm position
  if (rebaScore.upperArm >= 4) {
    leftArmIssues.push("🔴 Left arm is raised excessively high (>90° from body) - lower your arm");
  } else if (rebaScore.upperArm >= 3) {
    leftArmIssues.push("🟡 Left arm angle needs adjustment (currently 45-90° elevation)");
  } else if (rebaScore.upperArm >= 2) {
    leftArmIssues.push("🟠 Left arm position could be improved slightly");
  } else {
    goodAspects.push("✅ Left arm position is correct");
  }
  
  // Analyze lower arm (elbow angle)
  if (rebaScore.lowerArm >= 2) {
    rightArmIssues.push("🔴 Right elbow angle is problematic - adjust forearm to 60-100° angle");
  } else {
    goodAspects.push("✅ Right elbow angle is proper");
  }
  
  // Analyze wrist position
  if (rebaScore.wrist >= 3) {
    rightArmIssues.push("🔴 Right wrist is severely bent or twisted - straighten wrist alignment");
  } else if (rebaScore.wrist >= 2) {
    rightArmIssues.push("🟡 Right wrist has deviation from neutral position");
  } else {
    goodAspects.push("✅ Right wrist alignment is good");
  }
  
  // Analyze head/neck position
  if (rebaScore.neck >= 4) {
    headIssues.push("🔴 Head position is severely forward or tilted (>45°) - pull head back");
  } else if (rebaScore.neck >= 3) {
    headIssues.push("🟡 Head position needs correction (20-45° forward lean detected)");
  } else if (rebaScore.neck >= 2) {
    headIssues.push("🟠 Slight forward head posture detected");
  } else {
    goodAspects.push("✅ Head position is aligned properly");
  }
  
  // Analyze back/trunk position
  if (rebaScore.trunk >= 4) {
    backIssues.push("🔴 Back is severely leaning or twisted (>60° from upright) - sit up straight");
  } else if (rebaScore.trunk >= 3) {
    backIssues.push("🟡 Back posture needs attention (20-60° lean detected)");
  } else if (rebaScore.trunk >= 2) {
    backIssues.push("🟠 Slight back deviation from upright position");
  } else {
    goodAspects.push("✅ Back alignment is excellent");
  }
  
  // Build detailed analysis with context awareness
  const contextPrefix = context === 'recorded' ? "📸 RECORDED FRAME ANALYSIS: " : 
                       context === 'manual' ? "⚖️ WEIGHT-ADJUSTED ANALYSIS: " :
                       context === 'estimated' ? "🤖 ESTIMATED WEIGHT ANALYSIS: " :
                       "📊 POSTURAL ANALYSIS: ";
  
  let analysis = contextPrefix;
  
  // Report issues by body part
  const allIssues = [...leftArmIssues, ...rightArmIssues, ...headIssues, ...backIssues];
  if (allIssues.length > 0) {
    analysis += allIssues.join(". ") + ". ";
  }
  
  // Report what's working well
  if (goodAspects.length > 0) {
    analysis += "\n\n" + goodAspects.join(". ") + ". ";
  }
  
  // Add context-specific recommendations
  analysis += "\n\n📋 PRIORITY ACTION: ";
  if (rebaScore.finalScore >= 6) {
    analysis += "🚨 IMMEDIATE correction required! High injury risk detected.";
    if (context === 'recorded') {
      analysis += " Review this posture and avoid repeating it.";
    }
  } else if (rebaScore.finalScore >= 4) {
    analysis += "⚠️ Adjust posture SOON to reduce ergonomic risk.";
    if (context === 'manual' || context === 'estimated') {
      analysis += " Consider reducing load or improving technique.";
    }
  } else if (rebaScore.finalScore >= 3) {
    analysis += "💡 Minor adjustments recommended for optimal comfort.";
  } else {
    analysis += "✅ Overall posture is GOOD - maintain current position.";
    if (context === 'recorded') {
      analysis += " This is a good reference posture.";
    }
  }
  
  // Add weight-specific advice for manual/estimated modes
  if ((context === 'manual' || context === 'estimated') && rebaScore.effectiveWeight) {
    analysis += `\n\n⚖️ LOAD CONSIDERATION: Handling ${rebaScore.effectiveWeight}kg affects your posture risk significantly. Consider breaking down the load or using mechanical aids.`;
  }
  
  return analysis;
}

export function getRiskBorderColor(score: number): string {
  if (score <= 2) return '#00FF00'; // Green
  if (score <= 4) return '#FFFF00'; // Yellow
  if (score <= 6) return '#FF8000'; // Orange
  return '#FF0000'; // Red
}
