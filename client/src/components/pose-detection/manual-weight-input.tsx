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
  const [selectedCategory, setSelectedCategory] = useState<ObjectType['category']>('tools');
  const [customWeight, setCustomWeight] = useState<number>(0);
  const [selectedObject, setSelectedObject] = useState<ObjectType | null>(null);

  const categories = ['tools', 'boxes', 'bags', 'equipment'] as const;
  const filteredObjects = OBJECT_TYPES.filter(obj => obj.category === selectedCategory);

  const handleObjectSelect = (object: ObjectType) => {
    setSelectedObject(object);
    setCustomWeight(object.defaultWeight);
  };

  // Get preview image for detected objects
  const getObjectPreviewImage = () => {
    if (recordedFrames.length > 0) {
      // Find a frame where an object was detected
      const frameWithObject = recordedFrames.find(frame => frame.hasObject);
      return frameWithObject?.imageData || recordedFrames[Math.floor(recordedFrames.length / 2)]?.imageData;
    }
    return null;
  };

  const handleAddWeight = () => {
    if (selectedObject && customWeight > 0) {
      // Check if object already exists
      const exists = existingWeights.some(w => w.id === selectedObject.id);
      if (!exists) {
        const previewImage = getObjectPreviewImage();
        const newWeight: ManualWeight = {
          id: selectedObject.id,
          name: selectedObject.name,
          weight: customWeight,
          icon: selectedObject.icon,
          previewImage: previewImage || undefined
        };
        onAddWeight(newWeight);
        setSelectedObject(null);
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
      
      {/* Category Selection */}
      <div className="flex space-x-2 mb-4">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
              selectedCategory === category 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Object Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {filteredObjects.map(object => (
          <button
            key={object.id}
            onClick={() => handleObjectSelect(object)}
            disabled={isObjectAdded(object.id)}
            className={`p-3 rounded-lg border-2 transition-all text-center ${
              selectedObject?.id === object.id
                ? 'border-blue-500 bg-blue-900/30'
                : isObjectAdded(object.id)
                ? 'border-gray-600 bg-gray-800/50 opacity-50 cursor-not-allowed'
                : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-600/50'
            }`}
          >
            <div className="text-2xl mb-1">{object.icon}</div>
            <div className="text-xs text-gray-300">{object.name}</div>
            <div className="text-xs text-gray-400">{object.defaultWeight}g</div>
            {isObjectAdded(object.id) && (
              <div className="text-xs text-green-400 mt-1">✓ Added</div>
            )}
          </button>
        ))}
      </div>

      {/* Weight Input */}
      {selectedObject && (
        <div className="space-y-3">
          <div className="text-center p-3 bg-blue-900/30 rounded-lg">
            <div className="text-3xl mb-2">{selectedObject.icon}</div>
            <div className="text-white font-medium">{selectedObject.name}</div>
            
            {/* Preview Image */}
            {getObjectPreviewImage() && (
              <div className="mt-3">
                <div className="text-xs text-gray-300 mb-2">Detected in recording:</div>
                <div className="relative mx-auto w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
                  <img 
                    src={getObjectPreviewImage()!} 
                    alt="Object preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                    <div className="text-white text-xs bg-black bg-opacity-60 px-2 py-1 rounded">
                      Object detected
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">Weight (grams)</label>
            <input
              type="number"
              value={customWeight}
              onChange={(e) => setCustomWeight(Number(e.target.value))}
              min="1"
              max="50000"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="Enter weight in grams"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleAddWeight}
              disabled={customWeight <= 0}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-white transition-colors"
            >
              Add Object
            </button>
            <button
              onClick={() => {
                setSelectedObject(null);
                setCustomWeight(0);
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
            >
              Cancel
            </button>
          </div>
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