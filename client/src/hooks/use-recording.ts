import { useState, useCallback, useRef } from "react";

interface RecordingFrame {
  timestamp: number;
  rulaScore: any;
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

    // Record frame every 3 seconds for 60 seconds (20 frames total)
    recordingInterval.current = setInterval(() => {
      const elapsed = Date.now() - recordingStartTime.current;
      const progress = Math.min((elapsed / 60000) * 100, 100);
      setRecordingProgress(progress);

      if (elapsed >= 60000) {
        stopRecording();
        return;
      }

      // Capture frame with higher quality
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use higher resolution for better image quality
        const scaleFactor = 2;
        canvas.width = videoRef.current.videoWidth * scaleFactor;
        canvas.height = videoRef.current.videoHeight * scaleFactor;
        
        if (ctx) {
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Scale and mirror the image horizontally to match the display
          ctx.scale(-scaleFactor, scaleFactor);
          ctx.translate(-canvas.width / scaleFactor, 0);
          ctx.drawImage(videoRef.current, 0, 0);
          
          // Use higher quality JPEG compression
          const imageData = canvas.toDataURL('image/jpeg', 0.95);
          
          // This will be updated with actual pose and RULA data from parent component
          const frame: RecordingFrame = {
            timestamp: elapsed / 1000,
            rulaScore: null,
            imageData,
            poseData: null
          };
          
          setRecordingData(prev => [...prev, frame]);
        }
      }
    }, 3000);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setRecordingProgress(0);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
  }, []);

  const updateLastFrame = useCallback((rulaScore: any, poseData: any) => {
    setRecordingData(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      updated[lastIndex] = {
        ...updated[lastIndex],
        rulaScore,
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