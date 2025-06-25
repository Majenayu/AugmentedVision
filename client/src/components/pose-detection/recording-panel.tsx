import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Scatter, ScatterChart } from 'recharts';
import SkeletonOverlay from './skeleton-overlay';
import ThreeDView from './three-d-view';
import ManualWeightInput, { type ManualWeight } from './manual-weight-input';
import ObjectDetectionWeightInput from './object-detection-weight-input';
import * as XLSX from 'xlsx';

import { estimateWeightFromPosture, calculateWeightAdjustedRula } from '@/lib/weight-detection';
import { generatePostureAnalysis } from '@/lib/posture-analysis';

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
  videoRef?: React.RefObject<HTMLVideoElement>;
}

type AnalysisMode = 'normal' | 'manual';
type ViewMode = 'original' | 'skeleton';
type GraphType = 'live' | 'estimated' | 'manual';

export default function RecordingPanel({
  isRecording,
  recordingData,
  recordingProgress,
  onStartRecording,
  onStopRecording,
  onClearRecording,
  currentPoseData,
  currentRulaScore,
  videoRef
}: RecordingPanelProps) {
  const [selectedFrame, setSelectedFrame] = useState<RecordingFrame | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('normal');
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [activeGraph, setActiveGraph] = useState<GraphType>('live');
  const [manualWeights, setManualWeights] = useState<ManualWeight[]>([]);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showSecondObjectDetection, setShowSecondObjectDetection] = useState(false);

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
    if (isRecording && recordingData.length === 0) {
      setRecordingGraphData([]);
      setEstimatedGraphData([]);
      setManualGraphData([]);
      recordingStartTimeRef.current = Date.now();
    }
  }, [isRecording, recordingData.length]);

  // Process recording data into graph data (only during recording)
  useEffect(() => {
    if (recordingData.length > 0 && recordingStartTimeRef.current) {
      const processedRecordingData = recordingData.map((frame, index) => {
        const timeInSeconds = (frame.timestamp - recordingStartTimeRef.current!) / 1000;
        return {
          time: timeInSeconds,
          rulaScore: frame.rulaScore?.finalScore || 0,
          upperArm: frame.rulaScore?.upperArm || 1,
          lowerArm: frame.rulaScore?.lowerArm || 1,
          wrist: frame.rulaScore?.wrist || 1,
          neck: frame.rulaScore?.neck || 1,
          trunk: frame.rulaScore?.trunk || 1
        };
      });

      setRecordingGraphData(processedRecordingData);

      // Process estimated weight data
      const processedEstimatedData = recordingData.map((frame) => {
        const weightEstimation = estimateWeightFromPosture(frame.poseData?.keypoints || []);
        const timeInSeconds = (frame.timestamp - recordingStartTimeRef.current!) / 1000;
        return {
          time: timeInSeconds,
          estimatedWeight: weightEstimation.estimatedWeight,
          confidence: weightEstimation.confidence,
          rulaScore: frame.rulaScore?.finalScore || 0
        };
      });

      setEstimatedGraphData(processedEstimatedData);
    }
  }, [recordingData]);

  // Process manual weight analysis
  useEffect(() => {
    if (recordingData.length > 0 && manualWeights.length > 0) {
      const totalManualWeight = getTotalManualWeight();
      
      const processedManualData = recordingData.map((frame) => {
        const timeInSeconds = recordingStartTimeRef.current ? 
          (frame.timestamp - recordingStartTimeRef.current) / 1000 : 
          frame.timestamp;
        
        const adjustedRulaScore = calculateWeightAdjustedRula(
          frame.rulaScore,
          undefined,
          totalManualWeight
        );

        return {
          time: timeInSeconds,
          originalRulaScore: frame.rulaScore?.finalScore || 0,
          adjustedRulaScore: adjustedRulaScore?.finalScore || frame.rulaScore?.finalScore || 0,
          manualWeight: totalManualWeight,
          weightMultiplier: totalManualWeight > 0 ? Math.min(1 + (totalManualWeight / 10), 2) : 1,
          originalUpperArm: frame.rulaScore?.upperArm || 1,
          adjustedUpperArm: adjustedRulaScore?.upperArm || frame.rulaScore?.upperArm || 1,
          originalLowerArm: frame.rulaScore?.lowerArm || 1,
          adjustedLowerArm: adjustedRulaScore?.lowerArm || frame.rulaScore?.lowerArm || 1,
          originalWrist: frame.rulaScore?.wrist || 1,
          adjustedWrist: adjustedRulaScore?.wrist || frame.rulaScore?.wrist || 1,
          originalNeck: frame.rulaScore?.neck || 1,
          adjustedNeck: adjustedRulaScore?.neck || frame.rulaScore?.neck || 1,
          originalTrunk: frame.rulaScore?.trunk || 1,
          adjustedTrunk: adjustedRulaScore?.trunk || frame.rulaScore?.trunk || 1,
          riskLevelChange: getRiskLevelChange(frame.rulaScore?.finalScore || 0, adjustedRulaScore?.finalScore || frame.rulaScore?.finalScore || 0),
          objectNames: manualWeights.map(w => w.name).join(', '),
          objectWeights: manualWeights.map(w => `${w.weight}g`).join(', ')
        };
      });

      setManualGraphData(processedManualData);
    } else {
      // Reset to original scores when no manual weights
      const processedManualData = recordingData.map(frame => {
        const timeInSeconds = recordingStartTimeRef.current ? 
          (frame.timestamp - recordingStartTimeRef.current) / 1000 : 
          frame.timestamp;
        
        return {
          time: timeInSeconds,
          originalRulaScore: frame.rulaScore?.finalScore || 0,
          adjustedRulaScore: frame.rulaScore?.finalScore || 0,
          manualWeight: 0,
          weightMultiplier: 1,
          originalUpperArm: frame.rulaScore?.upperArm || 1,
          adjustedUpperArm: frame.rulaScore?.upperArm || 1,
          originalLowerArm: frame.rulaScore?.lowerArm || 1,
          adjustedLowerArm: frame.rulaScore?.lowerArm || 1,
          originalWrist: frame.rulaScore?.wrist || 1,
          adjustedWrist: frame.rulaScore?.wrist || 1,
          originalNeck: frame.rulaScore?.neck || 1,
          adjustedNeck: frame.rulaScore?.neck || 1,
          originalTrunk: frame.rulaScore?.trunk || 1,
          adjustedTrunk: frame.rulaScore?.trunk || 1,
          riskLevelChange: 'No Change',
          objectNames: '',
          objectWeights: ''
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

      // For live and estimated graphs, find frame from recording data
      if (activeGraph === 'live' || activeGraph === 'estimated') {
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
        const frame = processedData.find(f => f.timestamp === timestamp);
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

  const getSessionDuration = () => {
    if (recordingData.length === 0) return "00:00";
    const startTime = recordingData[0].timestamp;
    const endTime = recordingData[recordingData.length - 1].timestamp;
    const durationMs = endTime - startTime;
    return formatTime(Math.floor(durationMs / 1000));
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

  const getTotalManualWeight = () => {
    return manualWeights.reduce((total, weight) => total + weight.weight, 0) / 1000; // Convert to kg
  };

  const getRiskLevelChange = (originalScore: number, adjustedScore: number) => {
    const getRiskLevel = (score: number) => {
      if (score <= 2) return 'Low Risk';
      if (score <= 4) return 'Medium Risk'; 
      if (score <= 6) return 'High Risk';
      return 'Critical Risk';
    };

    const originalRisk = getRiskLevel(originalScore);
    const adjustedRisk = getRiskLevel(adjustedScore);
    
    if (originalRisk === adjustedRisk) return 'No Change';
    return `${originalRisk} → ${adjustedRisk}`;
  };

  const getCurrentRulaScore = (frame: RecordingFrame) => {
    if (analysisMode === 'manual' && manualWeights.length > 0) {
      return calculateWeightAdjustedRula(frame.rulaScore, undefined, getTotalManualWeight());
    }
    return frame.rulaScore;
  };

  const getCurrentWeightEstimation = (frame: RecordingFrame) => {
    if (analysisMode === 'manual' && manualWeights.length > 0) {
      return { estimatedWeight: getTotalManualWeight() * 1000, confidence: 1.0 }; // Convert back to grams for display
    }
    return frame.weightEstimation || { estimatedWeight: 0, confidence: 0 };
  };

  const exportGraphDataToExcel = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Prepare Live Graph Data
    const liveData = liveGraphData.map((point, index) => ({
      'Time (seconds)': index,
      'Estimated Weight (kg)': (point.estimatedWeight / 1000).toFixed(3),
      'Detection Confidence': (point.confidence * 100).toFixed(1) + '%',
      'RULA Score': point.rulaScore,
      'Has Object': point.hasObject ? 'Yes' : 'No'
    }));

    // Prepare Recording Graph Data
    const recordingData = recordingGraphData.map(point => ({
      'Time (seconds)': point.time.toFixed(1),
      'RULA Score': point.rulaScore,
      'Upper Arm Score': point.upperArm,
      'Lower Arm Score': point.lowerArm,
      'Wrist Score': point.wrist,
      'Neck Score': point.neck,
      'Trunk Score': point.trunk
    }));

    // Prepare Estimated Weight Data
    const estimatedData = estimatedGraphData.map(point => ({
      'Time (seconds)': point.time.toFixed(1),
      'Estimated Weight (kg)': (point.estimatedWeight / 1000).toFixed(3),
      'RULA Score': point.rulaScore,
      'Confidence': point.confidence || 'N/A'
    }));

    // Prepare Manual Graph Data with detailed breakdown
    const manualData = manualGraphData.map((point, index) => ({
      'Time (seconds)': index * (60 / manualGraphData.length),
      'Original RULA Score': point.originalRulaScore,
      'Adjusted RULA Score': point.adjustedRulaScore,
      'Manual Weight (kg)': point.manualWeight,
      'Weight Multiplier': point.weightMultiplier,
      'Original Upper Arm': point.originalUpperArm || 'N/A',
      'Adjusted Upper Arm': point.adjustedUpperArm || 'N/A',
      'Original Lower Arm': point.originalLowerArm || 'N/A',
      'Adjusted Lower Arm': point.adjustedLowerArm || 'N/A',
      'Original Wrist': point.originalWrist || 'N/A',
      'Adjusted Wrist': point.adjustedWrist || 'N/A',
      'Original Neck': point.originalNeck || 'N/A',
      'Adjusted Neck': point.adjustedNeck || 'N/A',
      'Original Trunk': point.originalTrunk || 'N/A',
      'Adjusted Trunk': point.adjustedTrunk || 'N/A',
      'Risk Level Change': point.riskLevelChange || 'N/A',
      'Object Names': point.objectNames || 'N/A',
      'Object Weights (g)': point.objectWeights || 'N/A'
    }));

    // Prepare detailed manual weight objects data
    const manualWeightsData = manualWeights.map((weight, index) => ({
      'Object ID': weight.id,
      'Object Name': weight.name,
      'Weight (grams)': weight.weight,
      'Weight (kg)': (weight.weight / 1000).toFixed(3),
      'Icon': weight.icon,
      'Order Added': index + 1,
      'Has Preview Image': weight.previewImage ? 'Yes' : 'No'
    }));

    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new();

    if (liveData.length > 0) {
      const liveSheet = XLSX.utils.json_to_sheet(liveData);
      XLSX.utils.book_append_sheet(workbook, liveSheet, 'Live Graph Data');
    }

    if (recordingData.length > 0) {
      const recordingSheet = XLSX.utils.json_to_sheet(recordingData);
      XLSX.utils.book_append_sheet(workbook, recordingSheet, 'Recording Graph Data');
    }

    if (estimatedData.length > 0) {
      const estimatedSheet = XLSX.utils.json_to_sheet(estimatedData);
      XLSX.utils.book_append_sheet(workbook, estimatedSheet, 'Estimated Weight Data');
    }

    if (manualData.length > 0) {
      const manualSheet = XLSX.utils.json_to_sheet(manualData);
      XLSX.utils.book_append_sheet(workbook, manualSheet, 'Manual Weight Data');
    }

    if (manualWeightsData.length > 0) {
      const weightsSheet = XLSX.utils.json_to_sheet(manualWeightsData);
      XLSX.utils.book_append_sheet(workbook, weightsSheet, 'Manual Objects List');
    }

    // Download the file
    const fileName = `ErgoTrack_Analysis_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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
            <>
              <button
                onClick={exportGraphDataToExcel}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                title="Export Graph Data to Excel"
              >
                <span className="material-icon">download</span>
                <span>Export Excel</span>
              </button>
              <button
                onClick={onClearRecording}
                className="bg-gray-600 hover:bg-gray-700 px-2 py-2 rounded-lg transition-colors"
                title="Clear Recording"
              >
                <span className="material-icon">delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recording Progress */}
      {isRecording && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Recording in progress...</span>
            <span className="text-sm text-gray-400">{Math.round(recordingProgress * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${recordingProgress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Analysis Mode Selection */}
      {recordingData.length > 0 && !isRecording && (
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <h4 className="text-lg font-medium">Analysis Mode:</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => setAnalysisMode('normal')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  analysisMode === 'normal' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Normal View
              </button>
              <button
                onClick={() => setAnalysisMode('manual')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  analysisMode === 'manual' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Manual Weight
              </button>
            </div>
          </div>

          {/* Manual Weight Input */}
          {analysisMode === 'manual' && (
            <div className="mb-4">
              <ManualWeightInput 
                weights={manualWeights} 
                onWeightsChange={setManualWeights}
                totalWeight={getTotalManualWeight()}
              />
            </div>
          )}
        </div>
      )}

      {/* Graph Controls */}
      {(recordingData.length > 0 || liveGraphData.length > 0) && (
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <h4 className="text-lg font-medium">Graph Type:</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveGraph('live')}
                className={`px-3 py-1 rounded text-sm ${
                  activeGraph === 'live' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Live Analysis
              </button>
              {recordingData.length > 0 && (
                <>
                  <button
                    onClick={() => setActiveGraph('estimated')}
                    className={`px-3 py-1 rounded text-sm ${
                      activeGraph === 'estimated' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Recording Analysis
                  </button>
                  <button
                    onClick={() => setActiveGraph('manual')}
                    className={`px-3 py-1 rounded text-sm ${
                      activeGraph === 'manual' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Manual Weight Analysis
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live Graph */}
          {activeGraph === 'live' && liveGraphData.length > 0 && (
            <div className="bg-dark-secondary rounded-lg p-4 mb-4">
              <h5 className="text-lg font-medium mb-3">Live RULA Score Analysis</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveGraphData.map((point, index) => ({ 
                    ...point, 
                    time: index,
                    displayTime: `${index}s`
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `${value}s`}
                    />
                    <YAxis stroke="#9CA3AF" domain={[0, 8]} />
                    <Tooltip 
                      labelFormatter={(value) => `Time: ${value}s`}
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    />
                    <ReferenceLine y={2} stroke="#10B981" strokeDasharray="2 2" label="Low Risk" />
                    <ReferenceLine y={4} stroke="#F59E0B" strokeDasharray="2 2" label="Medium Risk" />
                    <ReferenceLine y={6} stroke="#EF4444" strokeDasharray="2 2" label="High Risk" />
                    <Line 
                      type="monotone" 
                      dataKey="rulaScore" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={(props: any) => {
                        if (props.payload.hasObject) {
                          return <circle cx={props.cx} cy={props.cy} r={6} fill="#EF4444" stroke="#DC2626" strokeWidth={2} />;
                        }
                        return <circle cx={props.cx} cy={props.cy} r={4} fill="#3B82F6" />;
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Blue line: Real-time RULA scores | Red dots indicate frames where objects were detected.
              </p>
            </div>
          )}

          {/* Recording Graph */}
          {activeGraph === 'estimated' && recordingGraphData.length > 0 && (
            <div className="bg-dark-secondary rounded-lg p-4 mb-4">
              <h5 className="text-lg font-medium mb-3">Recording RULA Score Analysis</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recordingGraphData} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      tickFormatter={(value) => formatTime(value)}
                    />
                    <YAxis stroke="#9CA3AF" domain={[0, 8]} />
                    <Tooltip 
                      labelFormatter={(value) => `Time: ${formatTime(value)}`}
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    />
                    <ReferenceLine y={2} stroke="#10B981" strokeDasharray="2 2" label="Low Risk" />
                    <ReferenceLine y={4} stroke="#F59E0B" strokeDasharray="2 2" label="Medium Risk" />
                    <ReferenceLine y={6} stroke="#EF4444" strokeDasharray="2 2" label="High Risk" />
                    <Line 
                      type="monotone" 
                      dataKey="rulaScore" 
                      stroke="#F97316" 
                      strokeWidth={2}
                      dot={{ fill: '#F97316', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Orange line: Recorded RULA scores over time. Click points to view frame details.
              </p>
            </div>
          )}

          {/* Manual Weight Analysis Graph */}
          {activeGraph === 'manual' && manualGraphData.length > 0 && (
            <div className="bg-dark-secondary rounded-lg p-4 mb-4">
              <h5 className="text-lg font-medium mb-3">Manual Weight Impact Analysis</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={manualGraphData} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      tickFormatter={(value) => formatTime(value)}
                    />
                    <YAxis stroke="#9CA3AF" domain={[0, 8]} />
                    <Tooltip 
                      labelFormatter={(value) => `Time: ${formatTime(value)}`}
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    />
                    <ReferenceLine y={2} stroke="#10B981" strokeDasharray="2 2" label="Low Risk" />
                    <ReferenceLine y={4} stroke="#F59E0B" strokeDasharray="2 2" label="Medium Risk" />
                    <ReferenceLine y={6} stroke="#EF4444" strokeDasharray="2 2" label="High Risk" />
                    <Line 
                      type="monotone" 
                      dataKey="originalRulaScore" 
                      stroke="#6B7280" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="adjustedRulaScore" 
                      stroke="#10B981" 
                      strokeWidth={3}
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
      )}

      {/* Frame Details */}
      {selectedFrame && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium">
              Frame at {recordingStartTimeRef.current ? 
                formatTime((selectedFrame.timestamp - recordingStartTimeRef.current) / 1000) : 
                formatTime(selectedFrame.timestamp)}
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
                    {/* Full 2D Skeleton View - With background image */}
                    <div className="relative w-full h-full bg-black">
                      <SkeletonOverlay
                        poseData={selectedFrame.poseData}
                        rulaScore={getCurrentRulaScore(selectedFrame)}
                        imageData={selectedFrame.imageData}
                        width={640}
                        height={360}
                        showColorCoding={true}
                        weightEstimation={getCurrentWeightEstimation(selectedFrame)}
                        skeletonOnly={false}
                        videoRef={videoRef}
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        2D Skeleton View
                      </div>
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
              {/* Show RULA table for all view modes */}
              {true && (
                <div>
                <h5 className="text-lg font-medium mb-3">RULA Assessment</h5>
                <div className="bg-dark-secondary rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex justify-between py-1">
                        <span>Upper Arm:</span>
                        <span className="font-mono">{getCurrentRulaScore(selectedFrame)?.upperArm || 1}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Lower Arm:</span>
                        <span className="font-mono">{getCurrentRulaScore(selectedFrame)?.lowerArm || 1}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Wrist:</span>
                        <span className="font-mono">{getCurrentRulaScore(selectedFrame)?.wrist || 1}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between py-1">
                        <span>Neck:</span>
                        <span className="font-mono">{getCurrentRulaScore(selectedFrame)?.neck || 1}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Trunk:</span>
                        <span className="font-mono">{getCurrentRulaScore(selectedFrame)?.trunk || 1}</span>
                      </div>
                      <div className="flex justify-between py-1 font-bold border-t border-gray-600 mt-2 pt-2">
                        <span>Final Score:</span>
                        <span className="font-mono">{getCurrentRulaScore(selectedFrame)?.finalScore || 1}</span>
                      </div>
                    </div>
                  </div>
                  
                  {analysisMode === 'manual' && manualWeights.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <div className="text-sm text-gray-400 mb-2">Weight Analysis:</div>
                      <div className="flex justify-between text-sm">
                        <span>Total Manual Weight:</span>
                        <span className="font-mono">{getTotalManualWeight().toFixed(1)}kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Weight Multiplier:</span>
                        <span className="font-mono">{Math.min(1 + (getTotalManualWeight() / 10), 2).toFixed(2)}x</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="text-sm">
                      <span className="text-gray-400">Risk Level: </span>
                      <span className={`font-bold ${
                        (getCurrentRulaScore(selectedFrame)?.finalScore || 1) <= 2 ? 'text-green-400' :
                        (getCurrentRulaScore(selectedFrame)?.finalScore || 1) <= 4 ? 'text-yellow-400' :
                        (getCurrentRulaScore(selectedFrame)?.finalScore || 1) <= 6 ? 'text-orange-400' : 'text-red-400'
                      }`}>
                        {(getCurrentRulaScore(selectedFrame)?.finalScore || 1) <= 2 ? 'Low Risk' :
                         (getCurrentRulaScore(selectedFrame)?.finalScore || 1) <= 4 ? 'Medium Risk' :
                         (getCurrentRulaScore(selectedFrame)?.finalScore || 1) <= 6 ? 'High Risk' : 'Critical Risk'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Posture Analysis */}
              <div>
                <h5 className="text-lg font-medium mb-3">Posture Analysis</h5>
                <div className="bg-dark-secondary rounded-lg p-4">
                  <div className="text-sm space-y-2">
                    {generatePostureAnalysis(selectedFrame.poseData, getCurrentRulaScore(selectedFrame)).map((analysis, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>{analysis}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}