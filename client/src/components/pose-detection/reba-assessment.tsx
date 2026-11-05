import React from 'react';
import { generatePostureAnalysis, getRiskBorderColor } from '@/lib/posture-analysis';

interface RebaAssessmentProps {
  rebaScore: any;
  poseData: any;
  isProcessing: boolean;
  assessmentMode?: 'RULA' | 'REBA';
}

export default function RebaAssessment({ rebaScore, poseData, isProcessing, assessmentMode = 'REBA' }: RebaAssessmentProps) {
  const getRiskLevelColor = (score: number) => {
    if (score <= 2) return 'bg-reba-safe';
    if (score <= 4) return 'bg-reba-investigate';
    if (score <= 6) return 'bg-reba-change-soon';
    return 'bg-reba-change-asap';
  };

  const getRiskLevelText = (score: number) => {
    if (score <= 2) return 'Acceptable';
    if (score <= 4) return 'Investigate';
    if (score <= 6) return 'Investigate & Change Soon';
    return 'Investigate & Change ASAP';
  };

  const getRiskLevelTextColor = (score: number) => {
    if (score <= 2) return 'text-reba-safe';
    if (score <= 4) return 'text-reba-investigate';
    if (score <= 6) return 'text-reba-change-soon';
    return 'text-reba-change-asap';
  };

  const getScoreProgress = (score: number, max: number) => {
    return (score / max) * 100;
  };

  return (
    <div className="bg-dark-card rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <h3 className="text-base sm:text-xl font-medium flex items-center space-x-2">
          <span className="material-icon text-orange-500 text-lg sm:text-2xl">assessment</span>
          <span>{assessmentMode} Ergonomic Assessment</span>
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isProcessing ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
          <span className="text-xs sm:text-sm text-text-secondary">
            {isProcessing ? 'Real-time Analysis' : 'Waiting for pose data'}
          </span>
        </div>
      </div>

      {/* Main REBA Score Display */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="text-center">
          <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 ${
            rebaScore ? getRiskLevelColor(rebaScore.finalScore) : 'bg-gray-500'
          }`}>
            <span className="text-xl sm:text-3xl font-bold text-white">
              {rebaScore ? rebaScore.finalScore : '--'}
            </span>
          </div>
          <h4 className="text-sm sm:text-lg font-medium mb-1">{assessmentMode} Score</h4>
          <p className="text-text-secondary text-xs sm:text-sm">Current assessment level</p>
        </div>

        <div className="text-center">
          <div className="bg-material-blue w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <span className="material-icon text-xl sm:text-3xl text-white">trending_up</span>
          </div>
          <h4 className={`text-sm sm:text-lg font-medium mb-1 ${
            rebaScore ? getRiskLevelTextColor(rebaScore.finalScore) : 'text-gray-400'
          }`}>
            {rebaScore ? getRiskLevelText(rebaScore.finalScore) : 'No Data'}
          </h4>
          <p className="text-text-secondary text-xs sm:text-sm">Risk assessment</p>
        </div>


      </div>

      {/* Detailed Metrics */}
      <div className={`grid grid-cols-2 gap-2 sm:gap-4 ${assessmentMode === 'REBA' ? 'sm:grid-cols-3 md:grid-cols-5' : 'sm:grid-cols-2 md:grid-cols-4'}`}>
        <div className="bg-dark-secondary rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm text-text-secondary">Upper Arm</span>
            <span className="material-icon text-orange-500 text-sm sm:text-lg">accessibility</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold mb-1">
            {rebaScore?.upperArm || '--'}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
            <div 
              className="bg-green-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
              style={{width: `${rebaScore ? getScoreProgress(rebaScore.upperArm, 4) : 0}%`}}
            ></div>
          </div>
        </div>

        <div className="bg-dark-secondary rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm text-text-secondary">Lower Arm</span>
            <span className="material-icon text-blue-500 text-sm sm:text-lg">pan_tool</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold mb-1">
            {rebaScore?.lowerArm || '--'}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
            <div 
              className="bg-yellow-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
              style={{width: `${rebaScore ? getScoreProgress(rebaScore.lowerArm, 2) : 0}%`}}
            ></div>
          </div>
        </div>

        <div className="bg-dark-secondary rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm text-text-secondary">Wrist</span>
            <span className="material-icon text-green-500 text-sm sm:text-lg">back_hand</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold mb-1">
            {rebaScore?.wrist || '--'}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
            <div 
              className="bg-green-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
              style={{width: `${rebaScore ? getScoreProgress(rebaScore.wrist, 2) : 0}%`}}
            ></div>
          </div>
        </div>

        <div className="bg-dark-secondary rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm text-text-secondary">Neck</span>
            <span className="material-icon text-purple-500 text-sm sm:text-lg">face</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold mb-1">
            {rebaScore?.neck || '--'}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
            <div 
              className="bg-yellow-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
              style={{width: `${rebaScore ? getScoreProgress(rebaScore.neck, 4) : 0}%`}}
            ></div>
          </div>
        </div>

        {assessmentMode === 'REBA' && (
          <div className="bg-dark-secondary rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs sm:text-sm text-text-secondary">Trunk</span>
              <span className="material-icon text-red-500 text-sm sm:text-lg">accessibility_new</span>
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">
              {rebaScore?.trunk || '--'}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
              <div 
                className="bg-green-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
                style={{width: `${rebaScore ? getScoreProgress(rebaScore.trunk, 4) : 0}%`}}
              ></div>
            </div>
          </div>
        )}
      </div>

      


    </div>
  );
}