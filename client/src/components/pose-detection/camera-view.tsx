import { useEffect, useRef } from "react";

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  cameraActive: boolean;
  poseData: any;
  assessmentMode?: 'RULA' | 'REBA';
}

export default function CameraView({ videoRef, canvasRef, cameraActive, poseData, assessmentMode = 'REBA' }: CameraViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasRef.current && videoRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const container = containerRef.current;
      
      // Set canvas size to match container
      const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      };
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [canvasRef, videoRef]);

  // Draw pose keypoints and connections
  useEffect(() => {
    if (!poseData || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (poseData.keypoints && poseData.keypoints.length > 0) {
      const keypoints = poseData.keypoints;
      
      // Use appropriate connections based on assessment mode
      const rulaConnections = [
        [0, 1], [0, 2], [1, 3], [2, 4], // Head/neck
        [5, 6], // Shoulders
        [5, 7], [7, 9], // Left arm
        [6, 8], [8, 10], // Right arm
        [5, 11], [6, 12], // Shoulders to hips
        [11, 12], // Hip connection
      ];
      
      const rebaConnections = [
        [0, 1], [0, 2], [1, 3], [2, 4], // Head
        [5, 6], // Shoulders
        [5, 7], [7, 9], // Left arm
        [6, 8], [8, 10], // Right arm
        [5, 11], [6, 12], // Torso
        [11, 12], // Hips
        [11, 13], [13, 15], // Left leg
        [12, 14], [14, 16] // Right leg
      ];
      
      const connections = assessmentMode === 'RULA' ? rulaConnections : rebaConnections;

      const confidenceThreshold = 0.3;
      
      // Calculate scaling factors
      const videoAspect = video.videoWidth / video.videoHeight;
      const canvasAspect = canvas.width / canvas.height;
      
      let scaleX, scaleY, offsetX = 0, offsetY = 0;
      
      if (videoAspect > canvasAspect) {
        // Video is wider - fit to height
        scaleY = canvas.height;
        scaleX = canvas.height * videoAspect;
        offsetX = (canvas.width - scaleX) / 2;
      } else {
        // Video is taller - fit to width
        scaleX = canvas.width;
        scaleY = canvas.width / videoAspect;
        offsetY = (canvas.height - scaleY) / 2;
      }
      
      // Helper function to transform coordinates
      const transformCoordinates = (x: number, y: number) => {
        let transformedX, transformedY;
        
        // Handle different coordinate systems
        if (x > 1 || y > 1) {
          // Absolute coordinates - normalize first
          transformedX = (x / video.videoWidth) * scaleX + offsetX;
          transformedY = (y / video.videoHeight) * scaleY + offsetY;
        } else {
          // Normalized coordinates (0-1)
          transformedX = x * scaleX + offsetX;
          transformedY = y * scaleY + offsetY;
        }
        
        // Since canvas is mirrored, flip X coordinate
        transformedX = canvas.width - transformedX;
        
        return { x: transformedX, y: transformedY };
      };

      // Draw connections
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;

      let connectionsDrawn = 0;
      
      connections.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];
        
        if (kp1 && kp2 && kp1.score > confidenceThreshold && kp2.score > confidenceThreshold) {
          const pos1 = transformCoordinates(kp1.x, kp1.y);
          const pos2 = transformCoordinates(kp2.x, kp2.y);
          
          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          ctx.lineTo(pos2.x, pos2.y);
          ctx.stroke();
          connectionsDrawn++;
        }
      });

      // Define which keypoints to show based on assessment mode
      const visibleKeypoints = assessmentMode === 'RULA' 
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] // Head, neck, shoulders, arms, wrists, hips
        : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]; // All keypoints for REBA

      // Draw keypoints - only show relevant ones
      let keypointsDrawn = 0;
      keypoints.forEach((keypoint: any, index: number) => {
        if (keypoint && keypoint.score > confidenceThreshold && visibleKeypoints.includes(index)) {
          const pos = transformCoordinates(keypoint.x, keypoint.y);
          
          // Different colors for different body parts
          let color;
          if (index <= 4) {
            color = '#EF4444'; // Red for face
          } else if (index <= 10) {
            color = '#3B82F6'; // Blue for arms
          } else {
            color = '#10B981'; // Green for legs/torso
          }
          
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add white border for better visibility
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Add confidence score (optional - comment out if too cluttered)
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '10px Arial';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 2;
          ctx.fillText(`${Math.round(keypoint.score * 100)}%`, pos.x + 8, pos.y - 8);
          ctx.shadowBlur = 0;
          
          keypointsDrawn++;
        }
      });
      
      // Draw debug info on canvas (optional)
      ctx.fillStyle = '#FFFF00';
      ctx.font = '14px Arial';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 2;
      ctx.fillText(`Points: ${keypointsDrawn} | Lines: ${connectionsDrawn}`, 10, 25);
      ctx.shadowBlur = 0;
      
      console.log(`Drew ${keypointsDrawn} keypoints and ${connectionsDrawn} connections`);
    }
  }, [poseData, canvasRef]);

  return (
    <div className="bg-dark-card rounded-lg shadow-lg overflow-hidden">
      <div className="bg-dark-secondary px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-lg font-medium flex items-center space-x-1 sm:space-x-2">
            <span className="material-icon text-green-500 text-base sm:text-2xl">videocam</span>
            <span>Live Camera Feed</span>
          </h3>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="flex items-center space-x-1 text-xs sm:text-sm text-text-secondary">
              <span className="material-icon text-xs">speed</span>
              <span>Real-time</span>
            </div>
          </div>
        </div>
      </div>
      
      <div ref={containerRef} className="relative aspect-video bg-gray-900 min-h-[200px] sm:min-h-[300px]">
        <video 
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay 
          muted 
          playsInline
          style={{ transform: 'scaleX(-1)' }} // Mirror the video
        />
        
        <canvas 
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          // Canvas is NOT mirrored - we handle mirroring in the coordinate transformation
        />
        
        {/* Camera Off State */}
        {!cameraActive && (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-white">
            <span className="material-icon text-6xl text-gray-600 mb-4">videocam_off</span>
            <h3 className="text-xl font-semibold mb-2">Camera Not Active</h3>
            <p className="text-gray-400 text-center">Click "Start Camera" to begin pose detection</p>
          </div>
        )}
        
        {/* Pose Detection Overlay */}
        {cameraActive && poseData && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-black bg-opacity-50 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Detecting... {poseData.keypoints?.length || 0} pts</span>
            </div>
          </div>
        )}
        
        {/* Camera Info Overlay */}
        {cameraActive && (
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black bg-opacity-50 rounded-lg p-1.5 sm:p-2">
            <div className="text-[10px] sm:text-xs text-white space-y-0.5 sm:space-y-1">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="material-icon text-[10px] sm:text-xs">camera</span>
                <span>{videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="material-icon text-[10px] sm:text-xs">person</span>
                <span className="hidden sm:inline">{poseData?.keypoints?.length > 0 ? '1 person detected' : 'No pose detected'}</span>
                <span className="sm:hidden">{poseData?.keypoints?.length > 0 ? '1 person' : 'No pose'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}