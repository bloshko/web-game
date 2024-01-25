import "./style.css";
import { init } from "./setup";
import { CharacterController } from "./controls";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import levelGLB from "../assets/level.glb";
import level2GLB from "../assets/level2.glb";
import { EnemyManager } from "./enemy";
import Stats from "three/addons/libs/stats.module.js";
import { Octree } from "three/addons/math/Octree.js";
import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";

const levels = {
  parking: levelGLB,
  metro: level2GLB,
};

const IS_DEBUG = true;

const loader = new GLTFLoader();

const appContainer = document.getElementById("app") as HTMLElement;

const getStats = () => {
  const stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = "0px";
  appContainer.appendChild(stats.domElement);

  return stats;
};

const runNahabaGame = async () => {
  const { orbitControl, scene, camera, renderer, clock } = init();
  const worldOctree = new Octree();
  const helper = new OctreeHelper(worldOctree);
  helper.visible = true;
  scene.add(helper);

  const characterControls = new CharacterController({
    scene,
    orbitControl,
    camera,
    worldOctree,
  });
  await characterControls.init();

  const levelGLTF = await loader.loadAsync(levels.metro);
  levelGLTF.scene.traverse((el) => {
    if (el.isMesh) {
      el.receiveShadow = true;
      el.castShadow = true;
    }
  });

  const collision = levelGLTF.scene.children.find(
    (el) => el.name === "collision",
  );

  collision.material.transparent = true;
  collision.material.opacity = 0;
  worldOctree.fromGraphNode(collision);

  scene.add(levelGLTF.scene);

  const enemyManager = new EnemyManager({ scene, loader, worldOctree });
  await enemyManager.init();

  scene.add(characterControls.model);

  const stats = IS_DEBUG ? getStats() : null;

  const animate = () => {
    const deltaTime = clock.getDelta();

    characterControls.update(deltaTime);
    enemyManager.update(deltaTime);

    renderer.render(scene, camera);

    stats?.update();
    requestAnimationFrame(animate);
  };

  appContainer.appendChild(renderer.domElement);
  animate();
};

runNahabaGame();
