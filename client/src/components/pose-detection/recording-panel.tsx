import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RecordingFrame {
  timestamp: number;
  rulaScore: any;
  imageData: string;
  poseData: any;
}

interface RecordingPanelProps {
  isRecording: boolean;
  recordingData: RecordingFrame[];
  recordingProgress: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording: () => void;
}

export default function RecordingPanel({
  isRecording,
  recordingData,
  recordingProgress,
  onStartRecording,
  onStopRecording,
  onClearRecording
}: RecordingPanelProps) {
  const [selectedFrame, setSelectedFrame] = useState<RecordingFrame | null>(null);

  const chartData = recordingData.map(frame => ({
    time: frame.timestamp,
    rulaScore: frame.rulaScore?.finalScore || 0,
    riskLevel: frame.rulaScore?.riskLevel || 'Unknown'
  }));

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const timestamp = data.activePayload[0].payload.time;
      const frame = recordingData.find(f => f.timestamp === timestamp);
      if (frame) {
        setSelectedFrame(frame);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-dark-card rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-medium flex items-center space-x-2">
          <span className="material-icon text-red-500">videocam</span>
          <span>Ergonomic Recording Session</span>
        </h3>
        <div className="flex items-center space-x-3">
          {!isRecording && recordingData.length === 0 && (
            <button
              onClick={onStartRecording}
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
            <button
              onClick={onClearRecording}
              className="bg-gray-600 hover:bg-gray-700 px-2 py-2 rounded-lg transition-colors"
              title="Clear Recording"
            >
              <span className="material-icon">delete</span>
            </button>
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

      {/* RULA Score Graph */}
      {recordingData.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-medium mb-3">RULA Score Timeline</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} onClick={handleChartClick}>
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
                  formatter={(value: any, name: string) => [
                    value,
                    'RULA Score'
                  ]}
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
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-text-secondary mt-2">
            Click on any point to view the frame details
          </p>
        </div>
      )}

      {/* Frame Details */}
      {selectedFrame && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-medium mb-3">
              Frame at {formatTime(selectedFrame.timestamp)}
            </h4>
            <img 
              src={selectedFrame.imageData} 
              alt="Recorded frame"
              className="w-full rounded-lg border border-gray-600"
            />
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-3">RULA Assessment</h4>
            {selectedFrame.rulaScore ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Final Score:</span>
                  <span className="font-bold text-xl">{selectedFrame.rulaScore.finalScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Risk Level:</span>
                  <span className={`font-medium ${
                    selectedFrame.rulaScore.finalScore <= 2 ? 'text-green-400' :
                    selectedFrame.rulaScore.finalScore <= 4 ? 'text-yellow-400' :
                    selectedFrame.rulaScore.finalScore <= 6 ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {selectedFrame.rulaScore.riskLevel}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-dark-secondary rounded p-3">
                    <div className="text-sm text-text-secondary">Upper Arm</div>
                    <div className="text-lg font-bold">{selectedFrame.rulaScore.upperArm}</div>
                  </div>
                  <div className="bg-dark-secondary rounded p-3">
                    <div className="text-sm text-text-secondary">Lower Arm</div>
                    <div className="text-lg font-bold">{selectedFrame.rulaScore.lowerArm}</div>
                  </div>
                  <div className="bg-dark-secondary rounded p-3">
                    <div className="text-sm text-text-secondary">Wrist</div>
                    <div className="text-lg font-bold">{selectedFrame.rulaScore.wrist}</div>
                  </div>
                  <div className="bg-dark-secondary rounded p-3">
                    <div className="text-sm text-text-secondary">Neck</div>
                    <div className="text-lg font-bold">{selectedFrame.rulaScore.neck}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary">No RULA data available for this frame</p>
            )}
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
    </div>
  );
}