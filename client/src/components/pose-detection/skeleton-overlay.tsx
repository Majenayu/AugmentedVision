import React, { useRef, useEffect } from 'react';

interface SkeletonOverlayProps {
  poseData: any;
  rebaScore: any;
  imageData?: string;
  width: number;
  height: number;
  showColorCoding?: boolean;
  weightEstimation?: any;
  skeletonOnly?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
  assessmentMode?: 'RULA' | 'REBA';
}

// RULA connections - Complete upper body with full torso (no legs)
const RULA_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4], // Head/neck
  [5, 6], // Shoulders
  [5, 7], [7, 9], // Left arm
  [6, 8], [8, 10], // Right arm
  [5, 11], [6, 12], // Shoulders to hips
  [11, 12], // Hip connection
];

// REBA connections - Full body
const REBA_CONNECTIONS = [
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
  rebaScore,
  imageData,
  width,
  height,
  showColorCoding = true,
  weightEstimation,
  skeletonOnly = false,
  videoRef,
  assessmentMode = 'REBA'
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

      // Get color based on REBA score and weight - use weight-adjusted scores when available
      const getJointColor = (jointIndex: number) => {
        if (!showColorCoding) return '#00FF00'; // Default green

        // Color coding based on REBA components and weight
        let riskLevel = 1;

        if (rebaScore) {
          // Use the actual REBA score passed in (which should be weight-adjusted in manual mode)
          // Map joint to REBA component
          if ([5, 6, 7, 8].includes(jointIndex)) { // Arms
            riskLevel = Math.max(rebaScore.upperArm || 1, rebaScore.lowerArm || 1);
          } else if ([9, 10].includes(jointIndex)) { // Wrists
            riskLevel = rebaScore.wrist || 1;
          } else if ([0, 1, 2, 3, 4].includes(jointIndex)) { // Neck/Head
            riskLevel = rebaScore.neck || 1;
          } else if ([11, 12].includes(jointIndex)) { // Trunk
            riskLevel = rebaScore.trunk || 1;
          }

          // Use final score for better color representation when available
          if (rebaScore.finalScore) {
            riskLevel = Math.max(riskLevel, rebaScore.finalScore);
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
        if (!videoRef?.current) {
          // Fallback for recorded images - use simpler transformation
          const x = point.x > 1 ? point.x : point.x * width;
          const y = point.y > 1 ? point.y : point.y * height;
          return { x: width - x, y }; // Mirror X coordinate
        }
        
        const video = videoRef.current;
        let x = point.x;
        let y = point.y;
        
        // Calculate video scaling to fit canvas exactly like camera-view.tsx
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = width / height;
        
        let scaleX, scaleY, offsetX = 0, offsetY = 0;
        
        if (videoAspect > canvasAspect) {
          // Video is wider - fit to height, center horizontally
          scaleY = height;
          scaleX = height * videoAspect;
          offsetX = (width - scaleX) / 2;
        } else {
          // Video is taller - fit to width, center vertically
          scaleX = width;
          scaleY = width / videoAspect;
          offsetY = (height - scaleY) / 2;
        }
        
        let transformedX, transformedY;
        
        // Handle coordinate normalization
        if (x > 1 || y > 1) {
          // Absolute coordinates - normalize first
          transformedX = (x / video.videoWidth) * scaleX + offsetX;
          transformedY = (y / video.videoHeight) * scaleY + offsetY;
        } else {
          // Normalized coordinates (0-1)
          transformedX = x * scaleX + offsetX;
          transformedY = y * scaleY + offsetY;
        }
        
        // Mirror X coordinate to match camera display
        transformedX = width - transformedX;
        
        return { x: transformedX, y: transformedY };
      };

      // Get appropriate connections based on assessment mode
      const connections = assessmentMode === 'RULA' ? RULA_CONNECTIONS : REBA_CONNECTIONS;
      
      // Draw connections with enhanced visibility
      connections.forEach(([startIdx, endIdx]) => {
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

      // Define which keypoints to show based on assessment mode
      const visibleKeypoints = assessmentMode === 'RULA' 
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] // Head, neck, shoulders, arms, wrists, trunk (hips)
        : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]; // All keypoints for REBA

      // Draw keypoints with enhanced visibility
      keypoints.forEach((keypoint: any, index: number) => {
        if (keypoint.score > 0.3 && visibleKeypoints.includes(index)) {
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

      // Posture analysis moved to REBA Assessment component
    }

    

    // Export this function for use in other components
    function generatePostureAnalysis(rebaScore: any): string {
      const issues = [];
      const good = [];
      
      // Analyze upper arm
      if (rebaScore.upperArm >= 4) {
        issues.push("upper arm position is problematic (raised >90°)");
      } else if (rebaScore.upperArm >= 3) {
        issues.push("upper arm angle needs attention (45-90°)");
      } else {
        good.push("upper arm position");
      }
      
      // Analyze lower arm
      if (rebaScore.lowerArm >= 2) {
        issues.push("elbow angle is suboptimal (outside 60-100°)");
      } else {
        good.push("elbow angle");
      }
      
      // Analyze wrist
      if (rebaScore.wrist >= 3) {
        issues.push("wrist is severely bent or twisted");
      } else if (rebaScore.wrist >= 2) {
        issues.push("wrist deviation detected");
      } else {
        good.push("wrist alignment");
      }
      
      // Analyze neck
      if (rebaScore.neck >= 4) {
        issues.push("neck is severely forward or tilted (>45°)");
      } else if (rebaScore.neck >= 3) {
        issues.push("neck posture needs correction (20-45° forward)");
      } else if (rebaScore.neck >= 2) {
        issues.push("slight forward head posture detected");
      } else {
        good.push("neck position");
      }
      
      // Analyze trunk
      if (rebaScore.trunk >= 4) {
        issues.push("trunk is severely leaning or twisted (>60°)");
      } else if (rebaScore.trunk >= 3) {
        issues.push("trunk posture needs attention (20-60° lean)");
      } else if (rebaScore.trunk >= 2) {
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
      if (rebaScore.finalScore >= 5) {
        analysis += "Immediate posture correction recommended.";
      } else if (rebaScore.finalScore >= 3) {
        analysis += "Consider adjusting posture soon.";
      } else {
        analysis += "Overall posture is acceptable.";
      }
      
      return analysis;
    }

    
  }, [poseData, rebaScore, imageData, width, height, showColorCoding, weightEstimation]);

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