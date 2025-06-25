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

      // Improved coordinate transformation for better skeleton alignment
      const transformCoordinate = (point: any) => {
        let x = point.x;
        let y = point.y;
        
        // For recorded images, we need to account for the original image dimensions
        if (imageData && originalWidth && originalHeight) {
          // Use the original image dimensions for scaling
          const imgAspect = originalWidth / originalHeight;
          const canvasAspect = scaleX / scaleY;
          
          // Normalize coordinates if they're absolute
          if (x > 1 || y > 1) {
            x = x / originalWidth;
            y = y / originalHeight;
          }
          
          // Apply the same scaling that was used for the background image
          let transformedX = x * scaleX + offsetX;
          let transformedY = y * scaleY + offsetY;
          
          // Mirror X coordinate for front-facing camera effect
          transformedX = width - (transformedX - offsetX) + offsetX;
          
          return { x: transformedX, y: transformedY };
        } else {
          // For live video feed
          let videoWidth = 1280;
          let videoHeight = 720;
          
          if (videoRef?.current && videoRef.current.videoWidth > 0) {
            videoWidth = videoRef.current.videoWidth;
            videoHeight = videoRef.current.videoHeight;
          }
          
          // Normalize coordinates if they're absolute
          if (x > 1 || y > 1) {
            x = x / videoWidth;
            y = y / videoHeight;
          }
          
          // Apply scaling with proper offsets
          let transformedX = x * scaleX + offsetX;
          let transformedY = y * scaleY + offsetY;
          
          // Mirror X coordinate
          transformedX = width - (transformedX - offsetX) + offsetX;
          
          return { x: transformedX, y: transformedY };
        }
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

      // Posture analysis moved to RULA Assessment component
    }

    

    // Export this function for use in other components
    function generatePostureAnalysis(rulaScore: any): string {
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