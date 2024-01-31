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

const getStats = (appContainer: HTMLElement) => {
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

const startPlaying = (
    audioContext: AudioContext,
    { loadingTextId, playTextId, gameOverlayId }: Omit<Params, 'appContainerId'>
) => {
    audioContext.suspend();
    document.getElementById(loadingTextId).style.display = 'none';
    document.getElementById(playTextId).style.display = 'inline';

    document.getElementById(gameOverlayId)?.addEventListener('click', () => {
        document.getElementById(gameOverlayId).style.display = 'none';
        audioContext.resume();
        document.documentElement?.requestFullscreen();
    });
};

const defaultParams: Params = {
    appContainerId: 'app',
    loadingTextId: 'loading-text',
    playTextId: 'play-text',
    gameOverlayId: 'play-overlay',
};

type Params = {
    appContainerId: string;
    loadingTextId: string;
    playTextId: string;
    gameOverlayId: string;
};

export const runNahabaGame = async (params = defaultParams) => {
    const { appContainerId, loadingTextId, playTextId, gameOverlayId } = params;
    const appContainer = document.getElementById(appContainerId) as HTMLElement;

    const { orbitControl, scene, camera, renderer, clock } = init();
    const worldOctree = new Octree() as Octree;
    const helper = new OctreeHelper(worldOctree);

    const searchParams = getSearchParams();
    const character = searchParams.get('character') || 'A';

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
        attackThatKills: characterControls.smashAttack,
    });
    await enemyManager.init();

    scene.add(characterControls.model);

    startPlaying(characterControls.listener.context, {
        loadingTextId,
        playTextId,
        gameOverlayId,
    });

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
