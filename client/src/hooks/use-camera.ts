import { useRef, useState, useCallback } from "react";

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [availableDevices, setAvailableDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const getAvailableDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }));
      setAvailableDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
      return videoDevices;
    } catch (error) {
      console.error("Error getting camera devices:", error);
      return [];
    }
  }, [selectedDeviceId]);

  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      console.log("Attempting to start camera with deviceId:", deviceId);
      
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: deviceId ? undefined : 'user',
          deviceId: deviceId ? { exact: deviceId } : undefined
        },
        audio: false
      };

      console.log("Camera constraints:", constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Camera stream obtained:", mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log("Video element srcObject set");
        
        // Wait for video to load metadata
        await new Promise((resolve, reject) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
            videoRef.current.onerror = reject;
          }
        });
        
        await videoRef.current.play();
        console.log("Video element playing");
        
        setStream(mediaStream);
        setCameraActive(true);
        if (deviceId) {
          setSelectedDeviceId(deviceId);
        }
        console.log("Camera successfully started");
      }
    } catch (error) {
      console.error("Error starting camera:", error);
      
      // Provide more specific error messages
      if (error instanceof Error && 'name' in error) {
        if (error.name === 'NotAllowedError') {
          console.error("Camera permission denied by user");
        } else if (error.name === 'NotFoundError') {
          console.error("No camera found");
        } else if (error.name === 'NotReadableError') {
          console.error("Camera already in use by another application");
        }
      }
      
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

  const switchCamera = useCallback(async (deviceId: string) => {
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(deviceId), 100);
    } else {
      await startCamera(deviceId);
    }
  }, [cameraActive, startCamera, stopCamera]);

  return {
    videoRef,
    canvasRef,
    cameraActive,
    availableDevices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    pauseCamera,
    switchCamera,
    getAvailableDevices
  };
}
