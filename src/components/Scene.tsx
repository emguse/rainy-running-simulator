import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { exposureMasks } from '../simulation/exposure';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Experiment, MAX_PARTICLES, faceAxes } from '../simulation/model';

export default function Scene({
  experiment,
  reducedMotion,
  showExposure,
}: {
  experiment: Experiment;
  reducedMotion: boolean;
  showExposure: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const exposureVisible = useRef(showExposure);
  exposureVisible.current = showExposure;
  const [failure, setFailure] = useState(false);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailure(true);
      return;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(4.6, 3, 4.7);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.85, 0);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 3;
    controls.maxDistance = 9;
    const group = new THREE.Group();
    scene.add(group);
    const textures: {
      part: number;
      face: number;
      texture: THREE.DataTexture;
      version: number;
      data: Uint8Array;
      color: THREE.Color;
    }[] = [];
    const disposable: { dispose: () => void }[] = [];
    experiment.parts.forEach((part, partIndex) => {
      const box = new THREE.BoxGeometry(...part.size);
      const edges = new THREE.EdgesGeometry(box);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: '#344e50',
        transparent: true,
        opacity: 0.65,
      });
      const outline = new THREE.LineSegments(edges, lineMaterial);
      outline.position.set(...part.center);
      group.add(outline);
      disposable.push(box, edges, lineMaterial);
      experiment.faces[partIndex].forEach((face, faceIndex) => {
        const [u, v] = faceAxes(faceIndex),
          axis = Math.floor(faceIndex / 2),
          sign = faceIndex % 2 === 0 ? 1 : -1;
        const positions: number[] = [];
        for (const [a, b] of [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ]) {
          const p = [...part.center];
          p[axis] += (sign * part.size[axis]) / 2;
          p[u] += (a - 0.5) * part.size[u];
          p[v] += (b - 0.5) * part.size[v];
          positions.push(...p);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(positions, 3),
        );
        geometry.setAttribute(
          'uv',
          new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2),
        );
        geometry.setIndex([0, 1, 2, 0, 2, 3]);
        const data = new Uint8Array(face.cells.length * 4);
        const texture = new THREE.DataTexture(data, face.columns, face.rows);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        const color = new THREE.Color(part.color);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
        });
        group.add(new THREE.Mesh(geometry, material));
        textures.push({
          part: partIndex,
          face: faceIndex,
          texture,
          version: -1,
          data,
          color,
        });
        disposable.push(geometry, material, texture);
      });
    });
    const grid = new THREE.GridHelper(6, 12, '#a8c1bd', '#d8e0d9');
    grid.position.y = -0.15;
    scene.add(grid);
    disposable.push(
      grid.geometry,
      ...(Array.isArray(grid.material) ? grid.material : [grid.material]),
    );
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1.3, -0.1, 0.9),
      2,
      '#d36e40',
      0.2,
      0.12,
    );
    scene.add(arrow);
    disposable.push(
      arrow.line.geometry,
      arrow.line.material as THREE.Material,
      arrow.cone.geometry,
      arrow.cone.material as THREE.Material,
    );
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const rainGeometry = new THREE.BufferGeometry();
    const attribute = new THREE.BufferAttribute(positions, 3).setUsage(
      THREE.DynamicDrawUsage,
    );
    rainGeometry.setAttribute('position', attribute);
    const rainMaterial = new THREE.PointsMaterial({
      color: '#357f93',
      size: 0.035,
      transparent: true,
      opacity: 0.65,
    });
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    rain.frustumCulled = false;
    scene.add(rain);
    disposable.push(rainGeometry, rainMaterial);
    const resize = new ResizeObserver(() => {
      const width = container.clientWidth,
        height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resize.observe(container);
    let request = 0,
      lastPaint = 0,
      slowFrames = 0,
      drawLimit = 1800;
    let maskKey = '';
    let masks: Uint8Array[][] = [];
    const frame = (now: number) => {
      request = requestAnimationFrame(frame);
      if (document.hidden || now - lastPaint < (reducedMotion ? 100 : 33))
        return;
      lastPaint = now;
      const began = performance.now();
      const { conditions } = experiment;
      const pitch = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        (-conditions.leanDegrees * Math.PI) / 180,
      );
      const yaw = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (conditions.attackDegrees * Math.PI) / 180,
      );
      group.quaternion.copy(yaw.multiply(pitch));
      const nextMaskKey = `${exposureVisible.current}-${conditions.speedMetersPerSecond}-${conditions.fallSpeedMetersPerSecond}-${conditions.leanDegrees}-${conditions.attackDegrees}`;
      if (maskKey !== nextMaskKey) {
        maskKey = nextMaskKey;
        masks = exposureVisible.current
          ? exposureMasks(experiment.parts, experiment.faces, conditions)
          : [];
        textures.forEach((item) => (item.version = -1));
      }
      for (const item of textures) {
        const face = experiment.faces[item.part][item.face];
        if (face.version === item.version) continue;
        for (let i = 0; i < face.cells.length; i++) {
          const wet = face.cells[i];
          item.data.set(
            wet
              ? [35, 112, 134, 255]
              : exposureVisible.current && masks[item.part]?.[item.face][i]
                ? [230, 151, 89, 255]
                : [
                    item.color.r * 255,
                    item.color.g * 255,
                    item.color.b * 255,
                    255,
                  ],
            i * 4,
          );
        }
        item.texture.needsUpdate = true;
        item.version = face.version;
      }
      const count = Math.min(drawLimit, experiment.particleCount);
      for (let i = 0; i < count; i++) {
        const j = Math.floor((i * experiment.particleCount) / count) * 3;
        positions.set(experiment.positions.subarray(j, j + 3), i * 3);
      }
      attribute.needsUpdate = true;
      rainGeometry.setDrawRange(0, count);
      rain.visible = !reducedMotion;
      renderer.render(scene, camera);
      if (performance.now() - began > 25 && ++slowFrames >= 10) {
        drawLimit = 400;
        renderer.setPixelRatio(1);
      }
    };
    request = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(request);
      resize.disconnect();
      controls.dispose();
      disposable.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [experiment, reducedMotion]);
  return (
    <div
      className="scene"
      ref={host}
      role="img"
      aria-label="雨粒と固定した直方体人体。青い部分が濡れた面。進行方向は橙色の矢印。数値と面別結果は図の下に表示。"
    >
      {failure && (
        <p className="scene-error">
          3D表示を利用できません。数値と面別結果で実験を続けられます。
        </p>
      )}
      <span className="scene-label">固定した手足 / 高さ 1.8 m</span>
      <span className="scene-help">
        ドラッグで視点を変更 · 青＝濡れ · 橙＝雨が届く範囲
      </span>
    </div>
  );
}
