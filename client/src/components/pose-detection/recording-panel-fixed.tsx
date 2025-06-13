import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  weight: number; // weight in grams
  zoomedImage?: string;
  timestamp: number;
}

type AnalysisMode = 'normal' | 'manual';
type ViewMode = 'original' | 'skeleton';
type GraphType = 'live' | 'manual';

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

  // Graph data that only records during recording session
  const [recordingGraphData, setRecordingGraphData] = useState<any[]>([]);
  const [manualGraphData, setManualGraphData] = useState<any[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Clear graph data when recording starts
  useEffect(() => {
    if (isRecording) {
      recordingStartTimeRef.current = Date.now();
      setRecordingGraphData([]);
      setManualGraphData([]);
    } else {
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
      }
    }
  }, [isRecording, currentPoseData, currentRulaScore]);

  // Capture object zoom from current frame
  const captureObjectZoom = () => {
    if (!selectedFrame || !selectedFrame.imageData) return;
    
    const newWeight: ManualWeight = {
      id: Date.now().toString(),
      name: `Object ${manualWeights.length + 1}`,
      weight: 0, // weight in grams
      zoomedImage: selectedFrame.imageData,
      timestamp: selectedFrame.timestamp
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

  // Process manual weight analysis from recorded data
  useEffect(() => {
    if (recordingData.length > 0 && manualWeights.length > 0) {
      const processedManualData = recordingData.map((frame, index) => {
        if (frame.poseData?.keypoints) {
          const weightEstimation = estimateWeightFromPosture(frame.poseData.keypoints);
          const adjustedRulaScore = calculateWeightAdjustedRula(
            frame.rulaScore,
            weightEstimation,
            getTotalManualWeight()
          );

          return {
            time: index,
            normalScore: frame.rulaScore?.finalScore || 0,
            adjustedScore: adjustedRulaScore?.finalScore || 0,
            weight: getTotalManualWeight(),
            hasObject: weightEstimation.estimatedWeight > 0
          };
        }
        return {
          time: index,
          normalScore: frame.rulaScore?.finalScore || 0,
          adjustedScore: frame.rulaScore?.finalScore || 0,
          weight: 0,
          hasObject: false
        };
      });

      setManualGraphData(processedManualData);
    }
  }, [recordingData, manualWeights]);

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const timestamp = data.activePayload[0].payload.time;
      
      // For live graph, find frame from recording data
      if (activeGraph === 'live') {
        const frame = recordingData.find(f => {
          const frameSeconds = (recordingStartTimeRef.current ? 
            (f.timestamp - recordingStartTimeRef.current) / 1000 : 
            f.timestamp);
          return Math.abs(frameSeconds - timestamp) < 0.5; // 0.5 second tolerance
        });
        if (frame) {
          setSelectedFrame(frame);
        }
      } else {
        // For manual analysis
        const frame = recordingData[timestamp];
        if (frame) {
          setSelectedFrame(frame);
        }
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManualWeightAdd = (weight: ManualWeight) => {
    setManualWeights([...manualWeights, weight]);
  };

  const getCurrentRulaScore = (frame: RecordingFrame) => {
    if (analysisMode === 'manual' && manualWeights.length > 0) {
      if (frame.poseData?.keypoints) {
        const weightEstimation = estimateWeightFromPosture(frame.poseData.keypoints);
        return calculateWeightAdjustedRula(
          frame.rulaScore,
          weightEstimation,
          getTotalManualWeight()
        );
      }
    }
    return frame.rulaScore;
  };

  const getCurrentWeightEstimation = (frame: RecordingFrame) => {
    if (analysisMode === 'manual' && manualWeights.length > 0) {
      return {
        estimatedWeight: getTotalManualWeight(),
        confidence: 1.0,
        detectedObjects: [],
        bodyPosture: {
          isLifting: false,
          isCarrying: true,
          armPosition: 'close',
          spineDeviation: 0,
          loadDirection: 'front'
        }
      };
    }
    return frame.weightEstimation;
  };

  return (
    <div className="bg-dark-card rounded-lg p-6 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Recording & Analysis</h3>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-text-secondary">
            Progress: {Math.round(recordingProgress)}%
          </span>
          <div className="w-32 bg-gray-700 rounded-full h-2">
            <div 
              className="bg-material-blue h-2 rounded-full transition-all duration-300"
              style={{width: `${recordingProgress}%`}}
            ></div>
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={onStartRecording}
          disabled={isRecording}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <span className="w-3 h-3 bg-white rounded-full"></span>
          <span>Start Recording</span>
        </button>

        <button
          onClick={onStopRecording}
          disabled={!isRecording}
          className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <span className="w-3 h-3 bg-white"></span>
          <span>Stop Recording</span>
        </button>

        <button
          onClick={onClearRecording}
          disabled={isRecording || recordingData.length === 0}
          className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>Clear</span>
        </button>

        <div className="text-sm text-text-secondary">
          Frames: {recordingData.length} | Duration: {recordingData.length > 0 ? Math.round(recordingData.length / 10) : 0}s
        </div>
      </div>

      {/* Analysis Mode Selection */}
      {recordingData.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setAnalysisMode('normal')}
                className={`px-3 py-1 rounded text-sm ${
                  analysisMode === 'normal' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                Normal Analysis
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
                <span className="text-sm">Total Weight: {getTotalManualWeight()}g</span>
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

        {/* Live RULA Graph */}
        {activeGraph === 'live' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-lg font-medium mb-3 text-blue-400">Live RULA Score</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recordingGraphData} onClick={handleChartClick}>
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
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Manual Weight Analysis Graph */}
        {activeGraph === 'manual' && manualGraphData.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-lg font-medium mb-3 text-green-400">Manual Weight Analysis (Weight: {getTotalManualWeight()}g)</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={manualGraphData} onClick={handleChartClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                  />
                  <YAxis 
                    domain={[1, 7]}
                    stroke="#9CA3AF"
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [value, name === 'normalScore' ? 'Normal RULA' : 'Adjusted RULA']}
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
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Normal RULA"
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="adjustedScore" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Weight Adjusted RULA"
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Frame Viewer */}
      {selectedFrame && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium">Selected Frame</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('original')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'original' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setViewMode('skeleton')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'skeleton' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                Skeleton
              </button>
              {selectedFrame && !isRecording && (
                <button
                  onClick={captureObjectZoom}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                >
                  Capture Object Zoom
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              {viewMode === 'original' && selectedFrame.imageData && (
                <img 
                  src={selectedFrame.imageData} 
                  alt="Selected frame" 
                  className="w-full h-auto rounded-lg"
                />
              )}
              {viewMode === 'skeleton' && selectedFrame.poseData && (
                <SkeletonOverlay
                  poseData={selectedFrame.poseData}
                  rulaScore={getCurrentRulaScore(selectedFrame)}
                  imageData={selectedFrame.imageData}
                  width={640}
                  height={480}
                  showColorCoding={false}
                  weightEstimation={getCurrentWeightEstimation(selectedFrame)}
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg p-3">
                <h5 className="font-medium mb-2">RULA Assessment</h5>
                {getCurrentRulaScore(selectedFrame) ? (
                  <div className="space-y-1 text-sm">
                    <div>Final Score: {getCurrentRulaScore(selectedFrame).finalScore}</div>
                    <div>Risk Level: {getCurrentRulaScore(selectedFrame).riskLevel}</div>
                    <div>Upper Arm: {getCurrentRulaScore(selectedFrame).upperArm}</div>
                    <div>Lower Arm: {getCurrentRulaScore(selectedFrame).lowerArm}</div>
                    <div>Wrist: {getCurrentRulaScore(selectedFrame).wrist}</div>
                    <div>Neck: {getCurrentRulaScore(selectedFrame).neck}</div>
                    <div>Trunk: {getCurrentRulaScore(selectedFrame).trunk}</div>
                  </div>
                ) : (
                  <div className="text-text-secondary">No RULA data available</div>
                )}
              </div>

              {analysisMode === 'manual' && manualWeights.length > 0 && (
                <div className="bg-gray-900 rounded-lg p-3">
                  <h5 className="font-medium mb-2">Weight Analysis</h5>
                  <div className="space-y-1 text-sm">
                    <div>Total Weight: {getTotalManualWeight()}g</div>
                    <div>Objects: {manualWeights.length}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Weight Dialog */}
      {showWeightDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Manage Objects & Weights</h3>
              <button
                onClick={() => setShowWeightDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {manualWeights.map((weight) => (
                <div key={weight.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {weight.zoomedImage && (
                      <div>
                        <img 
                          src={weight.zoomedImage} 
                          alt={weight.name}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={weight.name}
                        onChange={(e) => updateManualWeight(weight.id, 'name', e.target.value)}
                        className="w-full bg-gray-600 text-white rounded px-3 py-2"
                        placeholder="Object name"
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={weight.weight}
                          onChange={(e) => updateManualWeight(weight.id, 'weight', parseInt(e.target.value) || 0)}
                          className="flex-1 bg-gray-600 text-white rounded px-3 py-2"
                          placeholder="Weight"
                          min="0"
                        />
                        <span className="text-sm text-gray-300">grams</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => removeManualWeight(weight.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">
                Total Weight: {getTotalManualWeight()}g
              </div>
              <button
                onClick={() => setShowWeightDialog(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
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