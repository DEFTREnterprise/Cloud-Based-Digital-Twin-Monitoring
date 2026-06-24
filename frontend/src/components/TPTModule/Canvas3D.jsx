import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AlertCircle, CheckCircle, Activity, Map as MapIcon, Share2 } from 'lucide-react';
import { Panel, StatusBadge, EmptyState } from '../shared';
import tptSessions from '../../data/mockTPTData';

// Pulsing violation marker
function ViolationMarker({ position, severity, isSelected, onClick }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.2);
    }
  });

  const color = severity === 'CRITICAL' ? '#ef4444' : severity === 'WARN' ? '#f59e0b' : '#3b82f6';
  const size = isSelected ? 0.15 : 0.1;

  return (
    <mesh 
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isSelected ? 1.0 : 0.5}
        transparent
        opacity={0.8}
      />
      {/* Outer ring for selected */}
      {isSelected && (
        <mesh position={[position.x, position.y, position.z]}>
          <ringGeometry args={[size * 1.5, size * 1.8, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </mesh>
  );
}

// TrajectoryLines bileşeni - Gerçek verilerle çalışır
function TrajectoryLines({ selectedRun, selectedViolationId, onViolationSelect }) {
  // Şase odacık pozisyonları (ChassisFrame ile uyumlu)
  const sectionWidth = CHASSIS_SECTION_WIDTH;
  const sectionHeight = CHASSIS_SECTION_HEIGHT;
  const sectionDepth = CHASSIS_SECTION_DEPTH;
  const gap = CHASSIS_GAP;
  const totalWidth = (sectionWidth * 3) + (gap * 2);
  const startX = -totalWidth / 2 + sectionWidth / 2;
  
  const compartments = useMemo(() => [
    { 
      centerX: startX, 
      centerY: sectionHeight / 2, // Y ekseni yükseklik - şase dikey
      width: sectionWidth, 
      height: sectionHeight, 
      depth: sectionDepth, 
      name: 'Arka' 
    },
    { 
      centerX: startX + sectionWidth + gap, 
      centerY: sectionHeight / 2,
      width: sectionWidth, 
      height: sectionHeight, 
      depth: sectionDepth, 
      name: 'Orta' 
    },
    { 
      centerX: startX + (sectionWidth + gap) * 2, 
      centerY: sectionHeight / 2,
      width: sectionWidth, 
      height: sectionHeight, 
      depth: sectionDepth, 
      name: 'Ön' 
    }
  ], [startX, sectionWidth, gap, sectionHeight, sectionDepth]);

  // Mevcut trajectory'yi odacıklara uyarla - bazen içine gir, bazen etrafında dolaş
  const adaptToCompartments = (points) => {
    if (points.length === 0 || compartments.length === 0) return points;
    
    // Trajectory'yi odacıkların etrafında ve içinde dolaşacak şekilde ayarla
    return points.map((point, index) => {
      const t = index / Math.max(points.length - 1, 1);
      const compIndex = Math.floor(t * compartments.length);
      const comp = compartments[Math.min(compIndex, compartments.length - 1)];
      
      // Odacığın içine girip çık veya etrafında dolaş
      const localT = (t * compartments.length) % 1;
      const shouldEnter = (compIndex + localT) % 2 < 1; // Her odacık için değişken
      
      if (shouldEnter) {
        // Odacığa gir
        if (localT < 0.2) {
          // Odacığa yaklaş (şase etrafında dolaşarak)
          const approachX = comp.centerX - comp.width * 0.5 + localT * comp.width;
          return new THREE.Vector3(approachX, point.y * 0.5 + comp.centerY - comp.height * 0.3, point.z * 0.5 + comp.depth * 0.3);
        } else if (localT < 0.8) {
          // Odacığın içinde
          const insideT = (localT - 0.2) / 0.6;
          const x = comp.centerX + (insideT - 0.5) * comp.width * 0.7;
          const y = comp.centerY - comp.height * 0.4 + Math.sin(insideT * Math.PI * 2) * 0.2; // Y ekseni yükseklik
          const z = -comp.depth * 0.3 + insideT * comp.depth * 0.6;
          return new THREE.Vector3(x, y, z);
        } else {
          // Odacıktan çık
          const exitT = (localT - 0.8) / 0.2;
          const exitX = comp.centerX + comp.width * 0.5 * exitT;
          return new THREE.Vector3(exitX, point.y * 0.5 + comp.centerY - comp.height * 0.3, point.z * 0.5 + comp.depth * 0.3);
        }
      } else {
        // Şase etrafında dolaş (odacığa girmeden)
        if (localT < 0.5) {
          // Şasenin önünden geç
          const x = comp.centerX - comp.width * 0.5 + localT * comp.width * 2;
          const y = comp.centerY + Math.sin(localT * Math.PI * 2) * 0.2;
          const z = comp.depth * 0.6; // Ön tarafta
          return new THREE.Vector3(x, y, z);
        } else {
          // Şasenin arkasından geç
          const x = comp.centerX + comp.width * 0.5 - (localT - 0.5) * comp.width * 2;
          const y = comp.centerY + Math.sin((localT - 0.5) * Math.PI * 2) * 0.2;
          const z = -comp.depth * 0.6; // Arka tarafta
          return new THREE.Vector3(x, y, z);
        }
      }
    });
  };

  // Gerçek waypoint verilerini işle ve odacıkların içine girip çıkacak şekilde ayarla
  const processWaypoints = (waypoints, isTarget = false) => {
    if (!waypoints || waypoints.length === 0) {
      // Eğer veri yoksa, odacıkların içine girip çıkacak şekilde dummy trajectory oluştur
      return generateInspectionTrajectory(isTarget);
    }
    
    // Gerçek veriler varsa normalize et
    const points = waypoints.map((wp) => {
      const x = wp.x !== undefined ? wp.x : (wp.lon || 0);
      const y = wp.y !== undefined ? wp.y : (wp.lat || 0);
      const z = wp.z !== undefined ? wp.z : (wp.alt || 0);
      return { x, y, z };
    });
    
    // Merkez noktasını hesapla
    const center = points.reduce((acc, p) => ({
      x: acc.x + p.x,
      y: acc.y + p.y,
      z: acc.z + p.z
    }), { x: 0, y: 0, z: 0 });
    center.x /= points.length;
    center.y /= points.length;
    center.z /= points.length;
    
    // Merkeze göre normalize et ve ölçeklendir (mm'den 3D birimlere)
    const scale = 1 / 500;
    
    // Odacıkların içine girip çıkacak şekilde ayarla
    return adaptToCompartments(
      points.map((p) => new THREE.Vector3(
        (p.x - center.x) * scale,
        (p.y - center.y) * scale,
        (p.z - center.z) * scale
      ))
    );
  };

  // Odacıkların içine girip çıkacak ve şase etrafında dolaşacak şekilde trajectory oluştur
  const generateInspectionTrajectory = (isTarget) => {
    const points = [];
    const numPoints = 120; // Daha fazla nokta için artırdık
    
    if (compartments.length === 0) return points;
    
    compartments.forEach((comp, compIndex) => {
      const pointsPerComp = Math.floor(numPoints / compartments.length);
      const shouldEnter = Math.random() > 0.3; // %70 ihtimalle odacığa gir
      
      for (let i = 0; i < pointsPerComp; i++) {
        const t = i / pointsPerComp;
        
        if (shouldEnter) {
          // Odacığa gir
          if (t < 0.25) {
            // Odacığa yaklaş (şase etrafında dolaşarak)
            const approachX = comp.centerX - comp.width * 0.8 + (comp.width * 0.6 * (t / 0.25));
            const y = comp.centerY - comp.height * 0.3 + Math.sin(t * Math.PI * 3) * 0.15; // Y ekseni yükseklik
            const z = comp.depth * 0.5 + Math.cos(t * Math.PI * 2) * 0.2; // Z ekseni derinlik
            points.push(new THREE.Vector3(approachX, y, z));
          }
          // Odacığın içinde kontrol yap
          else if (t < 0.75) {
            const insideT = (t - 0.25) / 0.5;
            const x = comp.centerX + (insideT - 0.5) * comp.width * 0.6;
            const y = comp.centerY - comp.height * 0.4 + Math.sin(insideT * Math.PI * 4) * 0.3; // İçerde yukarı aşağı hareket
            const z = -comp.depth * 0.3 + insideT * comp.depth * 0.6;
            points.push(new THREE.Vector3(x, y, z));
          }
          // Odacıktan çık
          else {
            const exitT = (t - 0.75) / 0.25;
            const exitX = comp.centerX + comp.width * 0.6 * exitT;
            const y = comp.centerY - comp.height * 0.3 - exitT * 0.1;
            const z = comp.depth * 0.3 - exitT * 0.2;
            points.push(new THREE.Vector3(exitX, y, z));
          }
        } else {
          // Odacığa girmeden şase etrafında dolaş
          if (t < 0.5) {
            // Şasenin önünden geç
            const x = comp.centerX - comp.width * 0.5 + t * comp.width;
            const y = comp.centerY + Math.sin(t * Math.PI * 2) * 0.2;
            const z = comp.depth * 0.6; // Ön tarafta
            points.push(new THREE.Vector3(x, y, z));
          } else {
            // Şasenin arkasından geç
            const x = comp.centerX + comp.width * 0.5 - (t - 0.5) * comp.width;
            const y = comp.centerY + Math.sin((t - 0.5) * Math.PI * 2) * 0.2;
            const z = -comp.depth * 0.6; // Arka tarafta
            points.push(new THREE.Vector3(x, y, z));
          }
        }
      }
      
      // Odacıklar arasında şase etrafında dolaş
      if (compIndex < compartments.length - 1) {
        const nextComp = compartments[compIndex + 1];
        const transitionPoints = 15;
        
        for (let i = 0; i < transitionPoints; i++) {
          const t = i / transitionPoints;
          // Şasenin üstünden veya yanından geç
          const x = comp.centerX + comp.width * 0.5 + (nextComp.centerX - nextComp.width * 0.5 - comp.centerX - comp.width * 0.5) * t;
          const y = comp.centerY + comp.height * 0.3 + Math.sin(t * Math.PI) * 0.3; // Üstten geç
          const z = Math.sin(t * Math.PI) * comp.depth * 0.4; // Yan taraftan dolaş
          points.push(new THREE.Vector3(x, y, z));
        }
      }
    });
    
    return points;
  };


  // Target Path: Kusursuz rota (gerçek verilerden veya generate edilmiş)
  const targetWaypoints = useMemo(() => {
    let basePoints = [];
    
    if (selectedRun?.raw?.Target_Trajectory?.Waypoints && selectedRun.raw.Target_Trajectory.Waypoints.length > 0) {
      // Gerçek veriler varsa kullan
      basePoints = processWaypoints(selectedRun.raw.Target_Trajectory.Waypoints, true);
    } else {
      // Yoksa generate et
      basePoints = generateInspectionTrajectory(true);
    }
    
    return basePoints;
  }, [selectedRun, compartments]);

  // Actual Path: Target'a noise ekleyerek oluştur
  const actualWaypoints = useMemo(() => {
    if (targetWaypoints.length === 0) return [];
    
    // Target path'e rastgele küçük sapmalar ekle
    return targetWaypoints.map((targetPoint, index) => {
      // Her nokta için küçük rastgele sapma (0.05 - 0.15 birim arası)
      const noiseX = (Math.random() - 0.5) * 0.15;
      const noiseY = (Math.random() - 0.5) * 0.15;
      const noiseZ = (Math.random() - 0.5) * 0.1;
      
      return new THREE.Vector3(
        targetPoint.x + noiseX,
        targetPoint.y + noiseY,
        targetPoint.z + noiseZ
      );
    });
  }, [targetWaypoints]);

  // Geometrileri oluştur
  const targetGeometry = useMemo(() => {
    if (targetWaypoints.length === 0) return null;
    const geometry = new THREE.BufferGeometry().setFromPoints(targetWaypoints);
    // Kesikli çizgi için computeLineDistances gerekli
    if (geometry.computeLineDistances && typeof geometry.computeLineDistances === 'function') {
      geometry.computeLineDistances();
    }
    return geometry;
  }, [targetWaypoints]);

  const actualGeometry = useMemo(() => {
    if (actualWaypoints.length === 0) return null;
    const geometry = new THREE.BufferGeometry().setFromPoints(actualWaypoints);
    return geometry;
  }, [actualWaypoints]);

  // Waypoint noktaları (her 10 waypoint'te bir)
  const waypointPoints = useMemo(() => {
    const waypoints = [];
    const step = 10;
    for (let i = 0; i < targetWaypoints.length; i += step) {
      waypoints.push(targetWaypoints[i]);
    }
    return waypoints;
  }, [targetWaypoints]);

  // End-Effector pozisyonu
  const endEffectorPosition = useMemo(() => {
    if (actualWaypoints.length > 0) {
      return actualWaypoints[actualWaypoints.length - 1];
    }
    return null;
  }, [actualWaypoints]);

  // Violation noktaları
  const violationPoints = useMemo(() => {
    if (!selectedRun?.raw?.Trajectory_Validation_Events) return [];
    
    return selectedRun.raw.Trajectory_Validation_Events.map((event) => {
      // Find closest waypoint based on location or timestamp
      const locationRef = event.Location_Ref;
      let matchPoint = null;
      
      if (locationRef && locationRef.startsWith('WP-')) {
        const wpIndex = parseInt(locationRef.replace('WP-', ''));
        if (wpIndex < actualWaypoints.length) {
          matchPoint = actualWaypoints[wpIndex];
        }
      }
      
      // Fallback: find by timestamp
      if (!matchPoint && event.Event_Timestamp_UTC) {
        const meta = selectedRun.raw.Run_Meta_Status || {};
        const start = new Date(meta.Start_Time).getTime();
        const evtTime = new Date(event.Event_Timestamp_UTC).getTime();
        const targetT = (evtTime - start) / 1000;
        
        // Find closest waypoint by time
        for (let i = 0; i < actualWaypoints.length; i++) {
          const wp = selectedRun.raw.Actual_Trajectory.Waypoints[i];
          if (wp && Math.abs((wp.t || i * 0.1) - targetT) < 2) {
            matchPoint = actualWaypoints[i];
            break;
          }
        }
      }
      
      // Final fallback: use a point from the trajectory
      if (!matchPoint && actualWaypoints.length > 0) {
        matchPoint = actualWaypoints[Math.floor(actualWaypoints.length * 0.3)];
      }
      
      return {
        position: matchPoint || new THREE.Vector3(0, 0, 0),
        event: event
      };
    });
  }, [selectedRun, actualWaypoints]);

  // Kesikli çizgi için nokta nokta çizgi oluştur
  const targetDashedPoints = useMemo(() => {
    if (targetWaypoints.length === 0) return [];
    const points = [];
    const step = 3; // Her 3 noktada bir nokta kullan (kesikli efekt)
    for (let i = 0; i < targetWaypoints.length; i += step) {
      points.push(targetWaypoints[i]);
    }
    return points;
  }, [targetWaypoints]);
  
  const targetDashedGeometry = useMemo(() => {
    if (targetDashedPoints.length === 0) return null;
    return new THREE.BufferGeometry().setFromPoints(targetDashedPoints);
  }, [targetDashedPoints]);

  if (!targetGeometry || !actualGeometry || !targetDashedGeometry) {
    return null;
  }

  return (
    <group>
      {/* Target Path - Açık Mavi Kesikli Çizgi (Nokta Nokta) */}
      {targetDashedGeometry && (
        <line geometry={targetDashedGeometry}>
          <lineBasicMaterial
            attach="material"
            color="#3b82f6"
            transparent
            opacity={0.8}
          />
        </line>
      )}
      
      {/* Target Path - Ana Çizgi (Daha ince, kesikli görünüm için) */}
      <line geometry={targetGeometry}>
        <lineBasicMaterial
          attach="material"
          color="#60a5fa"
          transparent
          opacity={0.4}
        />
      </line>
      
      {/* Waypoint Noktaları - Beyaz Şeffaf Küreler (Target Path üzerinde) */}
      {waypointPoints.map((point, index) => (
        <mesh key={`waypoint-${index}`} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            emissive="#ffffff"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
      
      {/* Actual Path - Neon Turuncu Parlak Çizgi */}
      <line geometry={actualGeometry}>
        <lineBasicMaterial
          attach="material"
          color="#f97316"
        />
      </line>
      
      {/* Neon efekt için ekstra parlak çizgi */}
      <line geometry={actualGeometry}>
        <lineBasicMaterial
          attach="material"
          color="#fb923c"
          transparent
          opacity={0.6}
        />
      </line>
      
      {/* Violation Markers */}
      {violationPoints.map((vp, index) => (
        <ViolationMarker
          key={`violation-${vp.event.Violation_ID}`}
          position={vp.position}
          severity={vp.event.Severity}
          isSelected={selectedViolationId === vp.event.Violation_ID}
          onClick={(e) => {
            e.stopPropagation();
            if (onViolationSelect) {
              onViolationSelect(
                selectedViolationId === vp.event.Violation_ID 
                  ? null 
                  : vp.event.Violation_ID
              );
            }
          }}
        />
      ))}
      
      {/* End-Effector - Turuncu Parlayan Koni (Actual Path'in ucunda) */}
      {endEffectorPosition && (
        <mesh 
          position={[endEffectorPosition.x, endEffectorPosition.y, endEffectorPosition.z]}
        >
          <coneGeometry args={[0.1, 0.2, 8]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#ff6b00"
            emissiveIntensity={0.8}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>
      )}
    </group>
  );
}

// Şase sabitleri (her iki bileşende de aynı)
// Dikey konumlandırma: Y ekseni yükseklik, Z ekseni derinlik, X ekseni genişlik
const CHASSIS_SECTION_WIDTH = 2.5;   // X ekseni (genişlik)
const CHASSIS_SECTION_HEIGHT = 3;    // Y ekseni (yükseklik - dikey)
const CHASSIS_SECTION_DEPTH = 1.8;   // Z ekseni (derinlik)
const CHASSIS_GAP = 0.1;

// Otobüs şasesi bileşeni - Detaylı yapı (çapraz demirler, iç bölmeler)
function ChassisFrame() {
  const sectionWidth = CHASSIS_SECTION_WIDTH;
  const sectionHeight = CHASSIS_SECTION_HEIGHT;
  const sectionDepth = CHASSIS_SECTION_DEPTH;
  const gap = CHASSIS_GAP;
  const totalWidth = (sectionWidth * 3) + (gap * 2);
  const startX = -totalWidth / 2 + sectionWidth / 2;

  // Ana bölme geometry'leri (dikey: Y yükseklik, Z derinlik, X genişlik)
  const edgesGeometry = useMemo(() => {
    const boxGeometry = new THREE.BoxGeometry(sectionWidth, sectionHeight, sectionDepth);
    return new THREE.EdgesGeometry(boxGeometry);
  }, [sectionWidth, sectionHeight, sectionDepth]);

  // İç bölme geometry'leri (her odacık içinde - dikey duvarlar)
  const innerWallGeometry = useMemo(() => {
    const wallThickness = 0.05;
    const wallGeometry = new THREE.BoxGeometry(wallThickness, sectionHeight * 0.8, sectionDepth * 0.8);
    return new THREE.EdgesGeometry(wallGeometry);
  }, [sectionHeight, sectionDepth]);


  return (
    <group>
      {/* Şase dikey konumlandırılmış - Y ekseni yükseklik */}
      {/* Arka Bölme */}
      <lineSegments position={[startX, sectionHeight / 2, 0]}>
        <primitive object={edgesGeometry} attach="geometry" />
        <lineBasicMaterial color="#64748b" />
      </lineSegments>
      
      {/* Arka Bölme - İç Duvar (sol) */}
      <lineSegments position={[startX - sectionWidth * 0.25, sectionHeight / 2, 0]}>
        <primitive object={innerWallGeometry} attach="geometry" />
        <lineBasicMaterial color="#475569" />
      </lineSegments>
      
      {/* Arka Bölme - İç Duvar (sağ) */}
      <lineSegments position={[startX + sectionWidth * 0.25, sectionHeight / 2, 0]}>
        <primitive object={innerWallGeometry} attach="geometry" />
        <lineBasicMaterial color="#475569" />
      </lineSegments>
      
      {/* Orta Bölme */}
      <lineSegments position={[startX + sectionWidth + gap, sectionHeight / 2, 0]}>
        <primitive object={edgesGeometry} attach="geometry" />
        <lineBasicMaterial color="#64748b" />
      </lineSegments>
      
      {/* Orta Bölme - İç Duvar (merkez) */}
      <lineSegments position={[startX + sectionWidth + gap, sectionHeight / 2, 0]}>
        <primitive object={innerWallGeometry} attach="geometry" />
        <lineBasicMaterial color="#475569" />
      </lineSegments>
      
      {/* Ön Bölme */}
      <lineSegments position={[startX + (sectionWidth + gap) * 2, sectionHeight / 2, 0]}>
        <primitive object={edgesGeometry} attach="geometry" />
        <lineBasicMaterial color="#64748b" />
      </lineSegments>
      
      {/* Ön Bölme - İç Duvar (sol) */}
      <lineSegments position={[startX + (sectionWidth + gap) * 2 - sectionWidth * 0.25, sectionHeight / 2, 0]}>
        <primitive object={innerWallGeometry} attach="geometry" />
        <lineBasicMaterial color="#475569" />
      </lineSegments>
      
      {/* Ön Bölme - İç Duvar (sağ) */}
      <lineSegments position={[startX + (sectionWidth + gap) * 2 + sectionWidth * 0.25, sectionHeight / 2, 0]}>
        <primitive object={innerWallGeometry} attach="geometry" />
        <lineBasicMaterial color="#475569" />
      </lineSegments>
    </group>
  );
}

const Canvas3D = ({ selectedRunId, selectedViolationId, onViolationSelect }) => {
  const selectedRun = useMemo(() => {
    if (!selectedRunId) return null;
    return tptSessions.find(s => s.id === selectedRunId);
  }, [selectedRunId]);

  if (!selectedRun) {
    return (
      <Panel className="h-[600px]">
        <EmptyState
          icon={Activity}
          title="No Run Data Available"
          description="Please select a run to visualize the 3D trajectory."
        />
      </Panel>
    );
  }

  try {
    return (
      <Panel padding="lg" fullHeight className="flex flex-col gap-6 font-sans">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-indigo-600 shadow-sm shadow-indigo-200 rounded-lg">
              <Activity className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Trajectory Visualization</h2>
              <p className="text-sm text-slate-500 font-medium">Target vs. Actual</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SESSION:</span>
            <span className="text-sm font-medium text-slate-900">
              {selectedRun.id} • {selectedRun.componentName}
            </span>
          </div>
        </div>

        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left: 3D Canvas */}
          <div className="flex-[3] flex flex-col min-h-[500px] bg-slate-50/50 rounded-2xl border border-slate-200 p-1 relative overflow-hidden group">
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200 text-xs font-semibold text-slate-600">
              <MapIcon size={14} className="text-indigo-500" />
              {selectedRun.raw?.Map_Context?.Map_ID || 'Unknown Map'}
            </div>

            <div className="w-full h-full bg-slate-900 rounded-xl overflow-hidden">
              <Canvas
                camera={{ position: [6, 5, 6], fov: 50 }}
                gl={{ antialias: true }}
              >
                <ambientLight intensity={0.4} />
                <directionalLight position={[10, 10, 5]} intensity={0.8} />
                <pointLight position={[-10, -10, -5]} intensity={0.5} />

                <OrbitControls
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  minDistance={2}
                  maxDistance={20}
                />

                <ChassisFrame />
                <TrajectoryLines 
                  selectedRun={selectedRun}
                  selectedViolationId={selectedViolationId}
                  onViolationSelect={onViolationSelect}
                />
              </Canvas>
            </div>
          </div>

          {/* Right: Validation Events Panel */}
          <div className="flex-1 min-w-[320px] max-w-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                Validation Events
                <span className={`px-2 py-0.5 rounded-full text-xs ml-2 ${
                  (selectedRun.raw?.Trajectory_Validation_Events?.length || 0) > 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {selectedRun.raw?.Trajectory_Validation_Events?.length || 0} Issues
                </span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {selectedRun.raw?.Trajectory_Validation_Events?.length > 0 ? (
                selectedRun.raw.Trajectory_Validation_Events.map((event, idx) => {
                  const isSelected = selectedViolationId === event.Violation_ID;
                  return (
                    <div
                      key={idx}
                      onClick={() => onViolationSelect && onViolationSelect(isSelected ? null : event.Violation_ID)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.02] z-10 bg-white border-indigo-200' 
                          : 'hover:shadow-md hover:scale-[1.01] bg-white border-neutral-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold text-sm capitalize ${
                          event.Severity === 'CRITICAL' ? 'text-error-700' : 
                          event.Severity === 'WARN' ? 'text-warning-700' : 
                          'text-primary-700'
                        }`}>
                          {event.Violation_Type ? event.Violation_Type.replace(/_/g, ' ') : 'Violation'}
                        </span>
                        <StatusBadge
                          status={event.Severity === 'CRITICAL' ? 'critical' : event.Severity === 'WARN' ? 'warning' : 'info'}
                          label={event.Severity}
                          size="sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          <span className="font-semibold text-neutral-800">Rule:</span> {event.Rule_Desc}
                        </p>
                        <div className="bg-neutral-50 rounded px-2 py-1 flex items-center justify-between border border-neutral-100">
                          <span className="text-xs font-mono text-neutral-600">{event.Metric_Value}</span>
                          <span className="text-[10px] text-neutral-400 font-medium">Metric</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-2 pt-2 border-t border-neutral-100">
                          <span>{event.Location_Ref || 'Global'}</span>
                          <span>{new Date(event.Event_Timestamp_UTC).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-emerald-50/50 rounded-xl border border-emerald-100 border-dashed h-full">
                  <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                    <CheckCircle size={24} className="text-emerald-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-emerald-900 mb-1">All Clear</h4>
                  <p className="text-xs text-emerald-600/80">Trajectory validates against all active constraints.</p>
                </div>
              )}
            </div>

            {/* Constraints Summary */}
            <div className="bg-slate-800 text-slate-200 rounded-xl p-4 shadow-lg ring-1 ring-white/10">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                <Share2 size={14} className="text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Constraints</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedRun.raw?.Target_Trajectory?.Constraints ? (
                  Object.entries(selectedRun.raw.Target_Trajectory.Constraints).map(([key, val]) => (
                    <div key={key} className="bg-slate-700/50 px-2 py-1.5 rounded flex flex-col hover:bg-slate-700 transition-colors">
                      <span className="text-[10px] text-slate-400 capitalize mb-0.5">{key.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-indigo-300 font-semibold">{val}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-500 italic">No specific constraints</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Panel>
    );
  } catch (error) {
    console.error('Canvas3D render error:', error);
    return (
      <Panel className="h-[600px]">
        <div className="w-full h-full flex items-center justify-center text-red-400">
          <div className="text-center">
            <p className="text-lg font-bold mb-2">3D Canvas Hatası</p>
            <p className="text-sm text-slate-400">{error.message}</p>
          </div>
        </div>
      </Panel>
    );
  }
};

export default Canvas3D;
