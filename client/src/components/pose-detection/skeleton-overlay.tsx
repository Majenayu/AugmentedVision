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

const KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
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

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background image if provided
    if (imageData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        drawSkeleton();
      };
      img.src = imageData;
    } else {
      drawSkeleton();
    }

    function drawSkeleton() {
      if (!ctx || !poseData?.keypoints) return;

      const keypoints = poseData.keypoints;

      // Get color based on RULA score and weight
      const getJointColor = (jointIndex: number) => {
        if (!showColorCoding) return '#00FF00'; // Default green

        // Color coding based on RULA components and weight
        let riskLevel = 1;
        
        if (rulaScore) {
          // Map joint to RULA component
          if ([5, 6, 7, 8].includes(jointIndex)) { // Arms
            riskLevel = Math.max(rulaScore.upperArm || 1, rulaScore.lowerArm || 1);
          } else if ([9, 10].includes(jointIndex)) { // Wrists
            riskLevel = rulaScore.wrist || 1;
          } else if ([0, 1, 2, 3, 4].includes(jointIndex)) { // Neck/Head
            riskLevel = rulaScore.neck || 1;
          } else if ([11, 12].includes(jointIndex)) { // Trunk
            riskLevel = rulaScore.trunk || 1;
          }

          // Adjust for weight bearing
          if (weightEstimation?.estimatedWeight > 5) {
            riskLevel = Math.min(6, riskLevel + 1);
          }
        }

        // Color mapping
        if (riskLevel <= 2) return '#00FF00'; // Green - Safe
        if (riskLevel <= 3) return '#FFFF00'; // Yellow - Caution
        if (riskLevel <= 4) return '#FFA500'; // Orange - Warning
        return '#FF0000'; // Red - Danger
      };

      // Draw connections
      KEYPOINT_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const startPoint = keypoints[startIdx];
        const endPoint = keypoints[endIdx];

        if (startPoint?.score > 0.3 && endPoint?.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x * width, startPoint.y * height);
          ctx.lineTo(endPoint.x * width, endPoint.y * height);
          ctx.strokeStyle = getJointColor(startIdx);
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      });

      // Draw keypoints
      keypoints.forEach((keypoint: any, index: number) => {
        if (keypoint.score > 0.3) {
          const x = keypoint.x * width;
          const y = keypoint.y * height;

          // Draw keypoint circle
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = getJointColor(index);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw keypoint label
          if (showColorCoding) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.fillText(KEYPOINT_NAMES[index] || `${index}`, x + 8, y - 8);
          }
        }
      });

      // Draw RULA score overlay
      if (rulaScore && showColorCoding) {
        drawRulaOverlay();
      }
    }

    function drawRulaOverlay() {
      if (!ctx || !rulaScore) return;

      // Draw RULA score box with enhanced information
      const boxWidth = 220;
      const boxHeight = weightEstimation ? 150 : 120;
      const boxX = width - boxWidth - 10;
      const boxY = 10;

      // Background with transparency
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('RULA Assessment', boxX + 10, boxY + 20);

      // Final score with color coding
      const finalScore = rulaScore.finalScore || 0;
      let scoreColor = '#00FF00';
      if (finalScore > 4) scoreColor = '#FF0000';
      else if (finalScore > 2) scoreColor = '#FFA500';

      ctx.fillStyle = scoreColor;
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`Score: ${finalScore}`, boxX + 10, boxY + 50);

      // Risk level
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText(`Risk: ${rulaScore.riskLevel || 'Unknown'}`, boxX + 10, boxY + 70);

      // Component scores
      let yOffset = 85;
      const components = [
        { label: 'Upper Arm', value: rulaScore.upperArm },
        { label: 'Lower Arm', value: rulaScore.lowerArm },
        { label: 'Wrist', value: rulaScore.wrist },
        { label: 'Neck', value: rulaScore.neck },
        { label: 'Trunk', value: rulaScore.trunk }
      ];

      components.forEach(comp => {
        if (comp.value) {
          ctx.fillStyle = '#CCCCCC';
          ctx.font = '10px Arial';
          ctx.fillText(`${comp.label}: ${comp.value}`, boxX + 10, boxY + yOffset);
          yOffset += 12;
        }
      });

      // Weight estimation info
      if (weightEstimation && showColorCoding) {
        ctx.fillStyle = '#FFFF00';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`Weight: ${weightEstimation.estimatedWeight?.toFixed(1) || 0}kg`, boxX + 10, boxY + yOffset + 5);
        
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '10px Arial';
        ctx.fillText(`Confidence: ${Math.round((weightEstimation.confidence || 0) * 100)}%`, boxX + 10, boxY + yOffset + 20);
      }

      // Color legend
      const legendY = boxY + boxHeight + 10;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px Arial';
      ctx.fillText('Color Legend:', boxX, legendY);
      
      const legendItems = [
        { color: '#00FF00', label: 'Safe (1-2)' },
        { color: '#FFFF00', label: 'Caution (3)' },
        { color: '#FFA500', label: 'Warning (4)' },
        { color: '#FF0000', label: 'Danger (5+)' }
      ];

      legendItems.forEach((item, index) => {
        const x = boxX + (index * 50);
        const y = legendY + 15;
        
        ctx.fillStyle = item.color;
        ctx.fillRect(x, y, 10, 10);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '8px Arial';
        ctx.fillText(item.label, x, y + 20);
      });
    }
  }, [poseData, rulaScore, imageData, width, height, showColorCoding, weightEstimation]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}