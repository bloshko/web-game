import {
  Scene,
  WebGLRenderer,
  AmbientLight,
  PointLight,
  PerspectiveCamera,
  Clock,
  TextureLoader,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const init = () => {
  const scene = new Scene();
  const ambientLight = new AmbientLight(0xffffff, 0.5);
  const pointLight = new PointLight(0xffffff, 0.8);
  const camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000,
  );
  const renderer = new WebGLRenderer();
  const textureLoader = new TextureLoader();
  const clock = new Clock();

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const orbitControl = new OrbitControls(camera, renderer.domElement);
  orbitControl.minDistance = 8;
  orbitControl.maxDistance = 15;
  orbitControl.enablePan = false;
  orbitControl.maxPolarAngle = Math.PI / 2 - 0.05;
  orbitControl.autoRotate = false;
  orbitControl.update();

  camera.add(pointLight);
  scene.add(ambientLight);
  scene.add(camera);

  const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.render(scene, camera);
  };

  window.addEventListener("resize", onWindowResize);

  return {
    orbitControl,
    scene,
    ambientLight,
    pointLight,
    camera,
    renderer,
    textureLoader,
    clock,
  };
};
