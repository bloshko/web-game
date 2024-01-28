import {
    AnimationAction,
    AnimationMixer,
    LoopOnce,
    Object3D,
    Scene,
    Sphere,
    Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';
import { Timer } from 'three/addons/misc/Timer.js';

import crackGLB from '../assets/attack/crack.glb';

export abstract class Attack {
    abstract isAtAttackPoint: boolean;

    abstract attack(vector: Vector3);
    abstract hasCollisionWithSphere(sphere: Sphere): boolean;
}

export class SphericalAttack extends Attack {
    collider: Sphere;
    readonly radius = 1.5;
    duration = 0.5;
    timer: Timer;
    getAwayPoint: Vector3;
    isAtAttackPoint = false;
    attackPoint: Vector3 | null;
    attackTime: number | null;
    sprite: Object3D;
    animation: AnimationAction;
    mixer: AnimationMixer;

    constructor() {
        super();
        this.timer = new Timer();
        this.getAwayPoint = new Vector3(0, 50, 0);
        this.collider = new Sphere(this.getAwayPoint.clone(), this.radius);
    }

    async init(scene: Scene) {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(crackGLB);
        this.setupAnimations(gltf);
        this.sprite = gltf.scene;
        const scale = 3;
        this.sprite.scale.copy(new Vector3(scale, 1, scale));
        this.sprite.position.copy(this.getAwayPoint.clone());

        scene.add(this.sprite);
    }

    private setupAnimations(gltf) {
        this.mixer = new AnimationMixer(gltf.scene);
        this.animation = this.mixer
            .clipAction(gltf.animations[0])
            .setLoop(LoopOnce)
            .setDuration(this.duration)
            .play();
    }

    private moveSpriteToGetAway() {
        this.sprite.position.copy(this.getAwayPoint.clone());
    }
    private moveSpriteToOnGround(vector: Vector3) {
        this.sprite.position.copy(vector.clone().setY(0));
    }

    private moveCollider(vector: Vector3) {
        this.collider.set(vector.clone(), this.radius);
    }

    private stopAttack() {
        this.moveCollider(this.getAwayPoint);
        this.moveSpriteToGetAway();
        this.isAtAttackPoint = false;
        this.attackTime = null;
    }

    hasCollisionWithSphere(sphere: Sphere) {
        return this.collider.intersectsSphere(sphere);
    }

    attack(vector: Vector3) {
        this.moveSpriteToOnGround(vector);
        this.moveCollider(vector);
        this.isAtAttackPoint = true;
        this.attackTime = this.timer.getElapsed();
        this.animation.reset().play();
    }

    private getTimerDurationDelta() {
        return this.timer.getElapsed() - (this.attackTime || 0);
    }

    update() {
        this.timer.update();
        this.mixer.update(this.timer.getDelta());

        if (
            this.isAtAttackPoint &&
            this.attackTime !== null &&
            this.getTimerDurationDelta() >= this.duration
        ) {
            this.stopAttack();
        }
    }
}
