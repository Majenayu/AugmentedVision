import { useState, useCallback, useEffect, useRef } from "react";
import { initializePoseDetection, detectPose } from "@/lib/pose-detection";
import { calculateRulaScore } from "@/lib/rula-calculator-simple";
import { calculateRebaScore } from "@/lib/reba-calculator";

export function usePoseDetection(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  cameraActive: boolean,
  assessmentMode: 'RULA' | 'REBA' = 'RULA'
) {
  const [poseDetector, setPoseDetector] = useState<any>(null);
  const [poseData, setPoseData] = useState<any>(null);
  const [rulaScore, setRulaScore] = useState<any>(null);
  const [confidence, setConfidence] = useState(0);
  const [fps, setFps] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fpsCounterRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const animationIdRef = useRef<number>();

  const initializeModel = useCallback(async () => {
    try {
      const detector = await initializePoseDetection();
      setPoseDetector(detector);
      return detector;
    } catch (error) {
      console.error("Failed to initialize pose detection:", error);
      throw error;
    }
  }, []);

  const processFrame = useCallback(async () => {
    if (!poseDetector || !videoRef.current || !cameraActive) {
      animationIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      setIsProcessing(true);
      const poses = await detectPose(poseDetector, videoRef.current);
      
      if (poses && poses.length > 0) {
        const pose = poses[0];
        setPoseData(pose);
        
        // Calculate average confidence
        const avgConfidence = pose.keypoints.reduce((sum: number, kp: any) => sum + kp.score, 0) / pose.keypoints.length;
        setConfidence(Math.round(avgConfidence * 100));
        
        // Calculate assessment score based on mode
        if (assessmentMode === 'RULA') {
          const rula = calculateRulaScore(pose.keypoints);
          setRulaScore(rula);
        } else {
          const reba = calculateRebaScore(pose.keypoints);
          setRulaScore(reba); // Using same state variable for both assessments
        }
      } else {
        setPoseData(null);
        setRulaScore(null);
        setConfidence(0);
      }
      
      // Update FPS
      fpsCounterRef.current++;
      const now = Date.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(fpsCounterRef.current);
        fpsCounterRef.current = 0;
        lastTimeRef.current = now;
      }
      
    } catch (error) {
      console.error("Error processing frame:", error);
    } finally {
      setIsProcessing(false);
    }

    animationIdRef.current = requestAnimationFrame(processFrame);
  }, [poseDetector, videoRef, cameraActive, assessmentMode]);

  useEffect(() => {
    if (cameraActive && poseDetector) {
      animationIdRef.current = requestAnimationFrame(processFrame);
    } else {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [cameraActive, poseDetector, processFrame, assessmentMode]);

  return {
    poseDetector,
    poseData,
    rulaScore,
    confidence,
    fps,
    isProcessing,
    initializeModel
  };
}
