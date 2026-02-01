interface MetricsDashboardProps {
  fps: number;
  sessionDuration: string;
  rebaScore: any;
  poseData: any;
}

export default function MetricsDashboard({ 
  fps, 
  sessionDuration, 
  rebaScore, 
  poseData 
}: MetricsDashboardProps) {
  const inferenceTime = fps > 0 ? Math.round(1000 / fps) : 0;
  const keypointsDetected = poseData?.keypoints ? 
    poseData.keypoints.filter((kp: any) => kp.score > 0.3).length : 0;
  const totalKeypoints = 17; // MoveNet has 17 keypoints

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6">
      {/* Performance Metrics */}
      <div className="bg-dark-card rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h4 className="text-sm sm:text-lg font-medium">Performance</h4>
          <span className="material-icon text-material-blue text-lg sm:text-2xl">speed</span>
        </div>
        <div className="space-y-2 sm:space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-xs sm:text-base">Inference Time</span>
            <span className="font-mono text-xs sm:text-base">{inferenceTime}ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-xs sm:text-base">Frame Rate</span>
            <span className="font-mono text-xs sm:text-base">{fps} FPS</span>
          </div>

        </div>
      </div>

      {/* Pose Tracking */}
      <div className="bg-dark-card rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h4 className="text-sm sm:text-lg font-medium">Pose Tracking</h4>
          <span className="material-icon text-green-500 text-lg sm:text-2xl">track_changes</span>
        </div>
        <div className="space-y-2 sm:space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-xs sm:text-base">Keypoints</span>
            <span className="font-mono text-xs sm:text-base">{keypointsDetected}/{totalKeypoints}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-xs sm:text-base">Stability</span>
            <span className={`font-mono text-xs sm:text-base ${
              keypointsDetected >= 15 ? 'text-green-400' : 
              keypointsDetected >= 10 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {keypointsDetected >= 15 ? 'Stable' : 
               keypointsDetected >= 10 ? 'Partial' : 'Unstable'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-xs sm:text-base">Duration</span>
            <span className="font-mono text-xs sm:text-base">{sessionDuration}</span>
          </div>
        </div>
      </div>

      {/* Analysis History */}
      <div className="bg-dark-card rounded-lg shadow-lg p-4 sm:p-6 sm:col-span-2 md:col-span-1">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h4 className="text-sm sm:text-lg font-medium">Analysis History</h4>
          <span className="material-icon text-purple-500 text-lg sm:text-2xl">history</span>
        </div>
        <div className="space-y-2 sm:space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-xs sm:text-base">REBA Score</span>
            <span className="font-mono text-xs sm:text-base">{rebaScore?.finalScore || '--'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-xs sm:text-base">Risk Level</span>
            <span className={`font-mono text-xs sm:text-sm ${
              !rebaScore ? 'text-gray-400' :
              rebaScore.finalScore <= 2 ? 'text-green-400' :
              rebaScore.finalScore <= 4 ? 'text-yellow-400' :
              rebaScore.finalScore <= 6 ? 'text-orange-400' : 'text-red-400'
            }`}>
              {rebaScore ? (
                rebaScore.finalScore <= 2 ? 'Low' :
                rebaScore.finalScore <= 4 ? 'Medium' :
                rebaScore.finalScore <= 6 ? 'High' : 'Critical'
              ) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-xs sm:text-base">Quality</span>
            <span className={`font-mono text-xs sm:text-base ${
              keypointsDetected >= 15 ? 'text-green-400' :
              keypointsDetected >= 10 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {keypointsDetected >= 15 ? 'Excellent' :
               keypointsDetected >= 10 ? 'Good' : 'Poor'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
