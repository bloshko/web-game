import {
  Vector3,
  Scene,
  AudioListener,
  AnimationMixer,
  LoopRepeat,
  Quaternion,
  Camera,
  Group,
  AnimationAction,
  LoopOnce,
  Object3D,
  AnimationClip,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Capsule } from "three/examples/jsm/math/Capsule";
import { Octree } from "three/addons/math/Octree.js";
import manGLB from "../assets/characters/man.glb";
import womanGLB from "../assets/characters/woman.glb";

type Character = "A" | "O";
type CharacterControllerParams = {
  scene: Scene;
  orbitControl: OrbitControls;
  camera: Camera;
  character: Character;
};

type CharacterState = "idle" | "walk" | "run" | "jump" | "in_air";

export class CharacterController {
  private input: CharacterControllerInput;
  velocity: Vector3;
  acceleration: Vector3;
  params: CharacterControllerParams;
  mixer: AnimationMixer;
  animations: Record<CharacterState, AnimationAction>;
  model: Group;
  scene: Scene;
  worldOctree: Octree;
  jumpOnce = false;

  canJump = true;

  collider: Capsule;
  colliderPuppet: Object3D;
  camera: Camera;
  orbitControl: OrbitControls;

  walkDirection = new Vector3();
  rotateAngle = new Vector3(0, 1, 0);
  rotateQuarternion = new Quaternion();
  cameraTarget = new Vector3();

  isPlayerOnFloor = true;

  currentState: CharacterState = "idle";
  currentAnimationAction: AnimationAction;

  speedMultiplier = 1;
  gravity = 50;
  directionOffset = 0;
  isMjMode = false;

  character: Character = "A";
  listener: AudioListener;

  readonly spawnPoint = new Vector3(25, 0, 0);

  constructor(params: CharacterControllerParams) {
    this.camera = params.camera;
    this.scene = params.scene;
    this.worldOctree = params.worldOctree;
    this.orbitControl = params.orbitControl;
    this.character = params.character;
    this.input = new CharacterControllerInput();
  }

  async init() {
    this.velocity = new Vector3(0, 0, 0);

    this.input = new CharacterControllerInput();

    await this.loadModel();

    this.input.onKeyDown(77, () => this.switchSpecialMode());
  }

  private setupAnimations(gltfAnimations: AnimationClip[]) {
    this.animations = {
      idle: this.mixer.clipAction(gltfAnimations[0]).setLoop(LoopRepeat),
      jump: this.mixer.clipAction(gltfAnimations[1]).setLoop(LoopOnce),
      mj: this.mixer.clipAction(gltfAnimations[2]).setLoop(LoopRepeat),
      run: this.mixer.clipAction(gltfAnimations[3]).setLoop(LoopRepeat),
      walk: this.mixer
        .clipAction(gltfAnimations[4])
        .setLoop(LoopRepeat)
        .setDuration(0.8),
    };
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(
      this.character === "O" ? womanGLB : manGLB,
    );

    gltf.scene.traverse((el) => {
      if (el.isMesh) {
        el.castShadow = true;
      }
    });

    this.model = gltf.scene;

    this.model.position.add(new Vector3(3, 0, 2));

    this.mixer = new AnimationMixer(gltf.scene);

    this.collider = new Capsule(new Vector3(), new Vector3(), 0.35);

    this.spawn();

    this.setupAnimations(gltf.animations);

    this.currentAnimationAction = this.animations[this.currentState]
      .setLoop(LoopRepeat)
      .play();

    this.mixer.addEventListener("finished", (e) => {
      if (this.animations.jump === e.action) {
        this.spawnDamageArea();
        this.canJump = true;
      }
    });

    this.listener = new AudioListener();
    this.model.add(this.listener);
  }

  private spawnDamageArea() {}

  private isInJumpAnimation() {
    return this.animations.jump.isRunning();
  }

  private getAnimation(state: CharacterState) {
    if (state === "in_air") {
      return this.animations["jump"];
    }

    if (state === "walk" && this.isMjMode) {
      return this.animations["mj"];
    }

    return this.animations[state];
  }

  private updateAnimation(oldState: CharacterState, newState: CharacterState) {
    if (oldState === newState || this.isInJumpAnimation()) return;

    const newAction = this.getAnimation(newState);

    this.currentAnimationAction.fadeOut(0.1);
    this.currentAnimationAction = newAction.reset().fadeIn(0.1).play();
  }

  playerCollisions() {
    const result = this.worldOctree.capsuleIntersect(this.collider);
    this.isPlayerOnFloor = false;

    if (result) {
      this.isPlayerOnFloor = result.normal.y > 0;

      const position = result.normal.multiplyScalar(result.depth);

      this.collider.translate(position);
    }
  }

  updateCameraPosition() {
    if (this.currentState !== "idle") {
      const cameraAngleFromPlayer = Math.atan2(
        this.camera.position.x - this.model.position.x,
        this.camera.position.z - this.model.position.z,
      );

      const mjModifier =
        this.currentState === "walk" && this.isMjMode && this.character !== "O"
          ? Math.PI
          : 0;

      this.rotateQuarternion.setFromAxisAngle(
        new Vector3(0, 1, 0),
        cameraAngleFromPlayer + this.directionOffset + mjModifier,
      );
      this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.5);
    }
  }

  getForwardVector() {
    this.camera.getWorldDirection(this.walkDirection);
    this.walkDirection.y = 0;
    this.walkDirection.normalize();

    return this.walkDirection;
  }

  switchSpecialMode() {
    this.isMjMode = !this.isMjMode;

    if (this.currentState === "walk") {
      this.updateAnimation("idle", "walk");
    }
  }

  getSideVector() {
    this.camera.getWorldDirection(this.walkDirection);
    this.walkDirection.y = 0;
    this.walkDirection.normalize();
    this.walkDirection.cross(this.camera.up);

    return this.walkDirection;
  }

  private updateState() {
    const { forward, backward, left, right, shift, space } = this.input.keys;
    const oldState = this.currentState;
    let newState: CharacterState = "idle";

    if ([forward, backward, left, right].some(Boolean)) {
      newState = "walk";
      if (shift) {
        newState = "run";
      }
    }

    if (space && this.canJump) {
      newState = "jump";
    }

    if (this.isInJumpAnimation()) {
      newState = "in_air";
    }

    this.currentState = newState;
    this.updateAnimation(oldState, newState);
  }

  updateCollider(deltaTime: number) {
    if (!this.model) {
      return;
    }

    const speed =
      (this.isPlayerOnFloor ? 1 : 0.5) * this.gravity * this.speedMultiplier;

    let speedDelta = deltaTime * speed;

    if (this.currentState === "run" && this.isPlayerOnFloor) {
      speedDelta *= 3;
    }

    if (this.input.keys.forward) {
      this.velocity.add(this.getForwardVector().multiplyScalar(speedDelta));
    }
    if (this.input.keys.backward) {
      this.velocity.add(this.getForwardVector().multiplyScalar(-speedDelta));
    }
    if (this.input.keys.left) {
      this.velocity.add(this.getSideVector().multiplyScalar(-speedDelta));
    }
    if (this.input.keys.right) {
      this.velocity.add(this.getSideVector().multiplyScalar(speedDelta));
    }

    if (this.isPlayerOnFloor) {
      if (this.isInJumpAnimation() && this.canJump) {
        this.velocity.y = 20;
        this.canJump = false;
      }
    }

    let damping = Math.exp(-15 * deltaTime) - 1;

    if (!this.isPlayerOnFloor) {
      if (this.isInJumpAnimation()) {
        this.velocity.y -= this.gravity * 0.7 * deltaTime;
      } else {
        this.velocity.y -= this.gravity * deltaTime;
      }
      damping *= 0.1;
    }

    this.velocity.addScaledVector(this.velocity, damping);

    const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);

    this.collider.translate(deltaPosition);

    this.playerCollisions();

    this.camera.position.sub(this.orbitControl.target);
    this.orbitControl.target.copy(this.collider.end);
    this.camera.position.add(this.collider.end);

    this.camera.updateMatrixWorld();
  }

  updatePlayerPosition(deltaTime: number) {
    this.model.position.copy(this.collider.end);
    this.model.position.y -= 1.25;

    if (this.model.position.y < 0) {
      this.model.position.y = 0;
    }

    this.mixer.update(deltaTime);
  }

  updatePlayerRotation() {
    const { forward, backward, left, right } = this.input.keys;
    if (forward) {
      this.directionOffset = Math.PI;
    }
    if (backward) {
      this.directionOffset = 0;
    }

    if (left) {
      this.directionOffset = -Math.PI / 2;
    }

    if (forward && left) {
      this.directionOffset = Math.PI + Math.PI / 4;
    }
    if (backward && left) {
      this.directionOffset = -Math.PI / 4;
    }

    if (right) {
      this.directionOffset = Math.PI / 2;
    }

    if (forward && right) {
      this.directionOffset = Math.PI - Math.PI / 4;
    }
    if (backward && right) {
      this.directionOffset = Math.PI / 4;
    }

    if (forward && left && right) {
      this.directionOffset = Math.PI;
    }
    if (backward && left && right) {
      this.directionOffset = 0;
    }

    if (right && backward && forward) {
      this.directionOffset = Math.PI / 2;
    }

    if (left && backward && forward) {
      this.directionOffset = -Math.PI / 2;
    }
  }

  private moveTo(vector: Vector3) {
    this.collider.start.copy(vector);
    this.collider.start.y = 0;
    this.collider.end.copy(vector.clone().add(new Vector3(0, 1, 0)));
  }

  private respawnIfOutOfBoundaries() {
    if (this.collider.start.y < -15) {
      this.moveTo(this.spawnPoint);
    }
  }

  private spawn() {
    this.moveTo(this.spawnPoint);
  }

  update(deltaTime: number) {
    this.updateState();
    this.updateCollider(deltaTime);
    this.updatePlayerPosition(deltaTime);
    this.updatePlayerRotation();
    this.updateCameraPosition();
    this.respawnIfOutOfBoundaries();
  }
}

type Key = "forward" | "backward" | "left" | "right" | "space" | "shift";

type Keys = Record<Key, boolean>;

class CharacterControllerInput {
  keys: Keys;
  keyListeners: Record<number, () => void> = {};

  constructor() {
    this.init();
  }

  private setKey(keyCode: number, value: boolean) {
    switch (keyCode) {
      //w
      case 87:
      case 38:
        this.keys.forward = value;
        break;
      //s
      case 83:
      case 40:
        this.keys.backward = value;
        break;
      //a
      case 65:
      case 37:
        this.keys.left = value;
        break;
      //d
      case 68:
      case 39:
        this.keys.right = value;
        break;
      //space
      case 32:
        this.keys.space = value;
        break;
      //shift
      case 16:
        this.keys.shift = value;
        break;
    }
  }

  onKeyDown(keyCode: number, callback: () => void) {
    if (this.keyListeners[keyCode]) {
      return;
    }
    const listener = window.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.keyCode === keyCode) {
        callback();
      }
    });

    this.keyListeners[keyCode] = listener;
  }

  private init() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };

    window.addEventListener("keydown", (e) => {
      e.stopPropagation();
      this.setKey(e.keyCode, true);
    });

    window.addEventListener("keyup", (e) => {
      e.stopPropagation();
      this.setKey(e.keyCode, false);
    });
  }
}
