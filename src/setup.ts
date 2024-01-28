import {
    Clock,
    Color,
    PerspectiveCamera,
    PointLight,
    Scene,
    TextureLoader,
    Vector3,
    WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MIN_INTENSITY = 250;
const MAX_INTENSITY = 500;

const spawnRandomLights = (scene: Scene) => {
    const positions = [
        new Vector3(10, 7, 0),
        new Vector3(-3, 5, -5),
        new Vector3(0, 5, 0),
        new Vector3(-15, 8, -15),
        new Vector3(15, 5, -15),
        new Vector3(-17, 5, 15),
    ];

    for (const position of positions) {
        const color = new Color(0xffffff);
        const randomIntensity =
            Math.floor(Math.random() * (MAX_INTENSITY - MIN_INTENSITY + 1)) +
            MIN_INTENSITY;
        color.setHex(Math.random() * 0xffffff);
        const pointLight = new PointLight(color, randomIntensity);
        pointLight.castShadow = true;
        pointLight.position.copy(position);
        scene.add(pointLight);
    }
};

const spawnLights = (scene: Scene) => {
    const positions = [
        //
        // main
        new Vector3(25, 5, 0),
        new Vector3(0, 5, 0),
        new Vector3(-25, 5, 0),
        //
        // train 1
        new Vector3(22, 3, 14),
        new Vector3(0, 3, 14),
        new Vector3(-22, 3, 14),

        //
        // train 2
        new Vector3(22, 3, -14),
        new Vector3(0, 3, -14),
        new Vector3(-22, 3, -14),
    ];

    for (const position of positions) {
        const color = new Color('#FFF3BE');
        const pointLight = new PointLight(color, 100);
        pointLight.castShadow = true;
        pointLight.position.copy(position);

        scene.add(pointLight);
    }
};

export const init = (isDebug?: boolean) => {
    const scene = new Scene();
    spawnLights(scene);

    const camera = new PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        300
    );

    const renderer = new WebGLRenderer();
    const textureLoader = new TextureLoader();
    const clock = new Clock();

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    const orbitControl = new OrbitControls(camera, renderer.domElement);
    orbitControl.minDistance = 3;
    orbitControl.maxDistance = 15;
    orbitControl.enablePan = false;
    orbitControl.maxPolarAngle = Math.PI / 2 - 0.05;
    orbitControl.autoRotate = false;
    orbitControl.target = new Vector3(0, 1, 0);
    orbitControl.update();

    scene.add(camera);

    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

        renderer.render(scene, camera);
    };

    window.addEventListener('resize', onWindowResize);

    return {
        orbitControl,
        scene,
        camera,
        renderer,
        textureLoader,
        clock,
    };
};
