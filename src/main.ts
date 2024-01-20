import "./style.css";
import { init } from "./setup";
import { CharacterController } from "./controls";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import levelGLB from "../assets/level.glb";
import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { PointLight } from "three";

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

  const levelGLTF = await loader.loadAsync(levelGLB);
  levelGLTF.scene.traverse((el) => {
    if (el.isMesh) {
      el.receiveShadow = true;
    }
  });
  scene.add(levelGLTF.scene);
  console.log(levelGLTF.scene, "FLOOR");

  scene.add(characterControls.model);

  // const composer = new EffectComposer(renderer);
  //
  // const renderPixelatedPass = new RenderPixelatedPass(3, scene, camera);
  // composer.addPass(renderPixelatedPass);
  // const outputPass = new OutputPass();
  // composer.addPass(outputPass);
  // composer.setSize(window.innerWidth, window.innerHeight);

  const animate = () => {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    characterControls.update(deltaTime);

    // composer.render();

    renderer.render(scene, camera);
  };

  appContainer.appendChild(renderer.domElement);

  animate();
};

runNahabaGame();
