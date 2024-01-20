import "./style.css";
import { init } from "./setup";
import { BasicCharacterController } from "./controls";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import levelGLB from "../assets/level.glb";

const loader = new GLTFLoader();

const appContainer = document.getElementById("app") as HTMLElement;

const runNahabaGame = async () => {
  const { orbitControl, scene, camera, renderer, clock } = init();

  const characterControls = new BasicCharacterController({
    scene,
    orbitControl,
    camera,
  });
  await characterControls.init();

  const levelGLTF = await loader.loadAsync(levelGLB);
  scene.add(levelGLTF.scene);

  scene.add(characterControls.model);

  const animate = () => {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    characterControls.update(deltaTime);

    renderer.render(scene, camera);
  };

  appContainer.appendChild(renderer.domElement);

  animate();
};

runNahabaGame();
