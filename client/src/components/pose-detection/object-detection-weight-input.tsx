import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeObjectDetection, detectObjects, type DetectedObject } from '@/lib/object-detection';
import { ManualWeight } from './manual-weight-input';

interface ObjectWithCrop extends DetectedObject {
  croppedImage: string;
}

interface ObjectDetectionWeightInputProps {
  onAddWeight: (weight: ManualWeight) => void;
  existingWeights: ManualWeight[];
  videoRef?: React.RefObject<HTMLVideoElement>;
  currentPoseData?: any;
  isVisible: boolean;
  recordedFrames?: Array<{
    timestamp: number;
    imageData: string;
    poseData: any;
    hasObject?: boolean;
  }>;
}

export default function ObjectDetectionWeightInput({
  onAddWeight,
  existingWeights,
  videoRef,
  currentPoseData,
  isVisible,
  recordedFrames = []
}: ObjectDetectionWeightInputProps) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<ObjectWithCrop[]>([]);
  const [weightInputs, setWeightInputs] = useState<{[key: string]: string}>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize object detection model
  useEffect(() => {
    const initModel = async () => {
      try {
        console.log('Starting object detection model initialization...');
        await initializeObjectDetection();
        console.log('Object detection model initialized successfully');
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Failed to initialize object detection:', error);
        setIsModelLoaded(false);
      }
    };

    if (isVisible) {
      console.log('Object detection dialog is visible, initializing model...');
      initModel();
    }
  }, [isVisible]);

  const cropObjectFromVideo = (bbox: [number, number, number, number]): Promise<string> => {
    return new Promise((resolve) => {
      if (!videoRef?.current || !canvasRef.current) {
        return resolve('');
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return resolve('');

      const [x, y, width, height] = bbox;

      // Set canvas size to cropped area with padding
      const padding = 20;
      canvas.width = width + padding * 2;
      canvas.height = height + padding * 2;

      // Draw the cropped area from video
      ctx.drawImage(
        video,
        x - padding, y - padding, width + padding * 2, height + padding * 2,
        0, 0, canvas.width, canvas.height
      );

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    });
  };

  const cropObjectFromImage = (imageData: string, bbox: [number, number, number, number]): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return resolve('');

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');

        const [x, y, width, height] = bbox;

        // Set canvas size to cropped area with padding
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

  const analyzeAllRecordedFrames = async () => {
    if (!isModelLoaded || recordedFrames.length === 0) {
      console.log('Model not ready or no recorded frames:', { 
        isModelLoaded, 
        recordedFramesCount: recordedFrames.length 
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log(`Analyzing ${recordedFrames.length} recorded frames for objects...`);

      const allObjectsWithCrops: ObjectWithCrop[] = [];

      for (let i = 0; i < recordedFrames.length; i++) {
        const frame = recordedFrames[i];
        console.log(`Processing frame ${i + 1}/${recordedFrames.length} at time ${Math.round(frame.timestamp / 1000)}s`);

        try {
          // Detect objects in this frame's image data
          const objects = await detectObjects(frame.imageData);

          console.log(`Frame ${i + 1}: Found ${objects.length} objects`);

          // Create cropped images for each detected object
          for (const obj of objects) {
            const croppedImage = await cropObjectFromImage(frame.imageData, obj.bbox);
            if (croppedImage) {
              allObjectsWithCrops.push({
                ...obj,
                croppedImage,
                // Add frame info to distinguish objects from different frames
                frameIndex: i,
                frameTimestamp: frame.timestamp
              } as ObjectWithCrop & { frameIndex: number; frameTimestamp: number });
              console.log(`Frame ${i + 1}: Successfully processed ${obj.class}`);
            }
          }
        } catch (frameError) {
          console.error(`Error processing frame ${i + 1}:`, frameError);
        }
      }

      console.log(`Analysis complete: Found ${allObjectsWithCrops.length} total objects across all frames`);

      // Remove duplicates - keep only one instance of each object type
      const uniqueObjects: ObjectWithCrop[] = [];

      allObjectsWithCrops.forEach(obj => {
        const existingObj = uniqueObjects.find(u => u.class === obj.class);
        if (!existingObj) {
          // First occurrence of this object type
          uniqueObjects.push(obj);
        } else if (obj.confidence > existingObj.confidence) {
          // Replace with higher confidence detection
          const index = uniqueObjects.indexOf(existingObj);
          uniqueObjects[index] = obj;
        }
      });

      console.log(`After deduplication: ${uniqueObjects.length} unique objects`);
      setDetectedObjects(uniqueObjects);
    } catch (error) {
      console.error('Recorded frames analysis error:', error);
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
      id: `${Date.now()}-object-${index}`,
      name: `Object ${index + 1}`,
      weight: Number(weightValue),
      icon: '📦',
      previewImage: obj.croppedImage
    };

    onAddWeight(weight);

    // Clear the input after adding
    setWeightInputs(prev => ({
      ...prev,
      [objectId]: ''
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-4">
      {/* Hidden canvas for image cropping */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Detection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📷</span>
            <span>Detect Objects</span>
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
            <div className="space-y-2">
              <Button
                onClick={analyzeAllRecordedFrames}
                disabled={isAnalyzing || recordedFrames.length === 0}
                className="w-full"
              >
                {isAnalyzing ? 'Analyzing Recorded Frames...' : `Detect Objects in All Recorded Frames (${recordedFrames.length})`}
              </Button>
              <div className="text-xs text-gray-500 text-center">
                Model loaded: {isModelLoaded ? 'Yes' : 'No'} | 
                Recorded frames: {recordedFrames.length} |
                Objects found: {detectedObjects.length}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detected Objects with Photos */}
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
                      {/* Object Photo */}
                      <div className="flex-shrink-0">
                        <img
                          src={obj.croppedImage}
                          alt={`Detected Object ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-500"
                        />
                      </div>

                      {/* Object Details and Weight Input */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="font-medium text-white flex items-center space-x-2">
                            <span className="text-xl">📦</span>
                            <span>Object {index + 1}</span>
                          </div>
                          <div className="text-sm text-gray-400">
                            Confidence: {Math.round(obj.confidence * 100)}%
                            {(obj as any).frameTimestamp && (
                              <span> • Frame: {Math.round((obj as any).frameTimestamp / 1000)}s</span>
                            )}
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
            <div className="text-gray-400 mb-2">No objects detected</div>
            <div className="text-sm text-gray-500">
              {recordedFrames.length > 0 
                ? "Click the button above to analyze all recorded frames for objects"
                : "No recorded frames available to analyze"
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}