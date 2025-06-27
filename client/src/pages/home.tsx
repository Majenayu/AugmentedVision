import { useState, useEffect, useRef } from "react";
import CameraView from "@/components/pose-detection/camera-view";
import ThreeDView from "@/components/pose-detection/three-d-view";
import RebaAssessment from "@/components/pose-detection/reba-assessment";
import MetricsDashboard from "@/components/pose-detection/metrics-dashboard";
import RecordingPanel from "@/components/pose-detection/recording-panel";
import { usePoseDetection } from "@/hooks/use-pose-detection";
import { useCamera, type CameraDevice } from "@/hooks/use-camera";
import { useRecording } from "@/hooks/use-recording";
import { DownloadButton } from "../components/download-button";

export default function Home() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [assessmentMode, setAssessmentMode] = useState<'RULA' | 'REBA'>('REBA');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { 
    cameraActive, 
    videoRef, 
    availableDevices,
    selectedDeviceId,
    startCamera, 
    stopCamera, 
    pauseCamera,
    switchCamera,
    getAvailableDevices
  } = useCamera();

  const {
    poseDetector,
    poseData,
    rebaScore,
    confidence,
    fps,
    isProcessing,
    initializeModel
  } = usePoseDetection(videoRef, canvasRef, cameraActive);

  const {
    isRecording,
    recordingData,
    recordingProgress,
    startRecording,
    stopRecording,
    updateLastFrame,
    clearRecording
  } = useRecording();

  // Update recording with current pose and REBA data
  useEffect(() => {
    if (isRecording && poseData && rebaScore) {
      updateLastFrame(rebaScore, poseData);
    }
  }, [isRecording, poseData, rebaScore, updateLastFrame]);

  useEffect(() => {
    const initModel = async () => {
      try {
        await initializeModel();
        setModelLoaded(true);
        // Load available camera devices
        await getAvailableDevices();
      } catch (error) {
        console.error("Failed to initialize pose detection model:", error);
      }
    };

    initModel();
  }, [initializeModel, getAvailableDevices]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (cameraActive && startTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraActive, startTime]);

  const handleStartCamera = async () => {
    if (!modelLoaded) {
      console.warn("Model not loaded yet");
      return;
    }

    console.log("Starting camera from home component...");
    console.log("Available devices:", availableDevices);
    console.log("Selected device ID:", selectedDeviceId);

    try {
      // Use the selected device ID if available, otherwise let camera choose default
      await startCamera(selectedDeviceId || undefined);
      setStartTime(Date.now());
      setSessionDuration(0);
      console.log("Camera started successfully from home component");
    } catch (error) {
      console.error("Failed to start camera:", error);
      
      // Try fallback without specific device
      if (selectedDeviceId) {
        console.log("Retrying without specific device ID...");
        try {
          await startCamera();
          setStartTime(Date.now());
          setSessionDuration(0);
          console.log("Camera started with fallback method");
        } catch (fallbackError) {
          console.error("Fallback camera start also failed:", fallbackError);
        }
      }
    }
  };

  const handleStartRecording = () => {
    if (!cameraActive) {
      console.warn("Camera not active");
      return;
    }
    startRecording(videoRef);
  };

  // Update recording data when pose/REBA data changes
  useEffect(() => {
    if (isRecording && poseData && rebaScore) {
      updateLastFrame(rebaScore, poseData);
    }
  }, [isRecording, poseData, rebaScore, updateLastFrame]);

  const handleStopCamera = () => {
    stopCamera();
    setStartTime(null);
    setSessionDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // RULA and REBA modes use the same interface with different labels

  return (
    <div className="min-h-screen bg-dark-surface text-white">
      {/* Header */}
      <header className="bg-dark-card shadow-lg border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-material-blue rounded-lg flex items-center justify-center">
                <span className="material-icon text-white text-xl">accessibility_new</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">ErgoTrack - {assessmentMode}</h1>
                <p className="text-text-secondary text-sm">
                  {assessmentMode === 'RULA' 
                    ? 'Real-time Upper Limb Assessment' 
                    : 'Real-time Ergonomic Assessment'
                  }
                </p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${cameraActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-text-secondary">
                  {cameraActive ? 'Camera Active' : 'Camera Off'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${modelLoaded ? 'bg-material-blue' : 'bg-yellow-500 animate-pulse'}`}></div>
                <span className="text-sm text-text-secondary">
                  {modelLoaded ? 'Model Loaded' : 'Loading Model...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* View Controls */}
        <div className="mb-6">
          <div className="bg-dark-card rounded-lg p-4 shadow-lg">
            {/* Assessment Mode Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Assessment Method
              </label>
              <select
                value={assessmentMode}
                onChange={(e) => setAssessmentMode(e.target.value as 'RULA' | 'REBA')}
                className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm min-w-[120px] cursor-pointer hover:bg-gray-600 transition-colors"
              >
                <option value="REBA">REBA (Rapid Entire Body Assessment)</option>
                <option value="RULA">RULA (Rapid Upper Limb Assessment)</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleStartCamera}
                  disabled={!modelLoaded || cameraActive}
                  className="bg-material-blue hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span className="material-icon">videocam</span>
                  <span>Start Camera</span>
                </button>
                <button 
                  onClick={pauseCamera}
                  disabled={!cameraActive}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span className="material-icon">pause</span>
                  <span>Pause</span>
                </button>
                <button 
                  onClick={handleStopCamera}
                  disabled={!cameraActive}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span className="material-icon">stop</span>
                  <span>Stop</span>
                </button>
              </div>
            </div>

            {/* Camera Selection */}
            {availableDevices.length > 0 && (
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-sm text-text-secondary">Camera Source:</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => switchCamera(e.target.value)}
                  disabled={cameraActive}
                  className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 text-sm disabled:opacity-50"
                >
                  {availableDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-text-secondary">
                  Supports webcam, mobile camera, or DroidCam
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div></div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-text-secondary">FPS:</span>
                  <span className="text-sm font-mono">{fps}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Viewing Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ThreeDView poseData={poseData} rebaScore={rebaScore} />
          <CameraView 
            videoRef={videoRef} 
            canvasRef={canvasRef} 
            cameraActive={cameraActive}
            poseData={poseData}
          />
        </div>

        {/* Assessment Panel */}
        <RebaAssessment 
          rebaScore={rebaScore} 
          poseData={poseData} 
          isProcessing={isProcessing}
          assessmentMode={assessmentMode}
        />

        {/* Real-time Metrics Dashboard */}
        <MetricsDashboard 
          fps={fps}
          sessionDuration={formatDuration(sessionDuration)}
          rebaScore={rebaScore}
          poseData={poseData}
        />

        {/* Recording Panel */}
        <RecordingPanel
            isRecording={isRecording}
            recordingData={recordingData}
            recordingProgress={recordingProgress}
            onStartRecording={() => startRecording(videoRef)}
            onStopRecording={stopRecording}
            onClearRecording={clearRecording}
            currentPoseData={poseData}
            currentRebaScore={rebaScore}
            videoRef={videoRef}
          />
      </main>

      {/* Footer */}
      <footer className="bg-dark-card border-t border-gray-700 mt-12">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="text-text-secondary text-sm">
              <p>&copy; 2024 ErgoTrack. Real-time {assessmentMode.toLowerCase()} assessment powered by TensorFlow.js and MoveNet.</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs text-text-secondary">Model: MoveNet Lightning</span>
              <span className="text-xs text-text-secondary">Mode: {assessmentMode}</span>
              <span className="text-xs text-text-secondary">Version: 4.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}