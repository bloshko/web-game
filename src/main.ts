import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';
import { Octree } from 'three/addons/math/Octree.js';

import level2GLB from '../assets/levels/level2.glb';
import levelGLB from '../assets/levels/level.glb';
import { CharacterController } from './controls';
import { EnemyManager } from './enemy';
import { init } from './setup';
import './style.css';

const levels = {
    parking: levelGLB,
    metro: level2GLB,
};

const loader = new GLTFLoader();

const appContainer = document.getElementById('app') as HTMLElement;

const getStats = () => {
    const stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    appContainer.appendChild(stats.domElement);

    return stats;
};

const getSearchParams = () => {
    const search = window.location.search;

    const params = new URLSearchParams(search);

    return params;
};

const startPlaying = (audioContext: AudioContext) => {
    document.getElementById('loading-text').style.display = 'none';
    document.getElementById('play-text').style.display = 'inline';

    document.getElementById('play-overlay')?.addEventListener('click', () => {
        document.getElementById('play-overlay').style.display = 'none';
        audioContext.resume();
    });
};

const runNahabaGame = async () => {
    const { orbitControl, scene, camera, renderer, clock } = init();
    const worldOctree = new Octree();
    const helper = new OctreeHelper(worldOctree);
    const params = getSearchParams();
    const character = params.get('character') || 'A';

    const levelGLTF = await loader.loadAsync(levels.metro);
    levelGLTF.scene.traverse((el) => {
        if (el.isMesh) {
            el.receiveShadow = true;
            el.castShadow = true;
        }
    });

    const collision = levelGLTF.scene.children.find(
        (el) => el.name === 'collision'
    );

    collision.material.transparent = true;
    collision.material.opacity = 0;
    worldOctree.fromGraphNode(collision);
    helper.visible = true;
    scene.add(helper);

    const characterControls = new CharacterController({
        scene,
        orbitControl,
        camera,
        worldOctree,
        character,
    });
    await characterControls.init();

    scene.add(levelGLTF.scene);

    const enemyManager = new EnemyManager({
        scene,
        loader,
        worldOctree,
        listener: characterControls.listener,
    });
    await enemyManager.init();

    scene.add(characterControls.model);

    startPlaying(characterControls.listener.context);

    const animate = () => {
        const deltaTime = clock.getDelta();

        characterControls.update(deltaTime);
        enemyManager.update(deltaTime);

        renderer.render(scene, camera);

        requestAnimationFrame(animate);
    };

    appContainer.appendChild(renderer.domElement);
    animate();
};

runNahabaGame();
