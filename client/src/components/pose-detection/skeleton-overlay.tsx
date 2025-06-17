import React, { useRef, useEffect } from 'react';

interface SkeletonOverlayProps {
  poseData: any;
  rulaScore: any;
  imageData?: string;
  width: number;
  height: number;
  showColorCoding?: boolean;
  weightEstimation?: any;
}

const KEYPOINT_CONNECTIONS = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
  [5, 11], [6, 12], [11, 12], // Torso
  [11, 13], [13, 15], [12, 14], [14, 16], // Legs
  [0, 1], [0, 2], [1, 3], [2, 4] // Head
];

export default function SkeletonOverlay({
  poseData,
  rulaScore,
  imageData,
  width,
  height,
  showColorCoding = true,
  weightEstimation
}: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !poseData?.keypoints) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Always draw background image if provided, otherwise use dark background
    if (imageData) {
      const img = new Image();
      img.onload = () => {
        // Draw image to fill the entire canvas
        ctx.drawImage(img, 0, 0, width, height);
        drawSkeleton();
        drawRulaOverlay();
      };
      img.src = imageData;
    } else {
      // Draw dark background for skeleton view
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);
      drawSkeleton();
      drawRulaOverlay();
    }

    function drawSkeleton() {
      if (!ctx || !poseData?.keypoints) return;

      const keypoints = poseData.keypoints;

      // Get color based on RULA score and body part
      const getJointColor = (jointIndex: number) => {
        if (!showColorCoding || !rulaScore) return '#00FF00'; // Default green

        // Color coding based on RULA components
        let riskLevel = 1;
        
        // Map joint to RULA component
        if ([5, 6, 7, 8].includes(jointIndex)) { // Arms (shoulders, elbows)
          riskLevel = Math.max(rulaScore.upperArm || 1, rulaScore.lowerArm || 1);
        } else if ([9, 10].includes(jointIndex)) { // Wrists
          riskLevel = rulaScore.wrist || 1;
        } else if ([0, 1, 2, 3, 4].includes(jointIndex)) { // Neck/Head
          riskLevel = rulaScore.neck || 1;
        } else if ([11, 12].includes(jointIndex)) { // Trunk
          riskLevel = rulaScore.trunk || 1;
        } else { // Legs (default to trunk score)
          riskLevel = rulaScore.trunk || 1;
        }

        // Adjust for weight bearing
        if (weightEstimation?.estimatedWeight > 5) {
          riskLevel = Math.min(riskLevel + 1, 7);
        }

        // Return color based on risk level
        if (riskLevel <= 2) return '#10B981'; // Green - low risk
        if (riskLevel <= 4) return '#F59E0B'; // Orange - medium risk
        if (riskLevel <= 6) return '#EF4444'; // Red - high risk
        return '#DC2626'; // Dark red - very high risk
      };

      // Draw connections
      KEYPOINT_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const startPoint = keypoints[startIdx];
        const endPoint = keypoints[endIdx];
        
        if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
          const color = getJointColor(startIdx);
          
          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(startPoint.x * width, startPoint.y * height);
          ctx.lineTo(endPoint.x * width, endPoint.y * height);
          ctx.stroke();
        }
      });

      // Draw keypoints
      keypoints.forEach((keypoint: any, index: number) => {
        if (keypoint && keypoint.score > 0.3) {
          const color = getJointColor(index);
          
          ctx.fillStyle = color;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.arc(keypoint.x * width, keypoint.y * height, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      });
    }

    function drawRulaOverlay() {
      if (!ctx || !rulaScore || !showColorCoding) return;

      // Draw RULA score information overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 120);

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.fillText('RULA Assessment', 20, 30);

      // Final score with color
      const finalScore = rulaScore.finalScore || 0;
      let scoreColor = '#10B981';
      if (finalScore > 4) scoreColor = '#EF4444';
      else if (finalScore > 2) scoreColor = '#F59E0B';

      ctx.fillStyle = scoreColor;
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`Score: ${finalScore}`, 20, 55);

      // Risk level
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText(`Risk: ${rulaScore.riskLevel || 'Unknown'}`, 20, 75);

      // Body part scores
      ctx.font = '10px Arial';
      ctx.fillText(`Arms: ${rulaScore.upperArm || 0}/${rulaScore.lowerArm || 0}`, 20, 95);
      ctx.fillText(`Wrist: ${rulaScore.wrist || 0} | Neck: ${rulaScore.neck || 0}`, 20, 110);
      ctx.fillText(`Trunk: ${rulaScore.trunk || 0}`, 20, 125);

      // Weight indication if present
      if (weightEstimation?.estimatedWeight > 0) {
        ctx.fillStyle = '#F59E0B';
        ctx.font = '10px Arial';
        ctx.fillText(`Weight: ${weightEstimation.estimatedWeight.toFixed(1)}kg`, 120, 95);
      }
    }

  }, [poseData, rulaScore, imageData, width, height, showColorCoding, weightEstimation]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}