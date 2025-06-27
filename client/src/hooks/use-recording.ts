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
        
        // Set canvas to match video resolution
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (ctx) {
          
          // Save context state
          ctx.save();
          
          // Apply horizontal flip to match camera display
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
          
          // Draw video frame directly
          ctx.drawImage(video, 0, 0);
          
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