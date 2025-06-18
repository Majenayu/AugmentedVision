import React, { useRef, useEffect } from 'react';

interface SkeletonOverlayProps {
  poseData: any;
  rulaScore: any;
  imageData?: string;
  width: number;
  height: number;
  showColorCoding?: boolean;
  weightEstimation?: any;
  skeletonOnly?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
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
  weightEstimation,
  skeletonOnly = false,
  videoRef
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

    // Draw background image if provided and not skeleton-only mode
    if (imageData && !skeletonOnly) {
      const img = new Image();
      img.onload = () => {
        // Calculate how to draw the image to maintain aspect ratio
        const imgAspect = img.width / img.height;
        const canvasAspect = width / height;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspect > canvasAspect) {
          // Image is wider - fit to width, center vertically
          drawWidth = width;
          drawHeight = width / imgAspect;
          drawX = 0;
          drawY = (height - drawHeight) / 2;
        } else {
          // Image is taller - fit to height, center horizontally
          drawWidth = height * imgAspect;
          drawHeight = height;
          drawX = (width - drawWidth) / 2;
          drawY = 0;
        }

        // Clear canvas and draw image with proper aspect ratio
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // Draw skeleton aligned to the image
        drawSkeleton(0, 0, width, height);
      };
      img.src = imageData;
    } else {
      // For skeleton-only mode or no image, just draw skeleton with proper scaling
      drawSkeleton(0, 0, width, height);
    }

    function drawSkeleton(offsetX = 0, offsetY = 0, drawWidth = width, drawHeight = height) {
      if (!ctx || !poseData?.keypoints) return;

      const keypoints = poseData.keypoints;

      // Calculate proper scaling for live camera feed
      if (imageData && !skeletonOnly) {
        // For recorded images with background
        const img = new Image();
        img.onload = () => {
          const imgAspect = img.width / img.height;
          const canvasAspect = drawWidth / drawHeight;

          let scaleX, scaleY, actualOffsetX, actualOffsetY;

          if (imgAspect > canvasAspect) {
            // Image is wider - fit to width, center vertically
            scaleX = drawWidth;
            scaleY = drawWidth / imgAspect;
            actualOffsetX = offsetX;
            actualOffsetY = offsetY + (drawHeight - scaleY) / 2;
          } else {
            // Image is taller - fit to height, center horizontally
            scaleX = drawHeight * imgAspect;
            scaleY = drawHeight;
            actualOffsetX = offsetX + (drawWidth - scaleX) / 2;
            actualOffsetY = offsetY;
          }

          drawSkeletonWithScaling(actualOffsetX, actualOffsetY, scaleX, scaleY, img.width, img.height);
        };
        img.src = imageData;
      } else {
        // For live camera feed - use the same scaling logic as camera-view.tsx
        // Get actual video dimensions if available, otherwise use defaults
        const videoWidth = 1280; // Common HD width
        const videoHeight = 720; // Common HD height
        const videoAspect = videoWidth / videoHeight;
        const canvasAspect = drawWidth / drawHeight;
        
        let scaleX, scaleY, actualOffsetX = offsetX, actualOffsetY = offsetY;
        
        if (videoAspect > canvasAspect) {
          // Video is wider - fit to height
          scaleY = drawHeight;
          scaleX = drawHeight * videoAspect;
          actualOffsetX = offsetX + (drawWidth - scaleX) / 2;
        } else {
          // Video is taller - fit to width
          scaleX = drawWidth;
          scaleY = drawWidth / videoAspect;
          actualOffsetY = offsetY + (drawHeight - scaleY) / 2;
        }
        
        drawSkeletonWithScaling(actualOffsetX, actualOffsetY, scaleX, scaleY, 1, 1);
      }
    }

    function drawSkeletonWithScaling(offsetX: number, offsetY: number, scaleX: number, scaleY: number, originalWidth: number = 1, originalHeight: number = 1) {
      if (!ctx || !poseData?.keypoints) return;

      const keypoints = poseData.keypoints;

      // Get color based on RULA score and weight - use weight-adjusted scores when available
      const getJointColor = (jointIndex: number) => {
        if (!showColorCoding) return '#00FF00'; // Default green

        // Color coding based on RULA components and weight
        let riskLevel = 1;

        if (rulaScore) {
          // Use the actual RULA score passed in (which should be weight-adjusted in manual mode)
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

          // Use final score for better color representation when available
          if (rulaScore.finalScore) {
            riskLevel = Math.max(riskLevel, rulaScore.finalScore);
          }
        }

        // Enhanced color mapping with more gradual transitions
        if (riskLevel <= 2) return '#00FF00'; // Green - Safe
        if (riskLevel <= 3) return '#80FF00'; // Light green - Low risk
        if (riskLevel <= 4) return '#FFFF00'; // Yellow - Medium risk  
        if (riskLevel <= 5) return '#FF8000'; // Orange - High risk
        if (riskLevel <= 6) return '#FF4000'; // Red-orange - Very high risk
        return '#FF0000'; // Red - Critical
      };

      // Transform coordinates to match camera view exactly - replicate camera-view.tsx logic
      const transformCoordinate = (point: any) => {
        // Use the exact same transformation logic as camera-view.tsx transformCoordinates function
        let x = point.x;
        let y = point.y;
        
        // Get video dimensions - use actual video if available, otherwise defaults
        let videoWidth = 640;
        let videoHeight = 480;
        
        if (videoRef?.current && videoRef.current.videoWidth > 0) {
          videoWidth = videoRef.current.videoWidth;
          videoHeight = videoRef.current.videoHeight;
        }
        
        // Calculate scaling factors exactly like camera-view.tsx
        const videoAspect = videoWidth / videoHeight;
        const canvasAspect = width / height;
        
        let scaleX, scaleY, finalOffsetX = 0, finalOffsetY = 0;
        
        if (videoAspect > canvasAspect) {
          // Video is wider - fit to height
          scaleY = height;
          scaleX = height * videoAspect;
          finalOffsetX = (width - scaleX) / 2;
        } else {
          // Video is taller - fit to width
          scaleX = width;
          scaleY = width / videoAspect;
          finalOffsetY = (height - scaleY) / 2;
        }
        
        let transformedX, transformedY;
        
        // Handle coordinate normalization exactly like camera-view.tsx
        if (x > 1 || y > 1) {
          // Absolute coordinates - normalize first
          transformedX = (x / videoWidth) * scaleX + finalOffsetX;
          transformedY = (y / videoHeight) * scaleY + finalOffsetY;
        } else {
          // Normalized coordinates (0-1)
          transformedX = x * scaleX + finalOffsetX;
          transformedY = y * scaleY + finalOffsetY;
        }
        
        // Mirror X coordinate exactly like camera-view.tsx
        transformedX = width - transformedX;
        
        return { x: transformedX, y: transformedY };
      };

      // Draw connections with enhanced visibility
      KEYPOINT_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const startPoint = keypoints[startIdx];
        const endPoint = keypoints[endIdx];

        if (startPoint?.score > 0.3 && endPoint?.score > 0.3) {
          const start = transformCoordinate(startPoint);
          const end = transformCoordinate(endPoint);

          // Draw connection with outline for better visibility
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.strokeStyle = getJointColor(startIdx);
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      });

      // Draw keypoints with enhanced visibility
      keypoints.forEach((keypoint: any, index: number) => {
        if (keypoint.score > 0.3) {
          const pos = transformCoordinate(keypoint);

          // Draw keypoint with black outline for better visibility
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#000000';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = getJointColor(index);
          ctx.fill();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw keypoint labels with background for better readability
          if (showColorCoding) {
            const label = KEYPOINT_NAMES[index] || `${index}`;
            ctx.font = 'bold 10px Arial';
            const textWidth = ctx.measureText(label).width;

            // Draw text background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(pos.x + 8, pos.y - 16, textWidth + 4, 12);

            // Draw text
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(label, pos.x + 10, pos.y - 6);
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

      // Risk level (simplified without "changes needed" text)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      const riskText = finalScore <= 2 ? 'Low Risk' : 
                       finalScore <= 4 ? 'Medium Risk' : 
                       finalScore <= 6 ? 'High Risk' : 'Critical Risk';
      ctx.fillText(`Risk: ${riskText}`, boxX + 10, boxY + 70);

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

      // Object detection indicator
      if (weightEstimation?.estimatedWeight > 0) {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('OBJECT DETECTED', boxX + 10, boxY + yOffset + 35);
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