import {
    AnimationAction,
    AnimationClip,
    AnimationMixer,
    Audio,
    AudioListener,
    AudioLoader,
    Group,
    Loader,
    LoopOnce,
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
import sound1 from '../assets/sounds/audio_1.mp3';
import sound2 from '../assets/sounds/audio_2.mp3';
import sound3 from '../assets/sounds/audio_3.mp3';
import sound6 from '../assets/sounds/audio_6.mp3';
import sound7 from '../assets/sounds/audio_7.mp3';
import sound8 from '../assets/sounds/audio_8.mp3';
import deathSound1 from '../assets/sounds/death_sound_1.mp3';
import deathSound2 from '../assets/sounds/death_sound_2.mp3';
import deathSound3 from '../assets/sounds/death_sound_3.mp3';
import deathSound4 from '../assets/sounds/death_sound_4.mp3';
import deathSound5 from '../assets/sounds/death_sound_5.mp3';
import deathSound6 from '../assets/sounds/death_sound_6.mp3';
import deathSound7 from '../assets/sounds/death_sound_7.mp3';
import deathSound8 from '../assets/sounds/death_sound_8.mp3';
import deathSound9 from '../assets/sounds/death_sound_9.mp3';
import deathSound10 from '../assets/sounds/death_sound_10.mp3';
import deathSound11 from '../assets/sounds/death_sound_11.mp3';
import deathSound12 from '../assets/sounds/death_sound_12.mp3';
import deathSound13 from '../assets/sounds/death_sound_13.mp3';
import deathSound14 from '../assets/sounds/death_sound_14.mp3';
import deathSound15 from '../assets/sounds/death_sound_15.mp3';
import { Attack } from './attack';
import { Score } from './score';

type CollisionSide = 'top' | 'bottom' | null;

type EnemyState = 'run' | 'death';

class Enemy {
    readonly DISTANCE_TO_START_RUNNING = 3;
    readonly DISTANCE_TO_STOP_RUNNING = 8;

    private state: EnemyState = 'run';

    model: Group;
    mixer: AnimationMixer;
    animationActions: Record<EnemyState, AnimationAction>;
    dyingAnimationActions: AnimationAction[];
    animations: AnimationClip[];
    scene: Scene;
    currentAnimationAction: AnimationAction;
    worldOctree: Octree;
    collider: Capsule;
    attackThatKillsCollider: Sphere;
    attackThatKillsColliderRadius = 1;
    sound: Audio;
    deathSound: Audio;

    runningDirection: Vector3;
    speedMultiplier = 10;

    isDead = false;
    isDying = false;
    isOutOfBoundaries = false;

    private getRandomRunningDirection(): Vector3 {
        const randomX = Math.random() * 2 - 1;
        const randomZ = Math.random() * 2 - 1;

        return new Vector3(randomX, 0, randomZ).normalize();
    }

    private getRandomSpeedMultiplier(): number {
        return Math.random() * 10 + 1;
    }

    private getRandomArrayElementIndex(arrayLength: number) {
        return Math.floor(Math.random() * arrayLength);
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
        this.deathSound = params.deathSound;

        this.model.traverse((el) => {
            if (el.isMesh) {
                el.castShadow = true;
            }
        });

        this.animationActions = {
            run: this.mixer.clipAction(this.animations[2]),
        };

        this.dyingAnimationActions = [
            this.mixer.clipAction(this.animations[0]),
            this.mixer.clipAction(this.animations[1]),
        ];

        this.currentAnimationAction = this.animationActions[this.state]
            .setLoop(LoopRepeat)
            .play();

        this.model.add(this.sound);
        this.sound.play();
        this.attackThatKillsCollider = new Sphere(
            this.model.position,
            this.attackThatKillsColliderRadius
        );
        this.mixer.addEventListener('finished', (e) => {
            if (e.action._clip.name.includes('death')) {
                this.isDead = true;
            }
        });
    }

    init(): void {
        this.spawnAtRandomPosition();
    }

    despawn() {
        this.scene.remove(this.model);
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
        if (this.isDying) {
            this.mixer.update(deltaTime);
            return;
        }

        this.collider.translate(
            this.runningDirection
                .clone()
                .multiplyScalar(deltaTime * this.speedMultiplier)
        );

        this.playerCollisions();
        this.mixer.update(deltaTime);
        this.updateModelPosition();
        this.updateAttackThatKillsColliderPosition();
        this.updateIsOutOfBoundaries();
    }

    private startDyingAnimation() {
        const animation =
            this.dyingAnimationActions[
                this.getRandomArrayElementIndex(
                    this.dyingAnimationActions.length
                )
            ];

        this.currentAnimationAction.fadeOut(0);
        this.mixer.timeScale = 1;
        this.currentAnimationAction = animation
            .reset()
            .setLoop(LoopOnce)
            .play();

        animation.clampWhenFinished = true;
    }

    startDying() {
        if (!this.isDying) {
            this.startDyingAnimation();
            this.sound.stop();
            this.deathSound.play();
        }
        this.isDying = true;
    }

    getIsResponsiveToAttacks() {
        return !this.isDead && !this.isDying && !this.isOutOfBoundaries;
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

    private updateIsOutOfBoundaries() {
        const x = this.model.position.x;
        const z = this.model.position.z;

        const xBoundaries = 30;
        const zBoundaries = 30;

        const isOutOfBoundaries =
            x > xBoundaries ||
            x < -xBoundaries ||
            z > zBoundaries ||
            z < -zBoundaries;

        if (isOutOfBoundaries) {
            this.isOutOfBoundaries = true;
        }
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
    readonly ENEMY_NUM_LIMIT = 30;
    readonly SOUND_PATHS = [sound1, sound2, sound3, sound6, sound7, sound8];
    readonly DEATH_SOUND_PATHS = [
        deathSound1,
        deathSound2,
        deathSound3,
        deathSound4,
        deathSound5,
        deathSound6,
        deathSound7,
        deathSound8,
        deathSound9,
        deathSound10,
        deathSound11,
        deathSound12,
        deathSound13,
        deathSound14,
        deathSound15,
    ];

    enemies: Enemy[] = [];

    soundBuffers = [];
    deathSoundBuffers = [];

    scene: Scene;
    loader: Loader;
    worldOctree: Octree;
    listener: AudioListener;
    attackThatKills: Attack;

    audioLoader: AudioLoader;
    score: Score;

    constructor(params: EnemyManagerParams) {
        this.scene = params.scene;
        this.loader = params.loader;
        this.worldOctree = params.worldOctree;
        this.listener = params.listener;
        this.audioLoader = new AudioLoader();
        this.attackThatKills = params.attackThatKills;
        this.score = new Score();
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

        for (const deathSoundPath of this.DEATH_SOUND_PATHS) {
            await this.loadDeathSound(deathSoundPath);
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

    async loadDeathSound(path: string) {
        const buffer = await this.audioLoader.loadAsync(path);

        this.deathSoundBuffers.push(buffer);
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
            sound.setRefDistance(1);
            sound.setVolume(0.3);
            sound.setMaxDistance(1);
            sound.setDistanceModel('exponential');

            const randomDeathSoundBuffer =
                this.deathSoundBuffers[
                    this.getRandomArrayElementIndex(
                        this.deathSoundBuffers.length
                    )
                ];
            const deathSound = new PositionalAudio(this.listener);
            deathSound.setBuffer(randomDeathSoundBuffer);
            deathSound.setLoop(false);
            deathSound.setRefDistance(3);
            deathSound.setVolume(0.6);
            deathSound.setDistanceModel('linear');

            const params = {
                scene: this.scene,
                model: SkeletonUtils.clone(originalModel.scene),
                animations: originalModel.animations,
                worldOctree: this.worldOctree,
                sound,
                deathSound,
            };

            const newEnemy = new Enemy(params);
            newEnemy.init();

            this.enemies.push(newEnemy);
        }

        return;
    }

    despawnEnemy() {}

    cleanupEnemies() {
        const enemiesNumber = this.enemies.length;
        if (enemiesNumber === 0) {
            return;
        }
        for (let i = enemiesNumber - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.isDead || enemy.isOutOfBoundaries) {
                enemy.despawn();
                this.enemies.splice(i, 1);
            }
        }
    }

    update(deltaTime: number) {
        this.spawnEnemy();

        for (const enemy of this.enemies) {
            if (
                this.attackThatKills.isAtAttackPoint &&
                enemy.getIsResponsiveToAttacks()
            ) {
                const hasCollisionWithAttack =
                    this.attackThatKills.hasCollisionWithSphere(
                        enemy.attackThatKillsCollider
                    );

                if (hasCollisionWithAttack) {
                    enemy.startDying();
                    this.score.addPoint();
                }
            }

            enemy.update(deltaTime);
        }

        this.cleanupEnemies();
    }
}
