import { useState, useCallback, useRef } from "react";

interface RecordingFrame {
  timestamp: number;
  rebaScore: any;
  imageData: string;
  poseData: any;
}

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingData, setRecordingData] = useState<RecordingFrame[]>([]);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const recordingStartTime = useRef<number>(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback((videoRef: React.RefObject<HTMLVideoElement>) => {
    if (!videoRef.current) return;

    setIsRecording(true);
    setRecordingData([]);
    setRecordingProgress(0);
    recordingStartTime.current = Date.now();

    // Record frame every 1000ms (1 second) for 60 seconds
    recordingInterval.current = setInterval(() => {
      const elapsed = Date.now() - recordingStartTime.current;
      const progress = Math.min((elapsed / 60000) * 100, 100);
      setRecordingProgress(progress);

      if (elapsed >= 60000) {
        stopRecording();
        return;
      }

      // Capture frame with proper alignment and aspect ratio
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;
        
        // Use standardized dimensions to prevent stretching
        const targetWidth = 640;
        const targetHeight = 480;
        const videoAspectRatio = video.videoWidth / video.videoHeight;
        const targetAspectRatio = targetWidth / targetHeight;
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        if (ctx) {
          // Fill background
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          
          // Calculate proper scaling to maintain aspect ratio
          let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
          
          if (videoAspectRatio > targetAspectRatio) {
            // Video is wider than target
            drawWidth = targetWidth;
            drawHeight = targetWidth / videoAspectRatio;
            offsetY = (targetHeight - drawHeight) / 2;
          } else {
            // Video is taller than target
            drawHeight = targetHeight;
            drawWidth = targetHeight * videoAspectRatio;
            offsetX = (targetWidth - drawWidth) / 2;
          }
          
          // Save context state
          ctx.save();
          
          // Apply horizontal flip to match camera display
          ctx.scale(-1, 1);
          ctx.translate(-targetWidth, 0);
          
          // Draw video frame with proper scaling and centering
          ctx.drawImage(video, -offsetX - drawWidth, offsetY, drawWidth, drawHeight);
          
          // Restore context
          ctx.restore();
          
          // Generate high-quality image data
          const imageData = canvas.toDataURL('image/jpeg', 0.9);
          
          // Create frame data structure
          const frame: RecordingFrame = {
            timestamp: elapsed / 1000,
            rebaScore: null,
            imageData,
            poseData: null
          };
          
          setRecordingData(prev => [...prev, frame]);
        }
      }
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setRecordingProgress(0);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
  }, []);

  const updateLastFrame = useCallback((rebaScore: any, poseData: any) => {
    setRecordingData(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      updated[lastIndex] = {
        ...updated[lastIndex],
        rebaScore,
        poseData
      };
      return updated;
    });
  }, []);

  const clearRecording = useCallback(() => {
    setRecordingData([]);
    setRecordingProgress(0);
  }, []);

  return {
    isRecording,
    recordingData,
    recordingProgress,
    startRecording,
    stopRecording,
    updateLastFrame,
    clearRecording
  };
}