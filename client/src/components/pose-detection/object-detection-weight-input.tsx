import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeObjectDetection, detectObjects, analyzeObjectInteraction, getWeightSuggestions, type DetectedObject } from '@/lib/object-detection';
import { ManualWeight } from './manual-weight-input';

interface ObjectDetectionWeightInputProps {
  onAddWeight: (weight: ManualWeight) => void;
  existingWeights: ManualWeight[];
  videoRef?: React.RefObject<HTMLVideoElement>;
  currentPoseData?: any;
  isVisible: boolean;
}

export default function ObjectDetectionWeightInput({
  onAddWeight,
  existingWeights,
  videoRef,
  currentPoseData,
  isVisible
}: ObjectDetectionWeightInputProps) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [customWeight, setCustomWeight] = useState({ name: '', weight: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    isHoldingObject: boolean;
    heldObjects: DetectedObject[];
    totalEstimatedWeight: number;
  } | null>(null);

  const detectionIntervalRef = useRef<NodeJS.Timeout>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize object detection model
  useEffect(() => {
    const initModel = async () => {
      try {
        await initializeObjectDetection();
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Failed to initialize object detection:', error);
      }
    };

    if (isVisible) {
      initModel();
    }
  }, [isVisible]);

  // Start continuous object detection when visible and model is loaded
  useEffect(() => {
    if (isVisible && isModelLoaded && videoRef?.current && !isDetecting) {
      startObjectDetection();
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isVisible, isModelLoaded, videoRef?.current]);

  const startObjectDetection = async () => {
    if (!videoRef?.current || !isModelLoaded) return;

    setIsDetecting(true);

    // Detect objects every 2 seconds to avoid performance issues
    detectionIntervalRef.current = setInterval(async () => {
      try {
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          const objects = await detectObjects(videoRef.current);
          setDetectedObjects(objects);

          // Analyze if person is holding objects
          if (currentPoseData?.keypoints && objects.length > 0) {
            const result = analyzeObjectInteraction(
              objects,
              currentPoseData.keypoints,
              videoRef.current.videoWidth,
              videoRef.current.videoHeight
            );
            setAnalysisResult(result);
          }
        }
      } catch (error) {
        console.error('Object detection error:', error);
      }
    }, 2000);
  };

  const stopObjectDetection = () => {
    setIsDetecting(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
  };

  const addDetectedObject = (obj: DetectedObject, customWeightValue?: number) => {
    const weight: ManualWeight = {
      id: Date.now().toString(),
      name: obj.class,
      weight: customWeightValue || obj.estimatedWeight,
      icon: obj.icon
    };
    onAddWeight(weight);
  };

  const addCustomWeight = () => {
    if (customWeight.name && customWeight.weight > 0) {
      const weight: ManualWeight = {
        id: Date.now().toString(),
        name: customWeight.name,
        weight: customWeight.weight,
        icon: '📦'
      };
      onAddWeight(weight);
      setCustomWeight({ name: '', weight: 0 });
    }
  };

  const analyzeCurrentFrame = async () => {
    if (!videoRef?.current || !isModelLoaded) return;

    setIsAnalyzing(true);
    try {
      const objects = await detectObjects(videoRef.current);
      setDetectedObjects(objects);

      if (currentPoseData?.keypoints && objects.length > 0) {
        const result = analyzeObjectInteraction(
          objects,
          currentPoseData.keypoints,
          videoRef.current.videoWidth,
          videoRef.current.videoHeight
        );
        setAnalysisResult(result);
      }
    } catch (error) {
      console.error('Frame analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      {/* Object Detection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🔍</span>
            <span>Smart Object Detection</span>
            {isModelLoaded && (
              <Badge variant="outline" className="ml-2">
                {isDetecting ? 'Active' : 'Ready'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isModelLoaded ? (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-400">Loading object detection model...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Button
                  onClick={analyzeCurrentFrame}
                  disabled={isAnalyzing}
                  size="sm"
                  variant="outline"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Current Frame'}
                </Button>
                <Button
                  onClick={isDetecting ? stopObjectDetection : startObjectDetection}
                  size="sm"
                  variant={isDetecting ? "destructive" : "default"}
                >
                  {isDetecting ? 'Stop Detection' : 'Start Detection'}
                </Button>
              </div>

              {/* Analysis Results */}
              {analysisResult && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                  <h4 className="font-medium text-blue-400 mb-2">Analysis Result</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      Status: {analysisResult.isHoldingObject ? 
                        <span className="text-green-400">Person is holding object(s)</span> : 
                        <span className="text-gray-400">No objects detected in hands</span>
                      }
                    </div>
                    {analysisResult.heldObjects.length > 0 && (
                      <div>
                        Objects: {analysisResult.heldObjects.map(obj => obj.class).join(', ')}
                      </div>
                    )}
                    <div>
                      Total Weight: <span className="font-bold">{analysisResult.totalEstimatedWeight}g</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detected Objects */}
      {detectedObjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Objects ({detectedObjects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {detectedObjects.map((obj, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-600"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{obj.icon}</span>
                    <div>
                      <div className="font-medium">{obj.class}</div>
                      <div className="text-sm text-gray-400">
                        Confidence: {Math.round(obj.confidence * 100)}% • 
                        Category: {obj.category}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="font-bold">{obj.estimatedWeight}g</div>
                      <div className="text-xs text-gray-400">estimated</div>
                    </div>
                    <Button
                      onClick={() => addDetectedObject(obj)}
                      size="sm"
                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Weight Input */}
      <Card>
        <CardHeader>
          <CardTitle>Add Custom Object</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Object Name</label>
                <Input
                  value={customWeight.name}
                  onChange={(e) => setCustomWeight(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Heavy toolbox"
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Weight (grams)</label>
                <Input
                  type="number"
                  value={customWeight.weight || ''}
                  onChange={(e) => setCustomWeight(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                  placeholder="2000"
                  className="bg-gray-800 border-gray-600"
                />
              </div>
            </div>
            <Button
              onClick={addCustomWeight}
              disabled={!customWeight.name || customWeight.weight <= 0}
              className="w-full"
            >
              Add Custom Object
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Weight Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Light Tool', weight: 500, icon: '🔧' },
              { name: 'Heavy Tool', weight: 1500, icon: '🔨' },
              { name: 'Small Box', weight: 1000, icon: '📦' },
              { name: 'Large Box', weight: 5000, icon: '📦' },
              { name: 'Water Bottle', weight: 500, icon: '🍼' },
              { name: 'Laptop', weight: 2000, icon: '💻' }
            ].map((preset, index) => (
              <Button
                key={index}
                onClick={() => addDetectedObject({
                  class: preset.name,
                  confidence: 1,
                  bbox: [0, 0, 0, 0],
                  estimatedWeight: preset.weight,
                  category: 'preset',
                  icon: preset.icon
                })}
                variant="outline"
                size="sm"
                className="justify-start"
              >
                <span className="mr-2">{preset.icon}</span>
                <span className="text-left">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-xs text-gray-400">{preset.weight}g</div>
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Manual Weights */}
      {existingWeights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Added Objects ({existingWeights.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingWeights.map((weight) => (
                <div
                  key={weight.id}
                  className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-600"
                >
                  <div className="flex items-center space-x-2">
                    <span>{weight.icon}</span>
                    <span className="font-medium">{weight.name}</span>
                  </div>
                  <span className="font-bold">{weight.weight}g</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-600">
                <div className="flex justify-between font-bold">
                  <span>Total Weight:</span>
                  <span>{existingWeights.reduce((sum, w) => sum + w.weight, 0)}g</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}