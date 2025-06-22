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
  const [hasRunFirstScan, setHasRunFirstScan] = useState(false);
  const [scanCount, setScanCount] = useState(0);
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

  // Crop object from base64 image data
  const cropObjectFromImage = (imageData: string, bbox: [number, number, number, number]): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('');

      const img = new Image();
      img.onload = () => {
        const [x, y, width, height] = bbox;
        const padding = 20;
        
        canvas.width = width + padding * 2;
        canvas.height = height + padding * 2;
        
        ctx.drawImage(img, x, y, width, height, padding, padding, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = imageData;
    });
  };

  const analyzeRecordedFrames = async () => {
    if (!isModelLoaded || recordedFrames.length === 0) return;

    setIsAnalyzing(true);
    console.log(`Starting analysis of ${recordedFrames.length} recorded frames...`);

    try {
      const allObjectsWithCrops: ObjectWithCrop[] = [];

      // Analyze every 5th frame to cover the entire recording
      const framesToAnalyze = recordedFrames.filter((_, index) => index % 5 === 0);
      console.log(`Analyzing ${framesToAnalyze.length} frames (every 5th frame)...`);

      for (let i = 0; i < framesToAnalyze.length; i++) {
        const frame = framesToAnalyze[i];
        
        try {
          console.log(`Analyzing frame ${i + 1}/${framesToAnalyze.length}`);
          
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = frame.imageData;
          });

          const objects = await detectObjects(img);
          console.log(`Frame ${i + 1}: Found ${objects.length} objects`);

          for (const obj of objects) {
            const croppedImage = await cropObjectFromImage(frame.imageData, obj.bbox);
            if (croppedImage) {
              allObjectsWithCrops.push({
                ...obj,
                croppedImage,
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

      // Remove duplicates - keep only one instance of each object type with highest confidence
      const uniqueObjects: ObjectWithCrop[] = [];

      allObjectsWithCrops.forEach(obj => {
        const existingObj = uniqueObjects.find(u => u.class === obj.class);
        if (!existingObj) {
          uniqueObjects.push(obj);
        } else if (obj.confidence > existingObj.confidence) {
          const index = uniqueObjects.indexOf(existingObj);
          uniqueObjects[index] = obj;
        }
      });

      console.log(`After deduplication: ${uniqueObjects.length} unique objects`);
      setDetectedObjects(uniqueObjects);
      setHasRunFirstScan(true);
      setScanCount(1);
    } catch (error) {
      console.error('Recorded frames analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Enhanced second scan with different detection parameters
  const runSecondScan = async () => {
    if (!isModelLoaded || recordedFrames.length === 0) return;

    setIsAnalyzing(true);
    console.log('Starting second scan with enhanced parameters...');

    try {
      const allObjectsWithCrops: ObjectWithCrop[] = [];

      // Use different frame sampling for second scan - analyze frames we didn't check before
      const framesToAnalyze = recordedFrames.filter((_, index) => 
        index % 3 === 0 || index % 7 === 0 // Different sampling pattern
      );

      console.log(`Second scan: analyzing ${framesToAnalyze.length} frames with different sampling...`);

      for (let i = 0; i < framesToAnalyze.length; i++) {
        const frame = framesToAnalyze[i];
        
        try {
          console.log(`Second scan - analyzing frame ${i + 1}/${framesToAnalyze.length}`);
          
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = frame.imageData;
          });

          const objects = await detectObjects(img);
          console.log(`Second scan frame ${i + 1}: Found ${objects.length} objects`);

          for (const obj of objects) {
            // Skip if we already have this object type
            const alreadyExists = detectedObjects.some(existing => existing.class === obj.class);
            if (alreadyExists) continue;

            const croppedImage = await cropObjectFromImage(frame.imageData, obj.bbox);
            if (croppedImage) {
              allObjectsWithCrops.push({
                ...obj,
                croppedImage,
                frameIndex: i,
                frameTimestamp: frame.timestamp
              } as ObjectWithCrop & { frameIndex: number; frameTimestamp: number });
              console.log(`Second scan frame ${i + 1}: Found new object ${obj.class}`);
            }
          }
        } catch (frameError) {
          console.error(`Error in second scan frame ${i + 1}:`, frameError);
        }
      }

      // Add only new objects that weren't found in first scan
      const newObjects = allObjectsWithCrops.filter(newObj => 
        !detectedObjects.some(existing => existing.class === newObj.class)
      );

      console.log(`Second scan complete: Found ${newObjects.length} additional objects`);
      setDetectedObjects(prev => [...prev, ...newObjects]);
      setScanCount(2);
    } catch (error) {
      console.error('Second scan error:', error);
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
    
    if (!weightValue || isNaN(Number(weightValue))) {
      alert('Please enter a valid weight in grams');
      return;
    }

    const weight: ManualWeight = {
      id: `obj-${Date.now()}-${Math.random()}`,
      name: obj.class,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Object Detection Analysis</h3>
          <div className="flex space-x-2">
            {hasRunFirstScan && scanCount < 2 && (
              <Button 
                onClick={runSecondScan}
                disabled={isAnalyzing}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isAnalyzing ? 'Scanning...' : 'Second Scan'}
              </Button>
            )}
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>

        {!isModelLoaded && (
          <div className="text-center py-8">
            <p>Loading object detection model...</p>
          </div>
        )}

        {isModelLoaded && recordedFrames.length === 0 && (
          <div className="text-center py-8">
            <p>No recorded frames available for analysis.</p>
          </div>
        )}

        {isModelLoaded && recordedFrames.length > 0 && detectedObjects.length === 0 && !isAnalyzing && !hasRunFirstScan && (
          <div className="text-center py-8">
            <Button onClick={analyzeRecordedFrames} className="bg-blue-600 hover:bg-blue-700">
              Start Object Detection Analysis
            </Button>
            <p className="text-sm text-gray-400 mt-2">
              This will analyze {recordedFrames.length} recorded frames to detect objects
            </p>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Analyzing frames for objects...</p>
          </div>
        )}

        {detectedObjects.length > 0 && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h4 className="text-lg font-medium">
                Detected Objects ({detectedObjects.length})
                {scanCount > 1 && <span className="text-sm text-gray-400 ml-2">(After {scanCount} scans)</span>}
              </h4>
              {hasRunFirstScan && scanCount < 2 && (
                <p className="text-sm text-gray-400">
                  Run a second scan to find more objects
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {detectedObjects.map((obj, index) => {
                const objectId = `${obj.class}-${index}`;
                return (
                  <Card key={objectId} className="bg-gray-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm capitalize">{obj.class}</CardTitle>
                      <p className="text-xs text-gray-400">
                        Confidence: {(obj.confidence * 100).toFixed(1)}%
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="w-full h-32 bg-gray-600 rounded flex items-center justify-center overflow-hidden">
                          {obj.croppedImage ? (
                            <img 
                              src={obj.croppedImage} 
                              alt={obj.class}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <span className="text-gray-400">No preview</span>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            placeholder="Weight (grams)"
                            value={weightInputs[objectId] || ''}
                            onChange={(e) => handleWeightChange(objectId, e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            onClick={() => addObjectWithWeight(obj, index)}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}