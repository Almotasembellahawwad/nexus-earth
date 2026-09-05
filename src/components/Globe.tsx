'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geoContains, geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import { COUNTRIES } from '@/lib/countries';
import { TYPE_META, type Country, type GlobalEvent } from '@/lib/types';

interface GlobeProps {
  events: GlobalEvent[];
  selected: GlobalEvent | null;
  focus: { latitude: number; longitude: number } | null;
  onSelect: (event: GlobalEvent) => void;
  onCountry: (country: Country) => void;
  rotating: boolean;
  grid: boolean;
  command: { action: 'in' | 'out' | 'reset'; nonce: number } | null;
}
interface Runtime {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  markerGroup: THREE.Group;
  rings: THREE.InstancedMesh | null;
  selection: THREE.Mesh;
  grid: THREE.LineSegments;
  instances: Map<THREE.Object3D, GlobalEvent[]>;
  target: THREE.Vector3 | null;
  reduced: boolean;
}
const zAxis = new THREE.Vector3(0, 0, 1);
function position(lat: number, lon: number, radius = 1): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180,
    theta = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(phi) * Math.cos(theta),
    Math.sin(phi),
    -Math.cos(phi) * Math.sin(theta),
  ).multiplyScalar(radius);
}
function disposeGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => m.dispose());
      if (child instanceof THREE.InstancedMesh) child.dispose();
    }
    group.remove(child);
  }
}
export default function Globe(props: GlobeProps) {
  const container = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [hover, setHover] = useState<{ event: GlobalEvent; x: number; y: number } | null>(null);
  const [plotted, setPlotted] = useState(0);

  useEffect(() => {
    const host = container.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      setError(true);
      return;
    }
    let destroyed = false,
      frame = 0;
    const abort = new AbortController();
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.25 : 1.75),
    );
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      'aria-label',
      'Interactive Earth. Drag to rotate, scroll or pinch to zoom. Select events using the accessible event stream.',
    );
    renderer.domElement.setAttribute('role', 'img');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.copy(position(24, 60, 3.4));
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.5;
    controls.maxDistance = 5;
    controls.autoRotateSpeed = 0.22;
    controls.rotateSpeed = 0.5;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const material = new THREE.MeshPhongMaterial({
      color: '#b4c9c6',
      shininess: 9,
      specular: '#19393e',
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), material);
    scene.add(earth);
    scene.add(new THREE.AmbientLight('#bdd8d4', 1.8));
    const sun = new THREE.DirectionalLight('#d3efe4', 2.1);
    sun.position.set(-3, 5, 4);
    scene.add(sun);
    const rim = new THREE.DirectionalLight('#447a94', 1.8);
    rim.position.set(4, 1, -3);
    scene.add(rim);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.045, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader:
          'varying vec3 vNormal; varying vec3 vPosition; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vNormal = normalize(normalMatrix * normal); vPosition = mv.xyz; gl_Position = projectionMatrix * mv; }',
        fragmentShader:
          'varying vec3 vNormal; varying vec3 vPosition; void main(){ float rim = pow(1.0-abs(dot(normalize(vNormal),normalize(-vPosition))),3.5); gl_FragColor=vec4(0.28,0.65,0.61,rim*0.23); }',
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(atmosphere);
    const starPositions: number[] = [];
    let seed = 514;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 600; i++) {
      const point = position(
        (Math.asin(random() * 2 - 1) * 180) / Math.PI,
        random() * 360,
        15 + random() * 5,
      );
      starPositions.push(...point.toArray());
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    scene.add(
      new THREE.Points(
        starsGeometry,
        new THREE.PointsMaterial({
          color: '#85928f',
          size: 0.017,
          transparent: true,
          opacity: 0.5,
          sizeAttenuation: true,
        }),
      ),
    );
    const gridVertices: number[] = [];
    for (const line of geoGraticule10().coordinates)
      for (let i = 1; i < line.length; i++)
        gridVertices.push(
          ...position(line[i - 1][1], line[i - 1][0], 1.0015).toArray(),
          ...position(line[i][1], line[i][0], 1.0015).toArray(),
        );
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
    const grid = new THREE.LineSegments(
      gridGeo,
      new THREE.LineBasicMaterial({ color: '#789992', transparent: true, opacity: 0.1 }),
    );
    scene.add(grid);
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    const selection = new THREE.Mesh(
      new THREE.RingGeometry(0.024, 0.028, 48),
      new THREE.MeshBasicMaterial({
        color: '#e6f5cb',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    selection.visible = false;
    scene.add(selection);
    const rt: Runtime = {
      scene,
      camera,
      controls,
      markerGroup,
      selection,
      grid,
      rings: null,
      instances: new Map(),
      target: null,
      reduced: motion.matches,
    };
    runtime.current = rt;
    const motionChange = () => {
      rt.reduced = motion.matches;
    };
    motion.addEventListener('change', motionChange);
    let geography: FeatureCollection<Geometry> | null = null;
    fetch('/countries.geo.json', { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Map unavailable');
        return r.json();
      })
      .then((data: FeatureCollection<Geometry>) => {
        if (destroyed) return;
        geography = data;
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = 2048;
        textureCanvas.height = 1024;
        const ctx = textureCanvas.getContext('2d')!;
        ctx.fillStyle = '#0a1c22';
        ctx.fillRect(0, 0, 2048, 1024);
        const projection = geoEquirectangular()
          .scale(2048 / (2 * Math.PI))
          .translate([1024, 512]);
        const path = geoPath(projection, ctx);
        for (const feature of data.features) {
          ctx.beginPath();
          path(feature);
          ctx.fillStyle = '#294044';
          ctx.fill();
          ctx.strokeStyle = '#55706d';
          ctx.lineWidth = 0.65;
          ctx.stroke();
        }
        // Restrained cartographic texture, generated from public-domain boundaries.
        ctx.globalAlpha = 0.11;
        ctx.fillStyle = '#b5c7b8';
        for (let y = 0; y < 1024; y += 4)
          for (let x = y % 8; x < 2048; x += 5) ctx.fillRect(x, y, 0.7, 0.7);
        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        material.map = texture;
        material.needsUpdate = true;
        setReady(true);
      })
      .catch(() => {
        if (!destroyed) setError(true);
      });

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function pick(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const earthHit = raycaster.intersectObject(earth)[0];
      const hits = raycaster.intersectObjects([...rt.instances.keys()]);
      const hit = hits.find(
        (h) => h.instanceId !== undefined && (!earthHit || h.distance <= earthHit.distance + 0.006),
      );
      const selected =
        hit && hit.instanceId !== undefined
          ? rt.instances.get(hit.object)?.[hit.instanceId]
          : undefined;
      return { selected, earthHit, rect };
    }
    let down = { x: 0, y: 0 };
    const pointerDown = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY };
      rt.target = null;
      setHover(null);
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.buttons) return;
      const { selected, rect } = pick(event);
      renderer.domElement.style.cursor = selected ? 'pointer' : 'grab';
      setHover(
        selected
          ? {
              event: selected,
              x: Math.min(event.clientX - rect.left + 16, rect.width - 235),
              y: event.clientY - rect.top - 55,
            }
          : null,
      );
    };
    const pointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
      const { selected, earthHit } = pick(event);
      if (selected) propsRef.current.onSelect(selected);
      else if (earthHit && geography) {
        const p = earthHit.point.clone().normalize();
        const lon = (Math.atan2(-p.z, p.x) * 180) / Math.PI;
        const lat = (Math.asin(p.y) * 180) / Math.PI;
        const feature = geography.features.find((f) => geoContains(f, [lon, lat]));
        const country =
          feature && COUNTRIES.find((c) => c.numeric === String(feature.id).padStart(3, '0'));
        if (country) propsRef.current.onCountry(country);
      }
    };
    const pointerLeave = () => setHover(null);
    const lost = (event: Event) => {
      event.preventDefault();
      setError(true);
    };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('pointerleave', pointerLeave);
    renderer.domElement.addEventListener('webglcontextlost', lost);
    let last = 0;
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate);
      if (document.hidden || time - last < (window.innerWidth < 768 ? 32 : 16)) return;
      const delta = Math.min(0.1, (time - last) / 1000);
      last = time;
      controls.autoRotate =
        propsRef.current.rotating && !rt.reduced && !rt.target && !propsRef.current.selected;
      if (rt.target) {
        camera.position.lerp(rt.target, rt.reduced ? 1 : 1 - Math.exp(-delta * 4));
        if (camera.position.distanceTo(rt.target) < 0.004) rt.target = null;
      }
      if (rt.rings && !rt.reduced) {
        const scale = 1 + ((time / 1800) % 1) * 0.025;
        rt.rings.scale.setScalar(scale);
        (rt.rings.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - ((time / 1800) % 1));
      }
      controls.update(delta);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      destroyed = true;
      abort.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      motion.removeEventListener('change', motionChange);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointerleave', pointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Points ||
          object instanceof THREE.LineSegments
        ) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((m) => {
            if ('map' in m && m.map instanceof THREE.Texture) m.map.dispose();
            m.dispose();
          });
          if (object instanceof THREE.InstancedMesh) object.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      runtime.current = null;
    };
  }, []);

  useEffect(() => {
    const rt = runtime.current;
    if (!rt) return;
    disposeGroup(rt.markerGroup);
    rt.instances.clear();
    rt.rings = null;
    // Spatial LOD: highest-intensity record per 2° cell and category for large
    // datasets. Every record remains searchable in the stream, selected is forced in.
    let visible = props.events;
    if (visible.length > 1000) {
      const cells = new Map<string, GlobalEvent>();
      for (const event of [...visible].sort((a, b) => (b.magnitude ?? 5) - (a.magnitude ?? 5))) {
        const key = `${event.type}:${Math.floor(event.latitude / 2)}:${Math.floor(event.longitude / 2)}`;
        if (!cells.has(key)) cells.set(key, event);
      }
      visible = [...cells.values()].slice(0, 1500);
    }
    if (props.selected && !visible.some((e) => e.id === props.selected?.id))
      visible = [...visible, props.selected];
    setPlotted(visible.length);
    for (const type of Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]) {
      const events = visible.filter((e) => e.type === type);
      if (!events.length) continue;
      const geometry =
        type === 'earthquake'
          ? new THREE.CircleGeometry(1, 16)
          : type === 'wildfire' || type === 'volcano'
            ? new THREE.CircleGeometry(1, 3)
            : new THREE.CircleGeometry(1, 4);
      const mesh = new THREE.InstancedMesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: TYPE_META[type].color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
        }),
        events.length,
      );
      const dummy = new THREE.Object3D();
      events.forEach((event, index) => {
        const normal = position(event.latitude, event.longitude);
        dummy.position.copy(normal).multiplyScalar(1.008);
        dummy.quaternion.setFromUnitVectors(zAxis, normal);
        dummy.scale.setScalar(0.0048 + Math.min(event.magnitude ?? 4, 8) * 0.0011);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      rt.markerGroup.add(mesh);
      rt.instances.set(mesh, events);
      if (type === 'earthquake') {
        const rings = new THREE.InstancedMesh(
          new THREE.RingGeometry(1.5, 1.7, 24),
          new THREE.MeshBasicMaterial({
            color: TYPE_META[type].color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
          }),
          events.length,
        );
        rings.instanceMatrix.array.set(mesh.instanceMatrix.array);
        rings.instanceMatrix.needsUpdate = true;
        rings.computeBoundingSphere();
        rt.markerGroup.add(rings);
        rt.rings = rings;
      }
    }
  }, [props.events, props.selected, ready]);
  useEffect(() => {
    const rt = runtime.current;
    if (!rt) return;
    const selected = props.selected;
    rt.selection.visible = !!selected;
    if (selected) {
      const normal = position(selected.latitude, selected.longitude);
      rt.selection.position.copy(normal).multiplyScalar(1.012);
      rt.selection.quaternion.setFromUnitVectors(zAxis, normal);
    }
    const focus = selected ?? props.focus;
    if (focus) rt.target = position(focus.latitude, focus.longitude, 2.7);
  }, [props.selected, props.focus, ready]);
  useEffect(() => {
    if (runtime.current) runtime.current.grid.visible = props.grid;
  }, [props.grid, ready]);
  useEffect(() => {
    const rt = runtime.current;
    if (!rt || !props.command) return;
    rt.target =
      props.command.action === 'reset'
        ? position(24, 60, 3.4)
        : rt.camera.position
            .clone()
            .setLength(
              THREE.MathUtils.clamp(
                rt.camera.position.length() * (props.command.action === 'in' ? 0.8 : 1.25),
                1.5,
                5,
              ),
            );
  }, [props.command]);
  return (
    <>
      <div className="globe-canvas" ref={container} />
      {!ready && !error && (
        <div className="globe-loading">
          <span className="loading-orbit" />
          Initializing Earth
        </div>
      )}
      {error && (
        <div className="globe-error">
          <strong>Earth view unavailable</strong>
          <span>Your event stream, search, and country intelligence are still available.</span>
          <button onClick={() => window.location.reload()}>Reload globe</button>
        </div>
      )}
      {hover && (
        <div className="globe-tooltip" style={{ left: hover.x, top: Math.max(8, hover.y) }}>
          <span style={{ color: TYPE_META[hover.event.type].color }}>
            {TYPE_META[hover.event.type].label}
            {hover.event.magnitude !== undefined && ` · M${hover.event.magnitude.toFixed(1)}`}
          </span>
          <strong>{hover.event.title}</strong>
        </div>
      )}
      {ready && plotted < props.events.length && (
        <div className="lod-note">
          {plotted.toLocaleString()} representative markers · use the stream for all{' '}
          {props.events.length.toLocaleString()} events
        </div>
      )}
    </>
  );
}
