import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Scatter, ScatterChart } from 'recharts';
import SkeletonOverlay from './skeleton-overlay';
import ThreeDView from './three-d-view';
import ManualWeightInput, { type ManualWeight } from './manual-weight-input';
import ObjectDetectionWeightInput from './object-detection-weight-input';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

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

  const addManualWeightFromInput = (weight: ManualWeight) => {
    setManualWeights(prev => [...prev, {
      id: weight.id,
      name: weight.name,
      weight: weight.weight / 1000, // Convert grams to kg for internal storage
      icon: weight.icon,
      previewImage: weight.previewImage
    }]);
  };

  const addManualWeight = () => {
    const newWeight: ManualWeight = {
      id: Date.now().toString(),
      name: `Object ${manualWeights.length + 1}`,
      weight: 0,
      icon: '📦'
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

  const handleManualWeightAdd = (weight: ManualWeight) => {
    setManualWeights(prev => [...prev, weight]);
    setShowWeightDialog(false);
  };



  const getCurrentRulaScore = (frame: RecordingFrame) => {
    if (analysisMode === 'manual' && manualWeights.length > 0) {
      const totalManualWeight = manualWeights.reduce((total, weight) => total + weight.weight, 0);
      const defaultWeightEstimation = { 
        estimatedWeight: 0, 
        confidence: 0, 
        detectedObjects: [], 
        bodyPosture: { 
          isLifting: false, 
          isCarrying: false, 
          armPosition: 'close' as const, 
          spineDeviation: 0, 
          loadDirection: 'front' as const 
        } 
      };
      return calculateWeightAdjustedRula(frame.rulaScore, frame.weightEstimation || defaultWeightEstimation, totalManualWeight);
    }



    return frame.rulaScore;
  };

  const getCurrentWeightEstimation = (frame: RecordingFrame) => {
    if (analysisMode === 'manual' && manualWeights.length > 0) {
      const totalManualWeight = manualWeights.reduce((total, weight) => total + weight.weight, 0);
      const defaultWeightEstimation = { 
        estimatedWeight: 0, 
        confidence: 0, 
        detectedObjects: [], 
        bodyPosture: { 
          isLifting: false, 
          isCarrying: false, 
          armPosition: 'close' as const, 
          spineDeviation: 0, 
          loadDirection: 'front' as const 
        } 
      };
      
      return {
        ...(frame.weightEstimation || defaultWeightEstimation),
        estimatedWeight: totalManualWeight / 1000, // Convert grams to kg
        confidence: 1.0
      };
    }
    return frame.weightEstimation;
  };

  // Excel export functions
  const exportGraphDataToExcel = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    
    // Prepare Live Graph Data
    const liveData = liveGraphData.map((point, index) => ({
      'Time (seconds)': index * 0.1, // Assuming 10fps recording
      'RULA Score': point.rulaScore,
      'Estimated Weight (kg)': point.estimatedWeight,
      'Confidence': point.confidence,
      'Has Object': point.hasObject ? 'Yes' : 'No'
    }));

    // Prepare Recording Graph Data (Normal)
    const recordingData = recordingGraphData.map((point, index) => ({
      'Time (seconds)': index * (60 / recordingGraphData.length), // 60 seconds total
      'RULA Score': point.rulaScore,
      'Risk Level': point.riskLevel,
      'Upper Arm Score': point.upperArm || 'N/A',
      'Lower Arm Score': point.lowerArm || 'N/A',
      'Wrist Score': point.wrist || 'N/A',
      'Neck Score': point.neck || 'N/A',
      'Trunk Score': point.trunk || 'N/A'
    }));

    // Prepare Estimated Graph Data with detailed breakdown
    const estimatedData = estimatedGraphData.map((point, index) => ({
      'Time (seconds)': index * (60 / estimatedGraphData.length),
      'Original RULA Score': point.originalRulaScore,
      'Adjusted RULA Score': point.adjustedRulaScore,
      'Estimated Weight (kg)': point.estimatedWeight,
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

  // PDF Report Generation Function
  const generatePDFReport = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 6;
    let yPosition = margin;

    // Helper function to add text with automatic page breaks
    const addText = (text: string, fontSize = 10, isBold = false, align: 'left' | 'center' | 'right' = 'left') => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFontSize(fontSize);
      if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }

      if (align === 'center') {
        pdf.text(text, pageWidth / 2, yPosition, { align: 'center' });
      } else if (align === 'right') {
        pdf.text(text, pageWidth - margin, yPosition, { align: 'right' });
      } else {
        pdf.text(text, margin, yPosition);
      }
      
      yPosition += lineHeight;
    };

    const addSection = (title: string) => {
      yPosition += 3;
      addText(title, 12, true);
      yPosition += 2;
    };

    // Calculate overall statistics
    const totalFrames = recordingData.length;
    const validFrames = recordingData.filter(frame => frame.poseData?.keypoints && frame.poseData.keypoints.length > 0);
    const avgValidKeypoints = validFrames.length > 0 ? 
      validFrames.reduce((sum, frame) => sum + (frame.poseData?.keypoints?.filter((kp: any) => kp.score > 0.3).length || 0), 0) / validFrames.length : 0;
    const avgConfidence = validFrames.length > 0 ?
      validFrames.reduce((sum, frame) => sum + (frame.poseData?.score || 0), 0) / validFrames.length * 100 : 0;
    const avgRulaScore = validFrames.length > 0 ?
      validFrames.reduce((sum, frame) => sum + (frame.rulaScore?.finalScore || 0), 0) / validFrames.length : 0;

    // Get risk level
    const getRiskLevel = (score: number) => {
      if (score <= 2) return "Low Risk - Acceptable";
      if (score <= 4) return "Medium Risk - Investigate";
      if (score <= 6) return "High Risk - Change Soon";
      return "Critical Risk - Change Immediately";
    };

    const generateRecommendations = (avgScore: number, hasManualWeights: boolean) => {
      const recommendations = [];
      
      if (avgScore <= 2) {
        recommendations.push("Low risk detected - posture is generally acceptable");
        recommendations.push("Continue current practices");
        recommendations.push("Monitor for any changes in work conditions");
      } else if (avgScore <= 4) {
        recommendations.push("Minor ergonomic concerns detected");
        recommendations.push("Adjust chair height and monitor position");
        recommendations.push("Check keyboard and mouse placement");
        recommendations.push("Take micro-breaks every 20-30 minutes");
        recommendations.push("Consider ergonomic accessories");
      } else if (avgScore <= 6) {
        recommendations.push("Significant ergonomic issues identified");
        recommendations.push("Immediate workspace assessment recommended");
        recommendations.push("Implement regular stretching routine");
        recommendations.push("Consider ergonomic training");
        recommendations.push("Review task frequency and duration");
      } else {
        recommendations.push("Critical ergonomic risks detected");
        recommendations.push("Immediate intervention required");
        recommendations.push("Professional ergonomic assessment needed");
        recommendations.push("Consider job task modification");
        recommendations.push("Implement mandatory rest breaks");
      }

      if (hasManualWeights) {
        const totalWeight = manualWeights.reduce((total, w) => total + w.weight, 0) / 1000;
        recommendations.push(`Weight handling detected: ${totalWeight.toFixed(1)}kg`);
        if (totalWeight > 10) {
          recommendations.push("Consider mechanical lifting aids");
          recommendations.push("Use proper lifting techniques");
        }
      }

      return recommendations;
    };

    // Header
    addText("ErgoTrack Assessment Report", 16, true, 'center');
    yPosition += 5;

    // Session Information
    addSection("Session Information");
    addText(`Date: ${new Date().toLocaleString()}`);
    addText(`Duration: ${getSessionDuration()}`);
    addText(`Assessment Type: ${analysisMode.toUpperCase()}`);
    addText(`Total Frames: ${totalFrames}`);

    // Pose Detection Quality
    addSection("Pose Detection Quality");
    addText(`Total Keypoints: 17`);
    addText(`Valid Keypoints: ${Math.round(avgValidKeypoints)}`);
    addText(`Detection Confidence: ${avgConfidence.toFixed(0)}%`);

    // RULA Assessment Results
    addSection("RULA Assessment Results");
    addText(`Score: ${avgRulaScore.toFixed(1)}                Risk Level: ${getRiskLevel(avgRulaScore)}`);
    yPosition += 3;

    // Get average body part scores
    const avgBodyParts = validFrames.reduce((acc, frame) => {
      if (frame.rulaScore) {
        acc.upperArm += frame.rulaScore.upperArm || 0;
        acc.lowerArm += frame.rulaScore.lowerArm || 0;
        acc.wrist += frame.rulaScore.wrist || 0;
        acc.neck += frame.rulaScore.neck || 0;
        acc.trunk += frame.rulaScore.trunk || 0;
        acc.scoreA += frame.rulaScore.scoreA || 0;
        acc.scoreB += frame.rulaScore.scoreB || 0;
      }
      return acc;
    }, { upperArm: 0, lowerArm: 0, wrist: 0, neck: 0, trunk: 0, scoreA: 0, scoreB: 0 });

    if (validFrames.length > 0) {
      Object.keys(avgBodyParts).forEach(key => {
        avgBodyParts[key] = avgBodyParts[key] / validFrames.length;
      });
    }

    addText("Individual Body Part Scores:");
    addText(`  Upper Arm: ${avgBodyParts.upperArm.toFixed(1)} Lower Arm: ${avgBodyParts.lowerArm.toFixed(1)} Wrist: ${avgBodyParts.wrist.toFixed(1)}`);
    addText(`  Neck: ${avgBodyParts.neck.toFixed(1)} Trunk: ${avgBodyParts.trunk.toFixed(1)}`);
    addText(`  Group A Score: ${avgBodyParts.scoreA.toFixed(1)} Group B Score: ${avgBodyParts.scoreB.toFixed(1)}`);

    // Manual Weights (if any)
    if (manualWeights.length > 0) {
      yPosition += 3;
      addText("Manual Weight Objects:");
      manualWeights.forEach(weight => {
        addText(`  - ${weight.name}: ${weight.weight}g`);
      });
      const totalWeight = manualWeights.reduce((total, w) => total + w.weight, 0) / 1000;
      addText(`Total Weight: ${totalWeight.toFixed(1)}kg`);
    }

    // Recommendations
    addSection("Recommendations");
    const recommendations = generateRecommendations(avgRulaScore, manualWeights.length > 0);
    recommendations.forEach((rec, index) => {
      addText(`${index + 1}. ${rec}`);
    });

    // Frame-by-Frame Analysis
    if (validFrames.length > 0) {
      yPosition += 5;
      addSection("Frame-by-Frame Analysis");
      
      validFrames.forEach((frame, index) => {
        if (index % 10 === 0) { // Show every 10th frame to avoid too much detail
          const timeSeconds = recordingStartTimeRef.current ? 
            (frame.timestamp - recordingStartTimeRef.current) / 1000 : 
            frame.timestamp;
          
          addText(`Frame ${index + 1} (${formatTime(timeSeconds)}):`);
          addText(`  RULA Score: ${frame.rulaScore?.finalScore || 0} - ${getRiskLevel(frame.rulaScore?.finalScore || 0)}`);
          addText(`  Body Parts: UA:${frame.rulaScore?.upperArm || 0} LA:${frame.rulaScore?.lowerArm || 0} W:${frame.rulaScore?.wrist || 0} N:${frame.rulaScore?.neck || 0} T:${frame.rulaScore?.trunk || 0}`);
          
          if (frame.hasObject) {
            addText(`  Object detected in this frame`);
          }
          yPosition += 2;
        }
      });
    }

    // Footer
    yPosition = pageHeight - margin;
    addText(`Generated by ErgoTrack on ${new Date().toLocaleString()}`, 8, false, 'center');

    // Download the PDF
    const fileName = `ErgoTrack_Assessment_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
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
                onClick={generatePDFReport}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                title="Generate Assessment Report PDF"
              >
                <span className="material-icon">description</span>
                <span>Generate PDF Report</span>
              </button>
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
                  <button
                    onClick={() => setShowSecondObjectDetection(true)}
                    className="px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm"
                  >
                    Second Scan
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
              Normal RULA scores from recording session. Red dots indicate detected objects. Click on points to view frame details.
            </p>
          </div>
        )}

        {/* Estimated Weight Graph - Shows both live and estimated data */}
        {activeGraph === 'estimated' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-lg font-medium mb-3 text-orange-400">Weight-Adjusted RULA Analysis (Recording Session)</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={recordingGraphData.map((liveData, index) => ({
                    ...liveData,
                    liveRulaScore: liveData.rulaScore,
                    estimatedRulaScore: estimatedGraphData[index]?.rulaScore || liveData.rulaScore
                  }))} 
                  onClick={handleChartClick}
                >
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
                      if (name === 'liveRulaScore') return [value, 'Live RULA Score'];
                      if (name === 'estimatedRulaScore') return [value, 'Weight-Adjusted RULA Score'];
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#F9FAFB'
                    }}
                  />
                  {/* Blue line for live RULA scores */}
                  <Line 
                    type="monotone" 
                    dataKey="liveRulaScore" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={(props: any) => {
                      if (props.payload.hasObject) {
                        return <circle cx={props.cx} cy={props.cy} r={4} fill="#EF4444" stroke="#DC2626" strokeWidth={2} />;
                      }
                      return <circle cx={props.cx} cy={props.cy} r={2} fill="#3B82F6" />;
                    }}
                  />
                  {/* Orange line for estimated weight-adjusted RULA scores */}
                  <Line 
                    type="monotone" 
                    dataKey="estimatedRulaScore" 
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
              Blue line: Live RULA scores | Orange line: Weight-adjusted RULA scores | Red dots indicate detected objects. Click on points to view frame details.
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

                    {/* Posture Analysis Status for Recorded Frame */}
                    {getCurrentRulaScore(selectedFrame) && (
                      <div className="mt-4 p-4 rounded-lg bg-blue-600 bg-opacity-20 border-2 border-blue-400">
                        <div className="flex items-start space-x-3">
                          <div className="bg-blue-500 rounded-full p-2 flex-shrink-0">
                            <span className="material-icon text-white text-lg">psychology</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-blue-300 mb-2 text-sm">
                              Posture Analysis Status 
                              {analysisMode === 'manual' && manualWeights.length > 0 && (
                                <span className="ml-2 px-2 py-1 bg-yellow-900/20 border border-yellow-700 rounded text-xs">
                                  Weight Adjusted ({manualWeights.reduce((total, weight) => total + weight.weight, 0)}g)
                                </span>
                              )}
                            </h4>
                            <div className="bg-dark-secondary rounded-lg p-3">
                              <p className="text-white text-sm leading-relaxed">
                                {generatePostureAnalysis(
                                  getCurrentRulaScore(selectedFrame),
                                  analysisMode === 'manual' && manualWeights.length > 0 ? 'manual' : 'recorded'
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-text-secondary">No RULA data available for this frame</p>
                )}
              </div>
              )}

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

      {/* Smart Object Detection Weight Management Dialog */}
      {showWeightDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Smart Object Detection & Weight Management</h3>
              <button
                onClick={() => setShowWeightDialog(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <ObjectDetectionWeightInput
              onAddWeight={addManualWeightFromInput}
              existingWeights={manualWeights}
              videoRef={videoRef}
              currentPoseData={currentPoseData}
              isVisible={showWeightDialog}
              recordedFrames={recordingData}
            />
          </div>
        </div>
      )}

      {/* Second Object Detection Dialog */}
      {showSecondObjectDetection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-card rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-medium">Second Object Detection Scan</h3>
              <button
                onClick={() => setShowSecondObjectDetection(false)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-icon">close</span>
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
              <p className="text-sm text-blue-300">
                Running a second object detection scan to find any objects that might have been missed in the first scan. 
                This will analyze all recorded frames again with different detection parameters.
              </p>
            </div>

            <ObjectDetectionWeightInput
              onAddWeight={addManualWeightFromInput}
              existingWeights={manualWeights}
              videoRef={videoRef}
              currentPoseData={currentPoseData}
              isVisible={showSecondObjectDetection}
              recordedFrames={recordingData}
            />
          </div>
        </div>
      )}



    </div>
  );
}