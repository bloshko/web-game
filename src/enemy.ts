import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Group,
  Loader,
  Scene,
  Vector3,
  LoopRepeat,
} from "three";
import enemyAGLB from "../assets/enemies/enemyA.glb";
import enemyBGLB from "../assets/enemies/enemyB.glb";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/examples/jsm/math/Capsule";

type CollisionSide = "top" | "bottom" | null;

type EnemyState = "idle" | "running" | "dying";

class Enemy {
  readonly DISTANCE_TO_START_RUNNING = 3;
  readonly DISTANCE_TO_STOP_RUNNING = 8;

  private state: EnemyState = "idle";

  model: Group;
  mixer: AnimationMixer;
  animationActions: Record<EnemyState, AnimationAction>;
  animations: AnimationClip[];
  scene: Scene;
  currentAnimationAction: AnimationAction;
  worldOctree: Octree;
  collider: Capsule;

  runningDirection: Vector3;
  speedMultiplier = 10;

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
  }

  init(): void {
    this.spawnAtRandomPosition();
  }

  playerCollisions() {
    const result = this.worldOctree.capsuleIntersect(this.collider);

    if (result) {
      const newNormal = result.normal.clone();
      newNormal.y = 0;

      const randomVector = new Vector3().random().setY(0).multiplyScalar(0.3);
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
    this.changeState("dying");
  }

  changeState(newState: EnemyState) {
    const oldState = this.state;

    if (oldState === newState || oldState === "dying") {
      return;
    }

    this.state = newState;
  }

  update(deltaTime: number): void {
    this.collider.translate(
      this.runningDirection
        .clone()
        .multiplyScalar(deltaTime * this.speedMultiplier),
    );

    this.playerCollisions();

    this.mixer.update(deltaTime);
    this.updateModelPosition();
  }

  private updateModelPosition() {
    this.model.position.copy(this.collider.start);

    this.model.position.y -= 0.3;
    this.model.lookAt(
      this.runningDirection.clone().add(this.model.position.clone().setY(0)),
    );
  }
}

export class EnemyManager {
  originalModel: Group;
  readonly ENEMY_NUM_LIMIT = 30;
  ENEMY_MODELS: Group[] = [];

  enemies: Enemy[] = [];

  scene: Scene;
  loader: Loader;
  worldOctree: Octree;

  constructor(params) {
    this.scene = params.scene;
    this.loader = params.loader;
    this.worldOctree = params.worldOctree;
  }

  async init() {
    this.ENEMY_MODELS.push((await this.loader.loadAsync(enemyAGLB)) as Group);
    this.ENEMY_MODELS.push((await this.loader.loadAsync(enemyBGLB)) as Group);
  }

  spawnEnemy() {
    if (this.enemies.length <= this.ENEMY_NUM_LIMIT) {
      const randomModelIndex = Math.random() > 0.5 ? 1 : 0;
      const originalModel = this.ENEMY_MODELS[randomModelIndex];

      const params = {
        scene: this.scene,
        model: SkeletonUtils.clone(originalModel.scene),
        animations: originalModel.animations,
        worldOctree: this.worldOctree,
      };

      const newEnemy = new Enemy(params);
      newEnemy.init();

      this.enemies.push(newEnemy);
    }

    return;
  }

  update(deltaTime: number) {
    this.spawnEnemy();

    for (const enemy of this.enemies) {
      enemy.update(deltaTime);
    }
  }
}
