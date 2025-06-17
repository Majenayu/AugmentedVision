import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeObjectDetection, detectObjectsFromImageData, analyzeObjectInteraction, type DetectedObject } from '@/lib/object-detection';
import { ManualWeight } from './manual-weight-input';

interface RecordedFrameObjectDetectionProps {
  selectedFrame: {
    imageData: string;
    poseData: any;
    timestamp: number;
  } | null;
  onAddWeight: (weight: ManualWeight) => void;
  isVisible: boolean;
}

export default function RecordedFrameObjectDetection({
  selectedFrame,
  onAddWeight,
  isVisible
}: RecordedFrameObjectDetectionProps) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [analysisResult, setAnalysisResult] = useState<{
    isHoldingObject: boolean;
    heldObjects: DetectedObject[];
    totalEstimatedWeight: number;
  } | null>(null);
  const [lastAnalyzedFrame, setLastAnalyzedFrame] = useState<string>('');

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

  // Auto-analyze frame when a new frame is selected
  useEffect(() => {
    if (selectedFrame && isModelLoaded && selectedFrame.imageData !== lastAnalyzedFrame) {
      analyzeFrame();
    }
  }, [selectedFrame, isModelLoaded]);

  const analyzeFrame = async () => {
    if (!selectedFrame || !isModelLoaded) return;

    setIsAnalyzing(true);
    try {
      console.log('Analyzing recorded frame for objects...');
      
      // Detect objects in the recorded frame image
      const objects = await detectObjectsFromImageData(selectedFrame.imageData);
      setDetectedObjects(objects);
      
      console.log(`Found ${objects.length} objects in recorded frame:`, objects.map(o => o.class));

      // Analyze if person was holding objects in this frame
      if (selectedFrame.poseData?.keypoints && objects.length > 0) {
        // Estimate frame dimensions (assuming standard recording size)
        const frameWidth = 640;
        const frameHeight = 480;
        
        const result = analyzeObjectInteraction(
          objects,
          selectedFrame.poseData.keypoints,
          frameWidth,
          frameHeight
        );
        setAnalysisResult(result);
        
        console.log('Object interaction analysis:', result);
      } else {
        setAnalysisResult({
          isHoldingObject: false,
          heldObjects: [],
          totalEstimatedWeight: 0
        });
      }

      setLastAnalyzedFrame(selectedFrame.imageData);
    } catch (error) {
      console.error('Frame analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addDetectedObject = (obj: DetectedObject) => {
    const weight: ManualWeight = {
      id: `${Date.now()}-${obj.class}`,
      name: obj.class,
      weight: obj.estimatedWeight,
      icon: obj.icon
    };
    onAddWeight(weight);
  };

  const addAllHeldObjects = () => {
    if (analysisResult?.heldObjects) {
      analysisResult.heldObjects.forEach(obj => {
        addDetectedObject(obj);
      });
    }
  };

  if (!isVisible || !selectedFrame) return null;

  return (
    <div className="space-y-4">
      {/* Analysis Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🔍</span>
            <span>Recorded Frame Analysis</span>
            {isModelLoaded && (
              <Badge variant="outline" className="ml-2">
                {isAnalyzing ? 'Analyzing...' : 'Ready'}
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
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Frame time: {Math.round(selectedFrame.timestamp / 1000)}s
                </div>
                <Button
                  onClick={analyzeFrame}
                  disabled={isAnalyzing}
                  size="sm"
                  variant="outline"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Re-analyze Frame'}
                </Button>
              </div>

              {/* Analysis Results */}
              {analysisResult && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                  <h4 className="font-medium text-blue-400 mb-2">Analysis Result</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      Status: {analysisResult.isHoldingObject ? 
                        <span className="text-green-400">Person was holding object(s)</span> : 
                        <span className="text-gray-400">No objects detected in hands</span>
                      }
                    </div>
                    {analysisResult.heldObjects.length > 0 && (
                      <>
                        <div>
                          Objects in hands: {analysisResult.heldObjects.map(obj => obj.class).join(', ')}
                        </div>
                        <div>
                          Estimated weight: <span className="font-bold">{analysisResult.totalEstimatedWeight}g</span>
                        </div>
                        <Button
                          onClick={addAllHeldObjects}
                          size="sm"
                          className="mt-2"
                        >
                          Add All Held Objects ({analysisResult.heldObjects.length})
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Detected Objects */}
      {detectedObjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Detected Objects ({detectedObjects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {detectedObjects.map((obj, index) => {
                const isHeld = analysisResult?.heldObjects.some(held => held.class === obj.class) || false;
                
                return (
                  <div
                    key={`${obj.class}-${index}`}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isHeld 
                        ? 'bg-green-900/20 border-green-700' 
                        : 'bg-gray-800 border-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{obj.icon}</span>
                      <div>
                        <div className="font-medium flex items-center space-x-2">
                          <span>{obj.class}</span>
                          {isHeld && (
                            <Badge variant="outline" className="text-green-400 border-green-400">
                              In Hands
                            </Badge>
                          )}
                        </div>
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Objects Found */}
      {isModelLoaded && !isAnalyzing && detectedObjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-6">
            <div className="text-gray-400 mb-2">No objects detected in this frame</div>
            <div className="text-sm text-gray-500">
              The person may not be holding any recognizable objects, or objects may be partially obscured
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}