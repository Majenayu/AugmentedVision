import { useEffect, useRef } from "react";
import { useThreeRenderer } from "@/lib/three-renderer";

interface ThreeDViewProps {
  poseData: any;
  rulaScore: any;
}

export default function ThreeDView({ poseData, rulaScore }: ThreeDViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { initializeScene, updatePose, resetView } = useThreeRenderer();

  useEffect(() => {
    if (containerRef.current) {
      initializeScene(containerRef.current);
    }
  }, [initializeScene]);

  useEffect(() => {
    if (poseData && poseData.keypoints) {
      updatePose(poseData.keypoints, rulaScore);
    }
  }, [poseData, rulaScore, updatePose]);

  return (
    <div className="bg-dark-card rounded-lg shadow-lg overflow-hidden">
      <div className="bg-dark-secondary px-4 py-3 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <span className="material-icon text-blue-400">view_in_ar</span>
            <span>3D Skeleton View</span>
          </h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={resetView}
              className="p-1 hover:bg-gray-600 rounded transition-colors"
              title="Reset View"
            >
              <span className="material-icon text-sm">refresh</span>
            </button>
            <button 
              className="p-1 hover:bg-gray-600 rounded transition-colors"
              title="Toggle Controls"
            >
              <span className="material-icon text-sm">tune</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div 
          ref={containerRef}
          className="w-full h-96 bg-gray-900"
          style={{ aspectRatio: '16/9' }}
        />
        
        {/* 3D Controls Overlay */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors">
              <span className="material-icon text-xs">rotate_left</span>
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors">
              <span className="material-icon text-xs">rotate_right</span>
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors">
              <span className="material-icon text-xs">zoom_in</span>
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors">
              <span className="material-icon text-xs">zoom_out</span>
            </button>
          </div>
        </div>

        {/* RULA Score Overlay */}
        {rulaScore && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 rounded-lg p-3">
            <div className="text-white text-sm">
              <div className="flex items-center space-x-2 mb-1">
                <span className="material-icon text-xs">assessment</span>
                <span className="font-semibold">RULA Score: {rulaScore.finalScore}</span>
              </div>
              <div className="text-xs text-gray-300">
                Risk Level: {rulaScore.riskLevel}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
