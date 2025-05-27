interface MetricsDashboardProps {
  fps: number;
  confidence: number;
  sessionDuration: string;
  rulaScore: any;
  poseData: any;
}

export default function MetricsDashboard({ 
  fps, 
  confidence, 
  sessionDuration, 
  rulaScore, 
  poseData 
}: MetricsDashboardProps) {
  const inferenceTime = fps > 0 ? Math.round(1000 / fps) : 0;
  const keypointsDetected = poseData?.keypoints ? 
    poseData.keypoints.filter((kp: any) => kp.score > 0.3).length : 0;
  const totalKeypoints = 17; // MoveNet has 17 keypoints

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {/* Performance Metrics */}
      <div className="bg-dark-card rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium">Performance</h4>
          <span className="material-icon text-material-blue">speed</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Inference Time</span>
            <span className="font-mono">{inferenceTime}ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Frame Rate</span>
            <span className="font-mono">{fps} FPS</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Model Accuracy</span>
            <span className="font-mono text-green-400">{confidence}%</span>
          </div>
        </div>
      </div>

      {/* Pose Tracking */}
      <div className="bg-dark-card rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium">Pose Tracking</h4>
          <span className="material-icon text-green-500">track_changes</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Keypoints Detected</span>
            <span className="font-mono">{keypointsDetected}/{totalKeypoints}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Tracking Stability</span>
            <span className={`font-mono ${
              keypointsDetected >= 15 ? 'text-green-400' : 
              keypointsDetected >= 10 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {keypointsDetected >= 15 ? 'Stable' : 
               keypointsDetected >= 10 ? 'Partial' : 'Unstable'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Session Duration</span>
            <span className="font-mono">{sessionDuration}</span>
          </div>
        </div>
      </div>

      {/* Analysis History */}
      <div className="bg-dark-card rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium">Analysis History</h4>
          <span className="material-icon text-purple-500">history</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Current RULA Score</span>
            <span className="font-mono">{rulaScore?.finalScore || '--'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Risk Level</span>
            <span className={`font-mono text-sm ${
              !rulaScore ? 'text-gray-400' :
              rulaScore.finalScore <= 2 ? 'text-green-400' :
              rulaScore.finalScore <= 4 ? 'text-yellow-400' :
              rulaScore.finalScore <= 6 ? 'text-orange-400' : 'text-red-400'
            }`}>
              {rulaScore ? (
                rulaScore.finalScore <= 2 ? 'Low' :
                rulaScore.finalScore <= 4 ? 'Medium' :
                rulaScore.finalScore <= 6 ? 'High' : 'Critical'
              ) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Detection Quality</span>
            <span className={`font-mono ${
              confidence >= 80 ? 'text-green-400' :
              confidence >= 60 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {confidence >= 80 ? 'Excellent' :
               confidence >= 60 ? 'Good' : 'Poor'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
