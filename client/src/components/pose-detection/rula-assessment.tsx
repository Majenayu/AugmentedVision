import React from 'react';
import { generatePostureAnalysis, getRiskBorderColor } from '@/lib/posture-analysis';

interface RebaAssessmentProps {
  rebaScore: any;
  poseData: any;
  isProcessing: boolean;
}

export default function RebaAssessment({ rebaScore, poseData, isProcessing }: RebaAssessmentProps) {
  const getRiskLevelColor = (score: number) => {
    if (score <= 2) return 'bg-rula-safe';
    if (score <= 4) return 'bg-rula-investigate';
    if (score <= 6) return 'bg-rula-change-soon';
    return 'bg-rula-change-asap';
  };

  const getRiskLevelText = (score: number) => {
    if (score <= 2) return 'Acceptable';
    if (score <= 4) return 'Investigate';
    if (score <= 6) return 'Investigate & Change Soon';
    return 'Investigate & Change ASAP';
  };

  const getRiskLevelTextColor = (score: number) => {
    if (score <= 2) return 'text-rula-safe';
    if (score <= 4) return 'text-rula-investigate';
    if (score <= 6) return 'text-rula-change-soon';
    return 'text-rula-change-asap';
  };

  const getScoreProgress = (score: number, max: number) => {
    return (score / max) * 100;
  };

  return (
    <div className="bg-dark-card rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-medium flex items-center space-x-2">
          <span className="material-icon text-orange-500">assessment</span>
          <span>REBA Ergonomic Assessment</span>
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
          <span className="text-sm text-text-secondary">
            {isProcessing ? 'Real-time Analysis' : 'Waiting for pose data'}
          </span>
        </div>
      </div>

      {/* Main RULA Score Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-3 ${
            rebaScore ? getRiskLevelColor(rebaScore.finalScore) : 'bg-gray-500'
          }`}>
            <span className="text-3xl font-bold text-white">
              {rebaScore ? rebaScore.finalScore : '--'}
            </span>
          </div>
          <h4 className="text-lg font-medium mb-1">REBA Score</h4>
          <p className="text-text-secondary text-sm">Current assessment level</p>
        </div>

        <div className="text-center">
          <div className="bg-material-blue w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-icon text-3xl text-white">trending_up</span>
          </div>
          <h4 className={`text-lg font-medium mb-1 ${
            rebaScore ? getRiskLevelTextColor(rebaScore.finalScore) : 'text-gray-400'
          }`}>
            {rebaScore ? getRiskLevelText(rebaScore.finalScore) : 'No Data'}
          </h4>
          <p className="text-text-secondary text-sm">Risk assessment</p>
        </div>


      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-dark-secondary rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Upper Arm</span>
            <span className="material-icon text-orange-500 text-lg">accessibility</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            {rebaScore?.upperArm || '--'}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
              style={{width: `${rebaScore ? getScoreProgress(rebaScore.upperArm, 4) : 0}%`}}
            ></div>
          </div>
        </div>

        <div className="bg-dark-secondary rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Lower Arm</span>
            <span className="material-icon text-blue-500 text-lg">pan_tool</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            {rebaScore?.lowerArm || '--'}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
              style={{width: `${rebaScore ? getScoreProgress(rebaScore.lowerArm, 2) : 0}%`}}
            ></div>
          </div>
        </div>

        <div className="bg-dark-secondary rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Wrist</span>
            <span className="material-icon text-green-500 text-lg">back_hand</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            {rebaScore?.wrist || '--'}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
              style={{width: `${rebaScore ? getScoreProgress(rebaScore.wrist, 2) : 0}%`}}
            ></div>
          </div>
        </div>

        <div className="bg-dark-secondary rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Neck</span>
            <span className="material-icon text-purple-500 text-lg">face</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            {rebaScore?.neck || '--'}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
              style={{width: `${rebaScore ? getScoreProgress(rebaScore.neck, 4) : 0}%`}}
            ></div>
          </div>
        </div>

        <div className="bg-dark-secondary rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Trunk</span>
            <span className="material-icon text-red-500 text-lg">accessibility_new</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            {rebaScore?.trunk || '--'}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
              style={{width: `${rebaScore ? getScoreProgress(rebaScore.trunk, 4) : 0}%`}}
            ></div>
          </div>
        </div>
      </div>

      

      {/* Risk Level Indicator */}
      {rebaScore && (
        <div className={`mt-4 p-4 rounded-lg border ${
          rebaScore.finalScore <= 2 
            ? 'bg-green-500 bg-opacity-20 border-green-500' 
            : rebaScore.finalScore <= 4
            ? 'bg-yellow-500 bg-opacity-20 border-yellow-500'
            : rebaScore.finalScore <= 6
            ? 'bg-orange-500 bg-opacity-20 border-orange-500'
            : 'bg-red-500 bg-opacity-20 border-red-500'
        }`}>
          <div className="flex items-center space-x-3">
            <span className={`material-icon text-2xl ${
              rebaScore.finalScore <= 2 
                ? 'text-green-500' 
                : rebaScore.finalScore <= 4
                ? 'text-yellow-500'
                : rebaScore.finalScore <= 6
                ? 'text-orange-500'
                : 'text-red-500'
            }`}>
              {rebaScore.finalScore <= 2 ? 'check_circle' : 'warning'}
            </span>
            <div>
              <h4 className={`font-medium ${getRiskLevelTextColor(rebaScore.finalScore)}`}>
                {getRiskLevelText(rebaScore.finalScore)} Risk Level
              </h4>
              <p className="text-text-secondary text-sm">
                {rebaScore.finalScore <= 2 
                  ? 'Current posture is within acceptable ergonomic parameters. Continue monitoring for any changes.'
                  : rebaScore.finalScore <= 4
                  ? 'Some ergonomic concerns detected. Consider investigating posture and making minor adjustments.'
                  : rebaScore.finalScore <= 6
                  ? 'Significant ergonomic issues identified. Changes should be made soon to prevent injury.'
                  : 'Critical ergonomic risk detected. Immediate intervention required to prevent musculoskeletal disorders.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}