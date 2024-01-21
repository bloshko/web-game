import "./style.css";
import { init } from "./setup";
import { CharacterController } from "./controls";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import levelGLB from "../assets/level.glb";
import level2GLB from "../assets/level2.glb";
import { EnemyManager } from "./enemy";

const levels = {
  parking: levelGLB,
  metro: level2GLB,
};

const loader = new GLTFLoader();

const appContainer = document.getElementById("app") as HTMLElement;

const runNahabaGame = async () => {
  const { orbitControl, scene, camera, renderer, clock } = init();

  const characterControls = new CharacterController({
    scene,
    orbitControl,
    camera,
  });
  await characterControls.init();

  const levelGLTF = await loader.loadAsync(levels.metro);
  levelGLTF.scene.traverse((el) => {
    if (el.isMesh) {
      el.receiveShadow = true;
      // el.castShadow = true;
    }
  });
  scene.add(levelGLTF.scene);

  const enemyManager = new EnemyManager({ scene, loader });
  await enemyManager.init();

  scene.add(characterControls.model);

  const animate = () => {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    characterControls.update(deltaTime);
    enemyManager.update(deltaTime);

    renderer.render(scene, camera);
  };

  appContainer.appendChild(renderer.domElement);

  animate();
};

runNahabaGame();
