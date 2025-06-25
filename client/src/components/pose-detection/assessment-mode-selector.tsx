import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type AssessmentMode = 'RULA' | 'REBA';

interface AssessmentModeSelectorProps {
  onModeSelect: (mode: AssessmentMode) => void;
  isLocked: boolean;
}

export default function AssessmentModeSelector({ onModeSelect, isLocked }: AssessmentModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<AssessmentMode | null>(null);

  const handleModeSelection = (mode: AssessmentMode) => {
    if (isLocked) return;
    setSelectedMode(mode);
    onModeSelect(mode);
  };

  if (isLocked && selectedMode) {
    return (
      <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {selectedMode} Mode Active - Camera Started
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Select Assessment Method</h2>
        <p className="text-gray-600">Choose the ergonomic assessment method before starting the camera</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* RULA Card */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            selectedMode === 'RULA' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => handleModeSelection('RULA')}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              RULA
              <Badge variant="outline">Upper Body</Badge>
            </CardTitle>
            <CardDescription>
              Rapid Upper Limb Assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Focus Areas:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Upper arms and shoulders</li>
                <li>• Forearms and elbows</li>
                <li>• Wrists and hands</li>
                <li>• Neck and upper trunk</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Best For:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Desk and computer work</li>
                <li>• Assembly line tasks</li>
                <li>• Precision manual work</li>
                <li>• Upper body intensive activities</li>
              </ul>
            </div>

            <div className="pt-2">
              <Button 
                variant={selectedMode === 'RULA' ? 'default' : 'outline'}
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeSelection('RULA');
                }}
              >
                {selectedMode === 'RULA' ? 'Selected' : 'Select RULA'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* REBA Card */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            selectedMode === 'REBA' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => handleModeSelection('REBA')}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              REBA
              <Badge variant="outline">Full Body</Badge>
            </CardTitle>
            <CardDescription>
              Rapid Entire Body Assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Focus Areas:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Complete upper body (arms, neck, trunk)</li>
                <li>• Lower body (legs, knees, ankles)</li>
                <li>• Load and force factors</li>
                <li>• Whole body posture analysis</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Best For:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Manual handling tasks</li>
                <li>• Lifting and carrying</li>
                <li>• Standing work positions</li>
                <li>• Full body movement analysis</li>
              </ul>
            </div>

            <div className="pt-2">
              <Button 
                variant={selectedMode === 'REBA' ? 'default' : 'outline'}
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeSelection('REBA');
                }}
              >
                {selectedMode === 'REBA' ? 'Selected' : 'Select REBA'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedMode && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-600 mb-4">
            {selectedMode} mode selected. Once you start the camera, this selection will be locked.
          </p>
          <Badge variant="secondary" className="px-4 py-2">
            Ready to start with {selectedMode} assessment
          </Badge>
        </div>
      )}
    </div>
  );
}