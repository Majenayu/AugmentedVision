import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Scatter, ScatterChart } from 'recharts';
import SkeletonOverlay from './skeleton-overlay';
import { estimateWeightFromPosture, calculateWeightAdjustedRula } from '@/lib/weight-detection';

interface RecordingFrame {
  timestamp: number;
  rulaScore: any;
  imageData: string;
  poseData: any;
  weightEstimation?: any;
  adjustedRulaScore?: any;
  hasObject?: boolean;
}

interface RecordingPanelProps {
  isRecording: boolean;
  recordingData: RecordingFrame[];
  recordingProgress: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording: () => void;
  currentPoseData?: any;
  currentRulaScore?: any;
}

interface ManualWeight {
  id: string;
  name: string;
  weight: number;
}

type AnalysisMode = 'normal' | 'estimated' | 'manual';
type ViewMode = 'original' | 'skeleton' | 'enhanced';
type GraphType = 'live' | 'estimated' | 'manual';

export default function RecordingPanel({
  isRecording,
  recordingData,
  recordingProgress,
  onStartRecording,
  onStopRecording,
  onClearRecording,
  currentPoseData,
  currentRulaScore
}: RecordingPanelProps) {
  const [selectedFrame, setSelectedFrame] = useState<RecordingFrame | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('normal');
  const [viewMode, setViewMode] = useState<ViewMode>('skeleton');
  const [activeGraph, setActiveGraph] = useState<GraphType>('live');
  const [manualWeights, setManualWeights] = useState<ManualWeight[]>([]);
  const [showWeightDialog, setShowWeightDialog] = useState(false);

  // Separate graph data that only records during recording session
  const [recordingGraphData, setRecordingGraphData] = useState<any[]>([]);
  const [estimatedGraphData, setEstimatedGraphData] = useState<any[]>([]);
  const [manualGraphData, setManualGraphData] = useState<any[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Live data for estimated weight analysis
  const [liveGraphData, setLiveGraphData] = useState<Array<{
    time: number;
    estimatedWeight: number;
    confidence: number;
    rulaScore: number;
    hasObject: boolean;
  }>>([]);

  const recordingStartTime = useRef<number | null>(null);

  

  // Clear graph data when recording starts
  useEffect(() => {
    if (isRecording) {
      recordingStartTime.current = Date.now();
      recordingStartTimeRef.current = Date.now();
      setRecordingGraphData([]);
      setEstimatedGraphData([]);
      setManualGraphData([]);
    } else {
      recordingStartTime.current = null;
      recordingStartTimeRef.current = null;
    }
  }, [isRecording]);

  // Update graph data only during recording
  useEffect(() => {
    if (isRecording && currentPoseData && currentRulaScore && recordingStartTimeRef.current) {
      const elapsedSeconds = (Date.now() - recordingStartTimeRef.current) / 1000;

      // Stop adding data after 60 seconds
      if (elapsedSeconds <= 60) {
        // Detect objects in the current frame
        const hasObject = currentPoseData.keypoints && estimateWeightFromPosture(currentPoseData.keypoints).estimatedWeight > 0;

        const newDataPoint = {
          time: elapsedSeconds,
          rulaScore: currentRulaScore.finalScore || 0,
          stressLevel: currentRulaScore.stressLevel || 0,
          riskLevel: currentRulaScore.riskLevel || 'Unknown',
          hasObject
        };

        setRecordingGraphData(prev => [...prev, newDataPoint]);

        // Estimated weight data
        if (currentPoseData.keypoints) {
          const weightEstimation = estimateWeightFromPosture(currentPoseData.keypoints);
          const adjustedRulaScore = calculateWeightAdjustedRula(
            currentRulaScore,
            weightEstimation
          );

          const estimatedDataPoint = {
            time: elapsedSeconds,
            estimatedWeight: weightEstimation.estimatedWeight || 0,
            confidence: weightEstimation.confidence || 0,
            rulaScore: adjustedRulaScore.finalScore || 0,
            hasObject: weightEstimation.estimatedWeight > 0
          };

          setEstimatedGraphData(prev => [...prev, estimatedDataPoint]);
        }
      }
    }
  }, [isRecording, currentPoseData, currentRulaScore]);

  // Add manual weight
  const addManualWeight = () => {
    const newWeight: ManualWeight = {
      id: Date.now().toString(),
      name: `Object ${manualWeights.length + 1}`,
      weight: 0
    };
    setManualWeights([...manualWeights, newWeight]);
  };

  const updateManualWeight = (id: string, field: keyof ManualWeight, value: string | number) => {
    setManualWeights(prev => 
      prev.map(weight => 
        weight.id === id ? { ...weight, [field]: value } : weight
      )
    );
  };

  const removeManualWeight = (id: string) => {
    setManualWeights(prev => prev.filter(weight => weight.id !== id));
  };

  const getTotalManualWeight = () => {
    return manualWeights.reduce((total, weight) => total + weight.weight, 0);
  };

  // Show weight dialog when switching to manual mode after recording
  useEffect(() => {
    if (analysisMode === 'manual' && recordingData.length > 0 && manualWeights.length === 0 && !isRecording) {
      setShowWeightDialog(true);
    }
  }, [analysisMode, recordingData.length, manualWeights.length, isRecording]);

  // Process manual weight analysis from recorded data
  useEffect(() => {
    if (recordingData.length > 0 && manualWeights.length > 0) {
      const processedManualData = recordingData.map(frame => {
        if (frame.poseData?.keypoints) {
          const weightEstimation = estimateWeightFromPosture(frame.poseData.keypoints);
          const adjustedRulaScore = calculateWeightAdjustedRula(
            frame.rulaScore,
            weightEstimation,
            getTotalManualWeight()
          );

          return {
            time: frame.timestamp,
            normalScore: frame.rulaScore?.finalScore || 0,
            adjustedScore: adjustedRulaScore?.finalScore || 0,
            weight: getTotalManualWeight(),
            hasObject: weightEstimation.estimatedWeight > 0
          };
        }
        return {
          time: frame.timestamp,
          normalScore: frame.rulaScore?.finalScore || 0,
          adjustedScore: frame.rulaScore?.finalScore || 0,
          weight: 0,
          hasObject: false
        };
      });

      setManualGraphData(processedManualData);
    }
  }, [recordingData, manualWeights]);

  // Process recording data with weight analysis
  const processedData = recordingData.map(frame => {
    if (frame.poseData?.keypoints) {
      const weightEstimation = estimateWeightFromPosture(frame.poseData.keypoints);
      const adjustedRulaScore = calculateWeightAdjustedRula(
        frame.rulaScore,
        weightEstimation,
        analysisMode === 'manual' ? getTotalManualWeight() : undefined
      );

      return {
        ...frame,
        weightEstimation,
        adjustedRulaScore,
        hasObject: weightEstimation.estimatedWeight > 0
      };
    }
    return { ...frame, hasObject: false };
  });

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const timestamp = data.activePayload[0].payload.time;
      const frame = processedData.find(f => f.timestamp === timestamp);
      if (frame) {
        setSelectedFrame(frame);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = () => {
    if (!isRecording) {
      recordingStartTimeRef.current = Date.now();
      setRecordingGraphData([]);
      setEstimatedGraphData([]);
      setManualGraphData([]);
      onStartRecording();
    }
  };

  // Update live graph data continuously (no real-time weight dialogs)
  useEffect(() => {
    if (currentPoseData && currentRulaScore) {
      const currentTime = Date.now();
      const weightEstimation = estimateWeightFromPosture(currentPoseData.keypoints || []);

      setLiveGraphData(prev => {
        const newData = [...prev, {
          time: currentTime,
          estimatedWeight: weightEstimation.estimatedWeight,
          confidence: weightEstimation.confidence,
          rulaScore: currentRulaScore.finalScore || 0,
          hasObject: weightEstimation.estimatedWeight > 0
        }];

        // Keep only last 100 data points for performance
        return newData.slice(-100);
      });
    }
  }, [currentPoseData, currentRulaScore]);

  const handleManualWeightAdd = (weight: ManualWeight) => {
    setManualWeights(prev => [...prev, weight]);
    setShowWeightDialog(false);
  };

  

  const getCurrentRulaScore = (frame: RecordingFrame) => {
    if (analysisMode === 'manual' && manualWeights.length > 0) {
      const manualWeight = manualWeights[0].weight;
      return calculateWeightAdjustedRula(frame.rulaScore, frame.weightEstimation || { estimatedWeight: 0, confidence: 0, detectedObjects: [], bodyPosture: { isLifting: false, isCarrying: false, armPosition: 'close', spineDeviation: 0, loadDirection: 'front' } }, manualWeight);
    }

    if (analysisMode === 'estimated' && frame.weightEstimation?.estimatedWeight > 0) {
      return calculateWeightAdjustedRula(frame.rulaScore, frame.weightEstimation);
    }

    return frame.rulaScore;
  };

  const getCurrentWeightEstimation = (frame: RecordingFrame) => {
    if (analysisMode === 'manual' && manualWeights.length > 0) {
      return {
        ...frame.weightEstimation,
        estimatedWeight: manualWeights[0].weight,
        confidence: 1.0
      };
    }
    return frame.weightEstimation;
  };

  return (
    <div className="bg-dark-card rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-medium flex items-center space-x-2">
          <span className="material-icon text-red-500">videocam</span>
          <span>Enhanced Ergonomic Recording</span>
        </h3>
        <div className="flex items-center space-x-3">
          {!isRecording && recordingData.length === 0 && (
            <button
              onClick={startRecording}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <span className="material-icon">fiber_manual_record</span>
              <span>Record 1 Min</span>
            </button>
          )}

          {isRecording && (
            <button
              onClick={onStopRecording}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <span className="material-icon">stop</span>
              <span>Stop Recording</span>
            </button>
          )}

          {recordingData.length > 0 && !isRecording && (
            <button
              onClick={onClearRecording}
              className="bg-gray-600 hover:bg-gray-700 px-2 py-2 rounded-lg transition-colors"
              title="Clear Recording"
            >
              <span className="material-icon">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Recording Progress */}
      {isRecording && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Recording Progress</span>
            <span className="text-sm font-mono">{Math.round(recordingProgress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-300 animate-pulse" 
              style={{width: `${recordingProgress}%`}}
            ></div>
          </div>
          <p className="text-xs text-text-secondary mt-2">Recording for 60 seconds...</p>
        </div>
      )}

      {/* Analysis Mode Controls */}
      {recordingData.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <h4 className="text-lg font-medium">Analysis Mode</h4>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setAnalysisMode('normal')}
                  className={`px-3 py-1 rounded text-sm ${
                    analysisMode === 'normal' 
                      ? 'bg-material-blue text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Normal View
                </button>
                <button
                  onClick={() => setAnalysisMode('estimated')}
                  className={`px-3 py-1 rounded text-sm ${
                    analysisMode === 'estimated' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Weight Estimated
                </button>
                <button
                  onClick={() => setAnalysisMode('manual')}
                  className={`px-3 py-1 rounded text-sm ${
                    analysisMode === 'manual' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Manual Weight
                </button>
              </div>

              {analysisMode === 'manual' && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Total Weight: {getTotalManualWeight()}kg</span>
                  <button
                    onClick={() => setShowWeightDialog(true)}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                  >
                    Manage Objects
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Graph Selection Tabs */}
      <div className="mb-6">
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveGraph('live')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeGraph === 'live' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Live RULA Graph
          </button>
          <button
            onClick={() => setActiveGraph('estimated')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeGraph === 'estimated' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Estimated Weight Graph
          </button>
          <button
            onClick={() => setActiveGraph('manual')}
            disabled={recordingData.length === 0 || manualWeights.length === 0}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeGraph === 'manual' && recordingData.length > 0 && manualWeights.length > 0
                ? 'bg-green-600 text-white' 
                : recordingData.length === 0 || manualWeights.length === 0
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Manual Weight Analysis
          </button>
        </div>

        {/* Normal RULA Graph - Only shows data from recording session */}
        {activeGraph === 'live' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-lg font-medium mb-3 text-blue-400">Normal RULA Score (Recording Session)</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recordingGraphData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                    tickFormatter={formatTime}
                    domain={[0, 60]}
                  />
                  <YAxis 
                    domain={[1, 7]}
                    stroke="#9CA3AF"
                  />
                  <Tooltip 
                    labelFormatter={formatTime}
                    formatter={(value: any) => [value, 'RULA Score']}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#F9FAFB'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rulaScore" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={(props: any) => {
                      if (props.payload.hasObject) {
                        return <circle cx={props.cx} cy={props.cy} r={6} fill="#EF4444" stroke="#DC2626" strokeWidth={2} />;
                      }
                      return <circle cx={props.cx} cy={props.cy} r={3} fill="#3B82F6" />;
                    }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Normal RULA scores from recording session. Red dots indicate detected objects.
            </p>
          </div>
        )}

        {/* Estimated Weight Graph - Only shows data from recording session */}
        {activeGraph === 'estimated' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-lg font-medium mb-3 text-orange-400">Weight-Adjusted RULA Analysis (Recording Session)</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={estimatedGraphData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                    tickFormatter={formatTime}
                    domain={[0, 60]}
                  />
                  <YAxis 
                    domain={[1, 7]}
                    stroke="#9CA3AF"
                  />
                  <Tooltip 
                    labelFormatter={formatTime}
                    formatter={(value: any, name: string) => {
                      if (name === 'estimatedWeight') return [value + 'kg', 'Estimated Weight'];
                      if (name === 'rulaScore') return [value, 'Weight-Adjusted RULA Score'];
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#F9FAFB'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rulaScore" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={(props: any) => {
                      if (props.payload.hasObject) {
                        return <circle cx={props.cx} cy={props.cy} r={6} fill="#EF4444" stroke="#DC2626" strokeWidth={2} />;
                      }
                      return <circle cx={props.cx} cy={props.cy} r={3} fill="#F59E0B" />;
                    }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Weight-adjusted RULA scores from recording session. Red dots indicate detected objects.
            </p>
          </div>
        )}

        {/* Manual Weight Analysis Graph */}
        {activeGraph === 'manual' && recordingData.length > 0 && manualWeights.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-lg font-medium mb-3 text-green-400">Manual Weight Analysis (Post-Recording)</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={manualGraphData} onClick={handleChartClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                    tickFormatter={formatTime}
                  />
                  <YAxis 
                    domain={[1, 7]}
                    stroke="#9CA3AF"
                  />
                  <Tooltip 
                    labelFormatter={formatTime}
                    formatter={(value: any, name: string) => {
                      if (name === 'normalScore') return [value, 'Normal RULA'];
                      if (name === 'adjustedScore') return [value, 'Manual Weight-Adjusted RULA'];
                      return [value, 'RULA Score'];
                    }}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#F9FAFB'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="normalScore" 
                    stroke="#9CA3AF" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={(props: any) => {
                      if (props.payload.hasObject) {
                        return <circle cx={props.cx} cy={props.cy} r={4} fill="#EF4444" stroke="#DC2626" strokeWidth={2} />;
                      }
                      return <circle cx={props.cx} cy={props.cy} r={2} fill="#9CA3AF" />;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="adjustedScore" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={(props: any) => {
                      if (props.payload.hasObject) {
                        return <circle cx={props.cx} cy={props.cy} r={6} fill="#EF4444" stroke="#DC2626" strokeWidth={2} />;
                      }
                      return <circle cx={props.cx} cy={props.cy} r={4} fill="#10B981" />;
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Gray dashed: Normal RULA | Green solid: Manual weight-adjusted RULA (Total: {getTotalManualWeight()}kg) | Red dots indicate detected objects.
            </p>
          </div>
        )}
      </div>

      

      {/* Frame Details */}
      {selectedFrame && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium">
              Frame at {formatTime(selectedFrame.timestamp)}
            </h4>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('original')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'original' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setViewMode('skeleton')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'skeleton' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Skeleton
              </button>
              <button
                onClick={() => setViewMode('enhanced')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'enhanced' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Enhanced
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                {viewMode === 'original' && (
                  <div className="relative w-full h-full">
                    <img 
                      src={selectedFrame.imageData} 
                      alt="Original frame"
                      className="w-full h-full object-contain"
                    />
                    {selectedFrame.hasObject && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                        OBJECT DETECTED
                      </div>
                    )}
                  </div>
                )}
                {viewMode === 'skeleton' && (
                  <div className="relative w-full h-full bg-black">
                    <SkeletonOverlay
                      poseData={selectedFrame.poseData}
                      rulaScore={getCurrentRulaScore(selectedFrame)}
                      width={640}
                      height={360}
                      showColorCoding={true}
                      weightEstimation={selectedFrame.weightEstimation}
                    />
                    {selectedFrame.hasObject && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                        OBJECT DETECTED
                      </div>
                    )}
                  </div>
                )}
                {viewMode === 'enhanced' && (
                  <div className="relative w-full h-full">
                    <img 
                      src={selectedFrame.imageData} 
                      alt="Enhanced frame"
                      className="w-full h-full object-contain absolute inset-0"
                    />
                    <div className="absolute inset-0">
                      <SkeletonOverlay
                        poseData={selectedFrame.poseData}
                        rulaScore={getCurrentRulaScore(selectedFrame)}
                        width={640}
                        height={360}
                        showColorCoding={true}
                        weightEstimation={selectedFrame.weightEstimation}
                      />
                    </div>
                    {selectedFrame.hasObject && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                        OBJECT DETECTED
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="text-lg font-medium mb-3">RULA Assessment</h5>
                {selectedFrame.rulaScore ? (
                  <div className="space-y-3">
                    {analysisMode !== 'normal' && selectedFrame.adjustedRulaScore && (
                      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                        <h6 className="text-sm font-medium text-yellow-400 mb-2">Weight-Adjusted Analysis</h6>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Original Score: {selectedFrame.rulaScore.finalScore}</div>
                          <div>Adjusted Score: {selectedFrame.adjustedRulaScore.finalScore}</div>
                          <div>Weight: {selectedFrame.adjustedRulaScore.effectiveWeight}kg</div>
                          <div>Multiplier: {selectedFrame.adjustedRulaScore.weightMultiplier}x</div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span>Final Score:</span>
                      <span className="font-bold text-xl">
                        {getCurrentRulaScore(selectedFrame)?.finalScore}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Risk Level:</span>
                      <span className={`font-medium ${
                        getCurrentRulaScore(selectedFrame)?.finalScore <= 2 ? 'text-green-400' :
                        getCurrentRulaScore(selectedFrame)?.finalScore <= 4 ? 'text-yellow-400' :
                        getCurrentRulaScore(selectedFrame)?.finalScore <= 6 ? 'text-orange-400' : 'text-red-400'
                      }`}>
                        {getCurrentRulaScore(selectedFrame)?.riskLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-dark-secondary rounded p-3">
                        <div className="text-sm text-text-secondary">Upper Arm</div>
                        <div className="text-lg font-bold">
                          {getCurrentRulaScore(selectedFrame)?.upperArm}
                        </div>
                      </div>
                      <div className="bg-dark-secondary rounded p-3">
                        <div className="text-sm text-text-secondary">Lower Arm</div>
                        <div className="text-lg font-bold">
                          {getCurrentRulaScore(selectedFrame)?.lowerArm}
                        </div>
                      </div>
                      <div className="bg-dark-secondary rounded p-3">
                        <div className="text-sm text-text-secondary">Wrist</div>
                        <div className="text-lg font-bold">
                          {getCurrentRulaScore(selectedFrame)?.wrist}
                        </div>
                      </div>
                      <div className="bg-dark-secondary rounded p-3">
                        <div className="text-sm text-text-secondary">Neck</div>
                        <div className="text-lg font-bold">
                          {getCurrentRulaScore(selectedFrame)?.neck}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-text-secondary">No RULA data available for this frame</p>
                )}
              </div>

              {selectedFrame.weightEstimation && (
                <div>
                  <h5 className="text-lg font-medium mb-3">Weight Analysis</h5>
                  <div className="bg-dark-secondary rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Estimated Weight:</span>
                      <span className="font-bold">{selectedFrame.weightEstimation.estimatedWeight}kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span>{Math.round(selectedFrame.weightEstimation.confidence * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Posture Type:</span>
                      <span className="capitalize">
                        {selectedFrame.weightEstimation.bodyPosture.isLifting ? 'Lifting' :
                         selectedFrame.weightEstimation.bodyPosture.isCarrying ? 'Carrying' : 'Normal'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Arm Position:</span>
                      <span className="capitalize">{selectedFrame.weightEstimation.bodyPosture.armPosition}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recording Stats */}
      {recordingData.length > 0 && !isRecording && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-dark-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-material-blue">{recordingData.length}</div>
            <div className="text-sm text-text-secondary">Frames Recorded</div>
          </div>
          <div className="bg-dark-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {recordingData.filter(f => f.rulaScore?.finalScore <= 2).length}
            </div>
            <div className="text-sm text-text-secondary">Safe Postures</div>
          </div>
          <div className="bg-dark-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {recordingData.filter(f => f.rulaScore?.finalScore > 4).length}
            </div>
            <div className="text-sm text-text-secondary">Risk Postures</div>
          </div>
        </div>
      )}

      {/* Manual Weight Management Dialog */}
      {showWeightDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium mb-4">Manage Objects & Weights</h3>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {manualWeights.map((weight) => (
                <div key={weight.id} className="flex items-center space-x-2 bg-gray-700 p-3 rounded-lg">
                  <input
                    type="text"
                    value={weight.name}
                    onChange={(e) => updateManualWeight(weight.id, 'name', e.target.value)}
                    className="flex-1 px-2 py-1 bg-gray-600 text-white rounded border border-gray-500"
                    placeholder="Object name"
                  />
                  <input
                    type="number"
                    value={weight.weight}
                    onChange={(e) => updateManualWeight(weight.id, 'weight', Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-gray-600 text-white rounded border border-gray-500"
                    placeholder="kg"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <button
                    onClick={() => removeManualWeight(weight.id)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mb-4">
              <button
                onClick={addManualWeight}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
              >
                Add Object
              </button>              <div className="text-sm">
                Total Weight: <span className="font-bold">{getTotalManualWeight()}kg</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowWeightDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}