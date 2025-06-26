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

    // Record frame every 500ms for 60 seconds
    recordingInterval.current = setInterval(() => {
      const elapsed = Date.now() - recordingStartTime.current;
      const progress = Math.min((elapsed / 60000) * 100, 100);
      setRecordingProgress(progress);

      if (elapsed >= 60000) {
        stopRecording();
        return;
      }

      // Capture frame
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        
        if (ctx) {
          // Mirror the image horizontally to match the display
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
          ctx.drawImage(videoRef.current, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          // This will be updated with actual pose and REBA data from parent component
          const frame: RecordingFrame = {
            timestamp: elapsed / 1000,
            rebaScore: null,
            imageData,
            poseData: null
          };
          
          setRecordingData(prev => [...prev, frame]);
        }
      }
    }, 500);
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