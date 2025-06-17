import { useState } from "react";

export interface ObjectType {
  id: string;
  name: string;
  icon: string;
  defaultWeight: number;
  category: 'tools' | 'boxes' | 'bags' | 'equipment';
}

export interface ManualWeight {
  id: string;
  name: string;
  weight: number;
  icon: string;
  previewImage?: string;
}

interface ManualWeightInputProps {
  onAddWeight: (weight: ManualWeight) => void;
  existingWeights: ManualWeight[];
  recordedFrames?: Array<{
    timestamp: number;
    imageData: string;
    poseData: any;
    hasObject?: boolean;
  }>;
}

const OBJECT_TYPES: ObjectType[] = [
  // Tools
  { id: 'hammer', name: 'Hammer', icon: '🔨', defaultWeight: 500, category: 'tools' },
  { id: 'drill', name: 'Drill', icon: '🪚', defaultWeight: 1500, category: 'tools' },
  { id: 'wrench', name: 'Wrench', icon: '🔧', defaultWeight: 300, category: 'tools' },
  { id: 'screwdriver', name: 'Screwdriver', icon: '🪛', defaultWeight: 150, category: 'tools' },
  
  // Boxes
  { id: 'small_box', name: 'Small Box', icon: '📦', defaultWeight: 2000, category: 'boxes' },
  { id: 'medium_box', name: 'Medium Box', icon: '📦', defaultWeight: 5000, category: 'boxes' },
  { id: 'large_box', name: 'Large Box', icon: '📦', defaultWeight: 10000, category: 'boxes' },
  
  // Bags
  { id: 'laptop_bag', name: 'Laptop Bag', icon: '💼', defaultWeight: 2500, category: 'bags' },
  { id: 'backpack', name: 'Backpack', icon: '🎒', defaultWeight: 1500, category: 'bags' },
  { id: 'shopping_bag', name: 'Shopping Bag', icon: '🛍️', defaultWeight: 1000, category: 'bags' },
  
  // Equipment
  { id: 'monitor', name: 'Monitor', icon: '🖥️', defaultWeight: 8000, category: 'equipment' },
  { id: 'printer', name: 'Printer', icon: '🖨️', defaultWeight: 12000, category: 'equipment' },
  { id: 'keyboard', name: 'Keyboard', icon: '⌨️', defaultWeight: 800, category: 'equipment' },
];

export default function ManualWeightInput({ onAddWeight, existingWeights, recordedFrames = [] }: ManualWeightInputProps) {
  const [selectedDetectedObject, setSelectedDetectedObject] = useState<{id: string, imageData: string, name: string} | null>(null);
  const [customWeight, setCustomWeight] = useState<number>(0);

  // Extract unique detected objects from recorded frames
  const getDetectedObjects = () => {
    const detectedObjects: Array<{id: string, imageData: string, name: string}> = [];
    const seenObjects = new Set<string>();

    recordedFrames.forEach((frame, index) => {
      if (frame.hasObject && frame.imageData) {
        // Create a unique identifier based on frame characteristics
        const objectId = `detected_object_${index}`;
        const objectName = `Object ${detectedObjects.length + 1}`;
        
        // For now, we'll treat each frame with an object as a potential unique object
        // In a real implementation, you'd use computer vision to identify similar objects
        if (!seenObjects.has(objectId)) {
          seenObjects.add(objectId);
          detectedObjects.push({
            id: objectId,
            imageData: frame.imageData,
            name: objectName
          });
        }
      }
    });

    return detectedObjects;
  };

  const detectedObjects = getDetectedObjects();

  const handleDetectedObjectSelect = (detectedObject: {id: string, imageData: string, name: string}) => {
    setSelectedDetectedObject(detectedObject);
    setCustomWeight(1000); // Default 1kg
  };

  const handleAddWeight = () => {
    if (selectedDetectedObject && customWeight > 0) {
      // Check if object already exists
      const exists = existingWeights.some(w => w.id === selectedDetectedObject.id);
      if (!exists) {
        const newWeight: ManualWeight = {
          id: selectedDetectedObject.id,
          name: selectedDetectedObject.name,
          weight: customWeight,
          icon: "📦",
          previewImage: selectedDetectedObject.imageData
        };
        onAddWeight(newWeight);
        setSelectedDetectedObject(null);
        setCustomWeight(0);
      }
    }
  };

  const isObjectAdded = (objectId: string) => {
    return existingWeights.some(w => w.id === objectId);
  };

  return (
    <div className="bg-dark-card rounded-lg p-4 max-w-md">
      <h4 className="text-lg font-medium mb-4 text-white">Add Object Weight</h4>
      
      {/* Show detected objects from recorded frames */}
      {detectedObjects.length > 0 ? (
        <>
          <div className="text-sm text-gray-300 mb-3">
            Detected objects from your recording:
          </div>
          
          {/* Detected Objects Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {detectedObjects.map(detectedObject => (
              <button
                key={detectedObject.id}
                onClick={() => handleDetectedObjectSelect(detectedObject)}
                disabled={isObjectAdded(detectedObject.id)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  selectedDetectedObject?.id === detectedObject.id
                    ? 'border-blue-500 bg-blue-900/30'
                    : isObjectAdded(detectedObject.id)
                    ? 'border-gray-600 bg-gray-800/50 opacity-50 cursor-not-allowed'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-600/50'
                }`}
              >
                <div className="aspect-square mb-2">
                  <img 
                    src={detectedObject.imageData} 
                    alt={detectedObject.name}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="text-xs text-gray-300 text-center">{detectedObject.name}</div>
                {isObjectAdded(detectedObject.id) && (
                  <div className="text-xs text-green-400 mt-1 text-center">✓ Added</div>
                )}
              </button>
            ))}
          </div>

          {/* Weight Input for Selected Object */}
          {selectedDetectedObject && (
            <div className="space-y-3">
              <div className="text-center p-3 bg-blue-900/30 rounded-lg">
                <img 
                  src={selectedDetectedObject.imageData} 
                  alt={selectedDetectedObject.name}
                  className="w-16 h-16 object-cover rounded mx-auto mb-2"
                />
                <div className="text-white font-medium">{selectedDetectedObject.name}</div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Weight (grams)
                </label>
                <input
                  type="number"
                  value={customWeight}
                  onChange={(e) => setCustomWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Enter weight in grams"
                  min="1"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleAddWeight}
                  disabled={customWeight <= 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add Weight
                </button>
                <button
                  onClick={() => {
                    setSelectedDetectedObject(null);
                    setCustomWeight(0);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📷</div>
          <div className="text-sm">No objects detected in recording</div>
          <div className="text-xs mt-1">Record a session while holding objects to add their weights</div>
        </div>
      )}

      {/* Added Objects List */}
      {existingWeights.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <h5 className="text-sm font-medium text-gray-300 mb-2">Added Objects:</h5>
          <div className="space-y-2">
            {existingWeights.map(weight => (
              <div key={weight.id} className="flex items-center space-x-3 bg-gray-700/50 p-2 rounded-lg">
                {weight.previewImage ? (
                  <div className="w-12 h-9 bg-gray-800 rounded overflow-hidden border border-gray-600 flex-shrink-0">
                    <img 
                      src={weight.previewImage} 
                      alt={weight.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-9 bg-gray-800 rounded border border-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{weight.icon}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 text-sm truncate">{weight.name}</div>
                  <div className="text-white text-sm font-medium">{weight.weight}g</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-300">Total Weight:</span>
              <span className="text-white">{existingWeights.reduce((sum, w) => sum + w.weight, 0)}g</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}