import { useCallback, useRef } from "react";

declare global {
  interface Window {
    THREE: any;
  }
}

export function useThreeRenderer() {
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const skeletonRef = useRef<any>(null);
  const animationIdRef = useRef<number>();

  const initializeScene = useCallback((container: HTMLElement) => {
    // Wait for THREE.js to load
    const waitForThreeJS = () => {
      return new Promise<void>((resolve) => {
        if (window.THREE) {
          resolve();
          return;
        }
        
        const checkInterval = setInterval(() => {
          if (window.THREE) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        // Fallback timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.THREE) {
            console.error("THREE.js failed to load within timeout");
          }
          resolve();
        }, 5000);
      });
    };
    
    waitForThreeJS().then(() => {
      if (!window.THREE) {
        console.error("THREE.js not loaded");
        return;
      }
      
      initializeThreeScene(container);
    });
  }, []);

  const initializeThreeScene = useCallback((container: HTMLElement) => {
    const THREE = window.THREE;

    // Clear any existing content
    container.innerHTML = '';

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
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(4, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Initialize skeleton group
    const skeletonGroup = new THREE.Group();
    scene.add(skeletonGroup);
    skeletonRef.current = skeletonGroup;

    // Start render loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    console.log("Three.js scene initialized successfully");

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const updatePose = useCallback((keypoints: any[], rulaScore: any) => {
    if (!sceneRef.current || !skeletonRef.current || !window.THREE) {
      return;
    }

    const THREE = window.THREE;
    const skeleton = skeletonRef.current;

    // Clear existing skeleton
    skeleton.clear();

    if (!keypoints || keypoints.length === 0) {
      return;
    }

    // Filter keypoints with sufficient confidence
    const validKeypoints = keypoints.filter(kp => kp && kp.score > 0.3);
    if (validKeypoints.length < 5) {
      return;
    }

    // Convert 2D keypoints to 3D positions with better depth mapping
    const positions = keypoints.map((kp, index) => {
      if (!kp || kp.score <= 0.3) {
        return new THREE.Vector3(0, 0, 0);
      }
      
      // Create depth based on body part
      let z = 0;
      if (index >= 0 && index <= 4) z = 0.3; // Head parts forward
      else if (index >= 5 && index <= 10) z = 0; // Arms and shoulders
      else if (index >= 11 && index <= 12) z = -0.2; // Hips back
      else z = -0.1; // Legs slightly back
      
      return new THREE.Vector3(
        (kp.x - 0.5) * 3, // X: wider range
        -(kp.y - 0.5) * 3, // Y: wider range (flipped)
        z
      );
    });

    // Create skeleton connections
    const connections = [
      [0, 1], [0, 2], [1, 3], [2, 4], // Head
      [5, 6], // Shoulders
      [5, 7], [7, 9], // Left arm
      [6, 8], [8, 10], // Right arm
      [5, 11], [6, 12], // Torso
      [11, 12], // Hips
      [11, 13], [13, 15], // Left leg
      [12, 14], [14, 16] // Right leg
    ];

    // Determine skeleton color based on RULA score
    let skeletonColor = 0x00ff00; // Green (safe)
    if (rulaScore) {
      if (rulaScore.finalScore <= 2) {
        skeletonColor = 0x00ff00; // Green
      } else if (rulaScore.finalScore <= 4) {
        skeletonColor = 0xffff00; // Yellow
      } else if (rulaScore.finalScore <= 6) {
        skeletonColor = 0xff8800; // Orange
      } else {
        skeletonColor = 0xff0000; // Red
      }
    }

    // Draw connections with improved visibility
    connections.forEach(([i, j]) => {
      if (keypoints[i] && keypoints[j] && 
          keypoints[i].score > 0.3 && keypoints[j].score > 0.3) {
        const points = [positions[i], positions[j]];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create a thick line using cylinder geometry for better visibility
        const direction = new THREE.Vector3().subVectors(positions[j], positions[i]);
        const length = direction.length();
        
        if (length > 0) {
          const cylinderGeometry = new THREE.CylinderGeometry(0.01, 0.01, length, 8);
          const cylinderMaterial = new THREE.MeshBasicMaterial({ 
            color: skeletonColor,
            transparent: true,
            opacity: 0.9
          });
          const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
          
          // Position and orient the cylinder
          const midPoint = new THREE.Vector3().addVectors(positions[i], positions[j]).multiplyScalar(0.5);
          cylinder.position.copy(midPoint);
          cylinder.lookAt(positions[j]);
          cylinder.rotateX(Math.PI / 2);
          
          skeleton.add(cylinder);
        }
      }
    });

    // Draw keypoints with better visibility
    keypoints.forEach((keypoint, index) => {
      if (keypoint && keypoint.score > 0.3) {
        const geometry = new THREE.SphereGeometry(0.03, 12, 8);
        const material = new THREE.MeshBasicMaterial({ 
          color: index < 5 ? 0xff4444 : skeletonColor,
          transparent: true,
          opacity: 0.9
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(positions[index]);
        skeleton.add(sphere);
      }
    });

    console.log(`3D Skeleton updated: ${validKeypoints.length} keypoints, ${skeleton.children.length} objects`);
  }, []);

  const resetView = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 3);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, []);

  return {
    initializeScene,
    updatePose,
    resetView
  };
}
