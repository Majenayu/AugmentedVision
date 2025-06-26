import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeObjectDetection, detectObjectsFromImageData, type DetectedObject } from '@/lib/object-detection';
import { ManualWeight } from './manual-weight-input';

interface ObjectWithCrop extends DetectedObject {
  croppedImage: string;
}

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
  const [detectedObjects, setDetectedObjects] = useState<ObjectWithCrop[]>([]);
  const [weightInputs, setWeightInputs] = useState<{[key: string]: string}>({});
  const [lastAnalyzedFrame, setLastAnalyzedFrame] = useState<string>('');
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

  // Auto-analyze frame when a new frame is selected
  useEffect(() => {
    if (selectedFrame && isModelLoaded && selectedFrame.imageData !== lastAnalyzedFrame) {
      analyzeFrame();
    }
  }, [selectedFrame, isModelLoaded]);

  const cropObjectFromImage = (imageData: string, bbox: [number, number, number, number]): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return resolve('');
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');

        const [x, y, width, height] = bbox;
        
        // Set canvas size to cropped area with some padding
        const padding = 20;
        canvas.width = width + padding * 2;
        canvas.height = height + padding * 2;
        
        // Draw the cropped area
        ctx.drawImage(
          img,
          x - padding, y - padding, width + padding * 2, height + padding * 2,
          0, 0, canvas.width, canvas.height
        );
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = imageData;
    });
  };

  const analyzeFrame = async () => {
    if (!selectedFrame || !isModelLoaded) return;

    setIsAnalyzing(true);
    try {
      console.log('Analyzing recorded frame for objects...');
      
      // Detect objects in the recorded frame image
      const objects = await detectObjectsFromImageData(selectedFrame.imageData);
      
      console.log(`Found ${objects.length} objects in recorded frame:`, objects.map(o => o.class));

      // Create cropped images for each detected object
      const objectsWithCrops: ObjectWithCrop[] = [];
      
      for (const obj of objects) {
        const croppedImage = await cropObjectFromImage(selectedFrame.imageData, obj.bbox);
        objectsWithCrops.push({
          ...obj,
          croppedImage
        });
      }
      
      setDetectedObjects(objectsWithCrops);
      setLastAnalyzedFrame(selectedFrame.imageData);
    } catch (error) {
      console.error('Frame analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleWeightChange = (objectId: string, value: string) => {
    setWeightInputs(prev => ({
      ...prev,
      [objectId]: value
    }));
  };

  const addObjectWithWeight = (obj: ObjectWithCrop, index: number) => {
    const objectId = `${obj.class}-${index}`;
    const weightValue = weightInputs[objectId];
    
    if (!weightValue || isNaN(Number(weightValue)) || Number(weightValue) <= 0) {
      alert('Please enter a valid weight in grams');
      return;
    }

    const weight: ManualWeight = {
      id: `${Date.now()}-${obj.class}`,
      name: obj.class,
      weight: Number(weightValue),
      icon: obj.icon,
      previewImage: obj.croppedImage
    };
    
    onAddWeight(weight);
    
    // Clear the input after adding
    setWeightInputs(prev => ({
      ...prev,
      [objectId]: ''
    }));
  };

  if (!isVisible || !selectedFrame) return null;

  return (
    <div className="space-y-4">
      {/* Hidden canvas for image cropping */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Analysis Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📷</span>
            <span>Object Detection</span>
            {isModelLoaded && (
              <span className="ml-2 px-2 py-1 bg-blue-900/20 border border-blue-700 rounded text-xs">
                {isAnalyzing ? 'Analyzing...' : 'Ready'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isModelLoaded ? (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-400">Loading detection model...</p>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detected Objects with Cropped Images */}
      {detectedObjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Objects ({detectedObjects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {detectedObjects.map((obj, index) => {
                const objectId = `${obj.class}-${index}`;
                
                return (
                  <div
                    key={objectId}
                    className="bg-gray-800 border border-gray-600 rounded-lg p-4"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Cropped Object Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={obj.croppedImage}
                          alt={`Detected ${obj.class}`}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-500"
                        />
                      </div>
                      
                      {/* Object Details and Weight Input */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="font-medium text-white flex items-center space-x-2">
                            <span className="text-xl">{obj.icon}</span>
                            <span>{obj.class}</span>
                          </div>
                          <div className="text-sm text-gray-400">
                            Confidence: {Math.round(obj.confidence * 100)}%
                          </div>
                        </div>
                        
                        {/* Weight Input */}
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            placeholder="Weight in grams"
                            value={weightInputs[objectId] || ''}
                            onChange={(e) => handleWeightChange(objectId, e.target.value)}
                            className="w-32"
                            min="1"
                          />
                          <span className="text-sm text-gray-400">grams</span>
                          <Button
                            onClick={() => addObjectWithWeight(obj, index)}
                            size="sm"
                            disabled={!weightInputs[objectId] || isNaN(Number(weightInputs[objectId])) || Number(weightInputs[objectId]) <= 0}
                          >
                            Add Object
                          </Button>
                        </div>
                      </div>
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
              Try selecting a frame where objects are clearly visible
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}