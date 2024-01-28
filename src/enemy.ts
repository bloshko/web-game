import {
    AnimationAction,
    AnimationClip,
    AnimationMixer,
    Audio,
    AudioListener,
    AudioLoader,
    Group,
    Loader,
    LoopRepeat,
    PositionalAudio,
    Scene,
    Sphere,
    Vector3,
} from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Capsule } from 'three/examples/jsm/math/Capsule';

import enemyAGLB from '../assets/enemies/enemyA.glb';
import enemyBGLB from '../assets/enemies/enemyB.glb';
import soundA from '../assets/sounds/audio_1.mp3';
import soundB from '../assets/sounds/audio_2.mp3';
import soundC from '../assets/sounds/audio_3.mp3';
import soundD from '../assets/sounds/audio_4.mp3';
import soundE from '../assets/sounds/audio_5.mp3';
import soundF from '../assets/sounds/audio_6.mp3';
import soundG from '../assets/sounds/audio_7.mp3';
import soundH from '../assets/sounds/audio_8.mp3';
import { Attack } from './attack';

type CollisionSide = 'top' | 'bottom' | null;

type EnemyState = 'idle' | 'running' | 'dying';

class Enemy {
    readonly DISTANCE_TO_START_RUNNING = 3;
    readonly DISTANCE_TO_STOP_RUNNING = 8;

    private state: EnemyState = 'idle';

    model: Group;
    mixer: AnimationMixer;
    animationActions: Record<EnemyState, AnimationAction>;
    animations: AnimationClip[];
    scene: Scene;
    currentAnimationAction: AnimationAction;
    worldOctree: Octree;
    collider: Capsule;
    attackThatKillsCollider: Sphere;
    attackThatKillsColliderRadius = 1;
    sound: Audio;

    runningDirection: Vector3;
    speedMultiplier = 10;

    isDead = false;

    private getRandomRunningDirection(): Vector3 {
        const randomX = Math.random() * 2 - 1;
        const randomZ = Math.random() * 2 - 1;

        return new Vector3(randomX, 0, randomZ).normalize();
    }

    private getRandomSpeedMultiplier(): number {
        return Math.random() * 10 + 1;
    }

    constructor(params) {
        this.model = params.model;
        this.scene = params.scene;
        this.worldOctree = params.worldOctree;
        this.animations = params.animations;

        this.mixer = new AnimationMixer(this.model);
        this.runningDirection = this.getRandomRunningDirection();
        this.model.lookAt(this.runningDirection);
        this.mixer.timeScale = 2.5;
        this.speedMultiplier = this.getRandomSpeedMultiplier();
        this.sound = params.sound;

        this.model.traverse((el) => {
            if (el.isMesh) {
                el.castShadow = true;
            }
        });

        this.animationActions = {
            idle: this.mixer.clipAction(this.animations[0]),
            running: this.mixer.clipAction(this.animations[0]),
            dying: this.mixer.clipAction(this.animations[0]),
        };

        this.currentAnimationAction = this.animationActions[this.state]
            .setLoop(LoopRepeat)
            .play();

        this.model.add(this.sound);
        this.sound.play();
        this.attackThatKillsCollider = new Sphere(
            this.model.position,
            this.attackThatKillsColliderRadius
        );
    }

    init(): void {
        this.spawnAtRandomPosition();
    }

    playerCollisions() {
        const result = this.worldOctree.capsuleIntersect(this.collider);

        if (result) {
            const newNormal = result.normal.clone();
            newNormal.y = 0;

            const randomVector = new Vector3()
                .random()
                .setY(0)
                .multiplyScalar(0.3);
            this.runningDirection = newNormal.add(randomVector).normalize();
        }
    }

    spawnAtRandomPosition() {
        const randomX = Math.random() * 30 - 20;
        const randomZ = Math.random() * 20 - 10;

        const vector = new Vector3(randomX, 0.3, randomZ);

        this.collider = new Capsule(new Vector3(), new Vector3(), 0.35);
        this.collider.start.copy(vector);
        this.collider.end.copy(vector.add(new Vector3(0, 0.5, 0)));

        this.scene.add(this.model);
    }

    getCollisionWithCharacter(): CollisionSide {
        return null;
    }

    isInRunningZone(): boolean {
        return false;
    }

    handleDeath(): void {
        this.changeState('dying');
    }

    changeState(newState: EnemyState) {
        const oldState = this.state;

        if (oldState === newState || oldState === 'dying') {
            return;
        }

        this.state = newState;
    }

    update(deltaTime: number): void {
        this.collider.translate(
            this.runningDirection
                .clone()
                .multiplyScalar(deltaTime * this.speedMultiplier)
        );

        this.playerCollisions();

        this.mixer.update(deltaTime);
        this.updateModelPosition();
        this.updateAttackThatKillsColliderPosition();
    }

    private updateModelPosition() {
        this.model.position.copy(this.collider.start);

        this.model.position.y -= 0.3;
        this.model.lookAt(
            this.runningDirection
                .clone()
                .add(this.model.position.clone().setY(0))
        );
    }

    private updateAttackThatKillsColliderPosition() {
        this.attackThatKillsCollider.set(
            this.model.position,
            this.attackThatKillsColliderRadius
        );
    }
}

type EnemyManagerParams = {
    scene: Scene;
    loader: Loader;
    worldOctree: Octree;
    listener: AudioListener;
    attackThatKills: Attack;
};

export class EnemyManager {
    ENEMY_MODELS: Group[] = [];
    readonly ENEMY_NUM_LIMIT = 100;
    readonly SOUND_PATHS = [
        soundA,
        soundB,
        soundC,
        soundD,
        soundE,
        soundF,
        soundG,
        soundH,
    ];

    enemies: Enemy[] = [];

    soundBuffers = [];

    scene: Scene;
    loader: Loader;
    worldOctree: Octree;
    listener: AudioListener;
    attackThatKills: Attack;

    audioLoader: AudioLoader;

    constructor(params: EnemyManagerParams) {
        this.scene = params.scene;
        this.loader = params.loader;
        this.worldOctree = params.worldOctree;
        this.listener = params.listener;
        this.audioLoader = new AudioLoader();
        this.attackThatKills = params.attackThatKills;
    }

    async init() {
        this.ENEMY_MODELS.push(
            (await this.loader.loadAsync(enemyAGLB)) as Group
        );
        this.ENEMY_MODELS.push(
            (await this.loader.loadAsync(enemyBGLB)) as Group
        );

        for (const soundPath of this.SOUND_PATHS) {
            await this.loadSound(soundPath);
        }
    }

    private getRandomArrayElementIndex(arrayLength: number) {
        return Math.floor(Math.random() * arrayLength);
    }

    private getRandomModel() {
        const randomModelIndex = Math.random() > 0.5 ? 1 : 0;
        return this.ENEMY_MODELS[randomModelIndex];
    }

    async loadSound(path: string) {
        const buffer = await this.audioLoader.loadAsync(path);

        this.soundBuffers.push(buffer);
    }

    spawnEnemy() {
        if (this.enemies.length < this.ENEMY_NUM_LIMIT) {
            const originalModel = this.getRandomModel();
            const randomBuffer =
                this.soundBuffers[
                    this.getRandomArrayElementIndex(this.soundBuffers.length)
                ];
            const sound = new PositionalAudio(this.listener);
            sound.setBuffer(randomBuffer);
            sound.setLoop(true);
            sound.setRefDistance(0.5);
            sound.setVolume(0.6);

            const params = {
                scene: this.scene,
                model: SkeletonUtils.clone(originalModel.scene),
                animations: originalModel.animations,
                worldOctree: this.worldOctree,
                sound,
            };

            const newEnemy = new Enemy(params);
            newEnemy.init();

            this.enemies.push(newEnemy);
        }

        return;
    }

    despawnEnemy() {}

    update(deltaTime: number) {
        this.spawnEnemy();

        for (const enemy of this.enemies) {
            if (this.attackThatKills.isAtAttackPoint) {
                const hasCollisionWithAttack =
                    this.attackThatKills.hasCollisionWithSphere(
                        enemy.attackThatKillsCollider
                    );
            }

            enemy.update(deltaTime);
        }

        // const deadEnemies = this.enemies.filter((enemy) => enemy.isDead);
        this.despawnEnemy();
    }
}
