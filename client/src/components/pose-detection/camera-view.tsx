import { useEffect, useRef } from "react";

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  cameraActive: boolean;
  poseData: any;
}

export default function CameraView({ videoRef, canvasRef, cameraActive, poseData }: CameraViewProps) {
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (poseData.keypoints && poseData.keypoints.length > 0) {
      const keypoints = poseData.keypoints;
      
      // Draw connections
      const connections = [
        [0, 1], [0, 2], [1, 3], [2, 4], // Head
        [5, 6], // Shoulders
        [5, 7], [7, 9], // Left arm
        [6, 8], [8, 10], // Right arm
        [5, 11], [6, 12], // Torso
        [11, 12], // Hips
        [11, 13], [13, 15], // Left leg
        [12, 14], [14, 16] // Right leg
      ];

      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;

      connections.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];
        
        if (kp1?.score > 0.3 && kp2?.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(kp1.x * canvas.width, kp1.y * canvas.height);
          ctx.lineTo(kp2.x * canvas.width, kp2.y * canvas.height);
          ctx.stroke();
        }
      });

      // Draw keypoints
      keypoints.forEach((keypoint: any, index: number) => {
        if (keypoint.score > 0.3) {
          const x = keypoint.x * canvas.width;
          const y = keypoint.y * canvas.height;
          
          ctx.fillStyle = index < 5 ? '#EF4444' : '#10B981'; // Red for head, green for body
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add confidence score
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '10px Arial';
          ctx.fillText(`${Math.round(keypoint.score * 100)}%`, x + 8, y - 8);
        }
      });
    }
  }, [poseData, canvasRef]);

  return (
    <div className="bg-dark-card rounded-lg shadow-lg overflow-hidden">
      <div className="bg-dark-secondary px-4 py-3 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <span className="material-icon text-green-500">videocam</span>
            <span>Live Camera Feed</span>
          </h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-text-secondary">
              <span className="material-icon text-xs">speed</span>
              <span>Real-time</span>
            </div>
          </div>
        </div>
      </div>
      
      <div ref={containerRef} className="relative aspect-video bg-gray-900">
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
          style={{ transform: 'scaleX(-1)' }} // Mirror the overlay
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
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Detecting Pose... {poseData.keypoints?.length || 0} keypoints</span>
            </div>
          </div>
        )}
        
        {/* Camera Info Overlay */}
        {cameraActive && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 rounded-lg p-2">
            <div className="text-xs text-white space-y-1">
              <div className="flex items-center space-x-2">
                <span className="material-icon text-xs">camera</span>
                <span>1280x720</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="material-icon text-xs">person</span>
                <span>{poseData ? '1 person detected' : 'No pose detected'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
