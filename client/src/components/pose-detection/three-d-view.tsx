import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface ThreeDViewProps {
  poseData: any;
  rebaScore: any;
}

// COCO pose model connections (17 keypoints) - matching your CameraView
const POSE_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4], // Head
  [5, 6], // Shoulders
  [5, 7], [7, 9], // Left arm
  [6, 8], [8, 10], // Right arm
  [5, 11], [6, 12], // Torso
  [11, 12], // Hips
  [11, 13], [13, 15], // Left leg
  [12, 14], [14, 16] // Right leg
];

// Updated body part mappings to match RULA calculation structure
const BODY_PART_MAPPING = {
  // Neck/head landmarks
  neck: [0, 1, 2, 3, 4],
  
  // Left arm landmarks
  upperArmLeft: [5, 7],
  lowerArmLeft: [7, 9], 
  wristLeft: [9],
  
  // Right arm landmarks
  upperArmRight: [6, 8],
  lowerArmRight: [8, 10],
  wristRight: [10],
  
  // Trunk landmarks (shoulders to hips)
  trunk: [5, 6, 11, 12],
  
  // Leg landmarks (not scored in RULA but included for completeness)
  legs: [11, 12, 13, 14, 15, 16]
};

// Connection to body part mapping for coloring bones
const CONNECTION_BODY_PARTS: { [key: string]: string } = {
  '0-1': 'neck', '0-2': 'neck', '1-3': 'neck', '2-4': 'neck', // Head/neck
  '5-6': 'trunk',     // Shoulders
  '5-7': 'upperArmLeft', '7-9': 'lowerArmLeft',   // Left arm
  '6-8': 'upperArmRight', '8-10': 'lowerArmRight', // Right arm
  '5-11': 'trunk', '6-12': 'trunk', // Torso connections
  '11-12': 'trunk',   // Hips
  '11-13': 'legs', '13-15': 'legs', // Left leg
  '12-14': 'legs', '14-16': 'legs'  // Right leg
};

// Map RULA score properties to our body part names
const RULA_SCORE_MAPPING = {
  neck: 'neck',
  upperArmLeft: 'upperArm',   // RULA typically assesses one arm
  lowerArmLeft: 'lowerArm',
  wristLeft: 'wrist',
  upperArmRight: 'upperArm',  // Use same scores for both sides
  lowerArmRight: 'lowerArm',
  wristRight: 'wrist',
  trunk: 'trunk',
  legs: 'trunk' // Legs use trunk score as fallback since RULA doesn't score legs
};

export default function ThreeDView({ poseData, rebaScore }: ThreeDViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const skeletonGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number>();
  const isInitializedRef = useRef(false);
  
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 5 });

  // Get color based on individual RULA score (1-7 scale)
  const getRulaColor = useCallback((bodyPart: string, rebaScore: any) => {
    if (!rebaScore) {
      return new THREE.Color(0x888888); // Gray for unknown
    }

    // Map our body part to RULA score property
    const rulaProperty = RULA_SCORE_MAPPING[bodyPart as keyof typeof RULA_SCORE_MAPPING];
    let score = 1; // Default low score

    if (rulaProperty && rebaScore[rulaProperty] !== undefined) {
      score = rebaScore[rulaProperty];
    } else {
      // Fallback to final score if specific part not found
      score = rebaScore.finalScore || 1;
    }
    
    // Ensure score is within valid range (1-7)
    score = Math.max(1, Math.min(7, score));
    
    // Create smooth color gradient from green (1) to red (7)
    if (score <= 1) {
      return new THREE.Color(0x00ff00); // Bright green - minimal stress
    } else if (score <= 2) {
      return new THREE.Color(0x40ff00); // Yellow-green - acceptable
    } else if (score <= 3) {
      return new THREE.Color(0x80ff00); // Light green-yellow
    } else if (score <= 4) {
      return new THREE.Color(0xffff00); // Yellow - low risk
    } else if (score <= 5) {
      return new THREE.Color(0xff8000); // Orange - medium risk
    } else if (score <= 6) {
      return new THREE.Color(0xff4000); // Red-orange - high risk
    } else {
      return new THREE.Color(0xff0000); // Bright red - very high risk
    }
  }, []);

  // Get body part for a specific landmark index
  const getBodyPartForLandmark = useCallback((landmarkIndex: number): string => {
    for (const [bodyPart, indices] of Object.entries(BODY_PART_MAPPING)) {
      if (indices.includes(landmarkIndex)) {
        return bodyPart;
      }
    }
    return 'trunk'; // Default fallback
  }, []);

  // Transform coordinates from pose data to 3D space
  const transformPoseCoordinates = useCallback((keypoints: any[]) => {
    const confidenceThreshold = 0.3;
    
    // Filter valid keypoints first
    const validKeypoints = keypoints.filter((kp, index) => 
      kp && 
      typeof kp.score === 'number' && 
      kp.score > confidenceThreshold &&
      typeof kp.x === 'number' && 
      typeof kp.y === 'number'
    );
    
    if (validKeypoints.length === 0) {
      console.log('No valid keypoints found for 3D transformation');
      return [];
    }
    
    console.log(`Transforming ${validKeypoints.length} valid keypoints for 3D view`);
    
    // Find bounds of valid keypoints for normalization
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    keypoints.forEach((kp, index) => {
      if (kp && typeof kp.x === 'number' && typeof kp.y === 'number' && kp.score > confidenceThreshold) {
        minX = Math.min(minX, kp.x);
        maxX = Math.max(maxX, kp.x);
        minY = Math.min(minY, kp.y);
        maxY = Math.max(maxY, kp.y);
      }
    });
    
    // Handle case where we have only one point or very close points
    if (maxX - minX < 0.01) {
      maxX = minX + 0.1;
    }
    if (maxY - minY < 0.01) {
      maxY = minY + 0.1;
    }
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    // Scale factor to fit skeleton nicely in 3D view
    const scale = 3.0;
    
    // Transform each keypoint to 3D coordinates
    const transformedPositions: (THREE.Vector3 | null)[] = [];
    
    keypoints.forEach((keypoint, index) => {
      if (keypoint && typeof keypoint.score === 'number' && keypoint.score > confidenceThreshold &&
          typeof keypoint.x === 'number' && typeof keypoint.y === 'number') {
        
        // Normalize coordinates to [-1, 1] range, then scale
        const normalizedX = ((keypoint.x - centerX) / Math.max(rangeX, rangeY)) * scale;
        const normalizedY = -((keypoint.y - centerY) / Math.max(rangeX, rangeY)) * scale; // Flip Y for 3D
        
        transformedPositions[index] = new THREE.Vector3(normalizedX, normalizedY, 0);
      } else {
        transformedPositions[index] = null;
      }
    });
    
    return transformedPositions;
  }, []);

  // Update skeleton visualization with individual RULA coloring
  const updateSkeleton = useCallback((keypoints: any[], rebaScore: any) => {
    if (!skeletonGroupRef.current || !keypoints || keypoints.length === 0) {
      console.log('Cannot update skeleton: missing skeleton group or keypoints');
      return;
    }

    // Clear existing skeleton
    skeletonGroupRef.current.clear();
    
    // Transform pose coordinates to 3D space
    const transformedPositions = transformPoseCoordinates(keypoints);
    
    if (transformedPositions.length === 0) {
      console.log('No transformed positions available for skeleton rendering');
      return;
    }

    console.log('RULA Score for coloring:', rebaScore);

    // Draw joints (keypoints) first
    let jointsDrawn = 0;
    transformedPositions.forEach((position, index) => {
      if (position) {
        const bodyPart = getBodyPartForLandmark(index);
        const color = getRulaColor(bodyPart, rebaScore);
        
        const geometry = new THREE.SphereGeometry(0.08, 16, 16);
        const material = new THREE.MeshPhongMaterial({ 
          color,
          shininess: 30,
          transparent: false
        });
        const joint = new THREE.Mesh(geometry, material);
        
        joint.position.copy(position);
        skeletonGroupRef.current!.add(joint);
        jointsDrawn++;
      }
    });

    // Draw bones (connections) after joints
    let bonesDrawn = 0;
    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const startPos = transformedPositions[startIdx];
      const endPos = transformedPositions[endIdx];
      
      if (startPos && endPos) {
        // Get body part for this connection
        const connectionKey = `${Math.min(startIdx, endIdx)}-${Math.max(startIdx, endIdx)}`;
        const bodyPart = CONNECTION_BODY_PARTS[connectionKey] || 'trunk';
        const color = getRulaColor(bodyPart, rebaScore);
        
        // Create cylinder for bone
        const direction = new THREE.Vector3().subVectors(endPos, startPos);
        const length = direction.length();
        
        if (length > 0.01) { // Avoid zero-length cylinders
          const cylinderGeometry = new THREE.CylinderGeometry(0.03, 0.03, length, 8);
          const cylinderMaterial = new THREE.MeshPhongMaterial({ 
            color: color,
            transparent: false
          });
          const bone = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
          
          // Position and orient the cylinder
          const midpoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
          bone.position.copy(midpoint);
          
          // Align cylinder with the connection
          const axis = new THREE.Vector3(0, 1, 0);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction.normalize());
          bone.setRotationFromQuaternion(quaternion);
          
          skeletonGroupRef.current!.add(bone);
          bonesDrawn++;
        }
      }
    });
    
    console.log(`3D Skeleton rendered: ${jointsDrawn} joints and ${bonesDrawn} bones with individual RULA coloring`);
  }, [transformPoseCoordinates, getRulaColor, getBodyPartForLandmark]);

  // Initialize Three.js scene
  const initializeScene = useCallback((container: HTMLDivElement) => {
    console.log('Initializing 3D scene...');
    
    // Clean up any existing scene
    if (rendererRef.current) {
      container.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Enhanced lighting setup for better color visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add additional lights for better color rendering
    const light1 = new THREE.PointLight(0xffffff, 0.4, 100);
    light1.position.set(-10, 0, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xffffff, 0.4, 100);
    light2.position.set(10, 0, 5);
    scene.add(light2);

    // Skeleton group
    const skeletonGroup = new THREE.Group();
    scene.add(skeletonGroup);
    skeletonGroupRef.current = skeletonGroup;

    container.appendChild(renderer.domElement);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && container) {
        cameraRef.current.aspect = container.clientWidth / container.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(container.clientWidth, container.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    console.log('3D scene initialized successfully');

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Camera controls
  const rotateCamera = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    setCameraPosition(prev => {
      const radius = Math.sqrt(prev.x ** 2 + prev.z ** 2);
      const angle = Math.atan2(prev.z, prev.x);
      
      switch (direction) {
        case 'left':
          return {
            ...prev,
            x: radius * Math.cos(angle + 0.3),
            z: radius * Math.sin(angle + 0.3)
          };
        case 'right':
          return {
            ...prev,
            x: radius * Math.cos(angle - 0.3),
            z: radius * Math.sin(angle - 0.3)
          };
        case 'up':
          return {
            ...prev,
            y: Math.min(prev.y + 0.5, 5)
          };
        case 'down':
          return {
            ...prev,
            y: Math.max(prev.y - 0.5, -5)
          };
        default:
          return prev;
      }
    });
  }, []);

  const zoomCamera = useCallback((direction: 'in' | 'out') => {
    setCameraPosition(prev => {
      const currentDistance = Math.sqrt(prev.x ** 2 + prev.y ** 2 + prev.z ** 2);
      const factor = direction === 'in' ? 0.8 : 1.2;
      const newDistance = Math.max(1, Math.min(15, currentDistance * factor));
      const ratio = newDistance / currentDistance;
      
      return {
        x: prev.x * ratio,
        y: prev.y * ratio,
        z: prev.z * ratio
      };
    });
  }, []);

  const resetView = useCallback(() => {
    console.log('Resetting 3D camera view');
    setCameraPosition({ x: 0, y: 0, z: 5 });
  }, []);

  // Update camera position
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, [cameraPosition]);

  // Initialize scene
  useEffect(() => {
    if (containerRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const cleanup = initializeScene(containerRef.current);
      return cleanup;
    }
  }, [initializeScene]);

  // Update skeleton when pose data changes
  useEffect(() => {
    if (poseData && poseData.keypoints && isInitializedRef.current) {
      console.log('Received pose data update:', poseData.keypoints.length, 'keypoints');
      updateSkeleton(poseData.keypoints, rebaScore);
    }
  }, [poseData, rebaScore, updateSkeleton]);

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white flex items-center space-x-2">
            <span className="text-blue-400">🎯</span>
            <span>3D Skeleton View - Individual RULA Coloring</span>
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={resetView}
              className="p-2 hover:bg-gray-600 rounded transition-colors text-white"
              title="Reset View"
            >
              🔄
            </button>
            <button
              onClick={() => setIsControlsVisible(!isControlsVisible)}
              className="p-2 hover:bg-gray-600 rounded transition-colors text-white"
              title="Toggle Controls"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-96 bg-gray-900"
          style={{ aspectRatio: '16/9' }}
        />
        
        {/* 3D Controls Overlay */}
        {isControlsVisible && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-70 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-3 gap-1">
              <div></div>
              <button 
                onClick={() => rotateCamera('up')}
                className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors text-white"
              >
                ↑
              </button>
              <div></div>
              <button 
                onClick={() => rotateCamera('left')}
                className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors text-white"
              >
                ↺
              </button>
              <button 
                onClick={() => rotateCamera('down')}
                className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors text-white"
              >
                ↓
              </button>
              <button 
                onClick={() => rotateCamera('right')}
                className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors text-white"
              >
                ↻
              </button>
              <button 
                onClick={() => zoomCamera('in')}
                className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors text-white"
              >
                🔍+
              </button>
              <div></div>
              <button 
                onClick={() => zoomCamera('out')}
                className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors text-white"
              >
                🔍-
              </button>
            </div>
          </div>
        )}
        
        {/* Simplified RULA Score Overlay - Final Score Only */}
        {rebaScore && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 rounded-lg p-3">
            <div className="text-white text-sm">
              <div className="flex items-center space-x-2 mb-2">
                <span>📊</span>
                <span className="font-semibold">RULA Final Score: {String(rebaScore.finalScore || 'N/A')}</span>
              </div>
              <div className="text-xs text-gray-300">
                Risk Level: <span className={`font-semibold ${
                  rebaScore.finalScore <= 2 ? 'text-green-400' :
                  rebaScore.finalScore <= 4 ? 'text-yellow-400' :
                  rebaScore.finalScore <= 6 ? 'text-orange-400' : 'text-red-400'
                }`}>
                  {String(rebaScore.riskLevel || 'Unknown')}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Debug Info */}
        {poseData && rebaScore && (
          <div className="absolute top-4 right-20 bg-black bg-opacity-70 rounded-lg p-2 text-xs text-gray-300">
            <div className="font-semibold mb-1">Debug Info</div>
            <div>Keypoints: {poseData.keypoints?.length || 0}</div>
            <div>Valid: {poseData.keypoints?.filter((kp: any) => kp && kp.score > 0.3).length || 0}</div>
            <div>Final RULA: {rebaScore.finalScore || 'N/A'}</div>
            <div>Stress Level: {rebaScore.stressLevel || 'N/A'}</div>
          </div>
        )}
      </div>
    </div>
  );
}