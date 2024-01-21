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
import enemyGLB from "../assets/enemy.glb";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

type CollisionSide = "top" | "bottom" | null;

type EnemyState = "idle" | "running" | "dying";

abstract class Enemy {
  readonly DISTANCE_TO_START_RUNNING = 3;
  readonly DISTANCE_TO_STOP_RUNNING = 8;
  uvIndex: 0 | 1;

  private state: EnemyState = "idle";

  model: Group;
  mixer: AnimationMixer;
  animationActions: Record<EnemyState, AnimationAction>;
  animations: AnimationClip[];
  scene: Scene;
  currentAnimationAction: AnimationAction;

  runningDirection: Vector3;

  constructor(params) {
    this.model = params.model;
    this.scene = params.scene;
    this.animations = params.animations;

    this.mixer = new AnimationMixer(this.model);

    this.model.traverse((el) => {
      if (el.isMesh) {
        el.castShadow = true;
      }
    });

    // TODO: Fix uv index
    this.model.children[0].children[0].material.map.channel = 0;

    this.animationActions = {
      idle: this.mixer.clipAction(this.animations[1]),
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

  spawnAtRandomPosition() {
    const randomX = Math.random() * 30 - 20;
    const randomZ = Math.random() * 20 - 10;

    this.model.position.set(randomX, 0, randomZ);
    this.scene.add(this.model);
  }

  getCollisionWithCharacter(): CollisionSide {
    return null;
  }

  isInRunningZone(): boolean {
    return false;
  }

  handleDeath(): void {
    //play animation
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
    if (this.getCollisionWithCharacter() === "top") {
      // die
      this.handleDeath();
      return;
    }

    if (this.isInRunningZone()) {
      this.changeState("running");
    }

    if (this.state === "running") {
      // move character
    }
    this.mixer.update(deltaTime);
  }
}

class EnemyA extends Enemy {
  readonly uvIndex = 0;
}

class EnemyB extends Enemy {
  readonly uvIndex = 1;
}

export class EnemyManager {
  originalModel: Group;
  readonly ENEMY_NUM_LIMIT = 20;

  enemies: (EnemyA | EnemyB)[] = [];

  scene: Scene;
  loader: Loader;

  constructor(params) {
    this.scene = params.scene;
    this.loader = params.loader;
  }

  async init() {
    this.originalModel = (await this.loader.loadAsync(enemyGLB)) as Group;
  }

  spawnEnemy() {
    if (this.enemies.length <= this.ENEMY_NUM_LIMIT) {
      const params = {
        scene: this.scene,
        model: SkeletonUtils.clone(this.originalModel.scene),
        animations: this.originalModel.animations,
      };

      const newEnemy = new EnemyA(params);
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
