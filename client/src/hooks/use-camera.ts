import { useRef, useState, useCallback } from "react";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setStream(mediaStream);
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Error starting camera:", error);
      throw error;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
  }, [stream]);

  const pauseCamera = useCallback(() => {
    if (videoRef.current && cameraActive) {
      videoRef.current.pause();
      setCameraActive(false);
    }
  }, [cameraActive]);

  return {
    videoRef,
    canvasRef,
    cameraActive,
    startCamera,
    stopCamera,
    pauseCamera
  };
}
