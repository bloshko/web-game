import {
  Vector3,
  Scene,
  AnimationMixer,
  LoopRepeat,
  Quaternion,
  Camera,
  Group,
  AnimationAction,
  PointLight,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import manGLB from "../assets/man.glb";

type CharacterControllerParams = {
  scene: Scene;
  orbitControl: OrbitControls;
  camera: Camera;
};

type CharacterState = "idle" | "walk" | "run";

export class CharacterController {
  private input: CharacterControllerInput;
  velocity: Vector3;
  acceleration: Vector3;
  params: CharacterControllerParams;
  mixer: AnimationMixer;
  animations: Record<CharacterState, any>;
  model: Group;
  scene: Scene;

  camera: Camera;
  orbitControl: OrbitControls;

  walkDirection = new Vector3();
  rotateAngle = new Vector3(0, 1, 0);
  rotateQuarternion = new Quaternion();
  cameraTarget = new Vector3();

  currentState: CharacterState = "idle";
  currentAnimationAction: AnimationAction;

  constructor(params: CharacterControllerParams) {
    this.camera = params.camera;
    this.scene = params.scene;
    this.orbitControl = params.orbitControl;
    this.input = new CharacterControllerInput();
  }

  async init() {
    this.velocity = new Vector3(0, 0, 0);

    this.animations = {};
    this.input = new CharacterControllerInput();

    await this.loadModel();
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(manGLB);

    gltf.scene.traverse((el) => {
      if (el.isMesh) {
        el.castShadow = true;
      }
    });

    this.model = gltf.scene;
    this.mixer = new AnimationMixer(gltf.scene);
    this.animations = {
      idle: this.mixer.clipAction(gltf.animations[1]),
      walk: this.mixer.clipAction(gltf.animations[3]),
      run: this.mixer.clipAction(gltf.animations[2]),
    };

    this.currentAnimationAction = this.animations[this.currentState]
      .setLoop(LoopRepeat)
      .play();
  }

  private updateAnimation(oldState: CharacterState, newState: CharacterState) {
    if (oldState === newState) return;

    const newAction = this.animations[newState];

    this.currentAnimationAction.fadeOut(0.2);
    this.currentAnimationAction = newAction.reset().fadeIn(0.2).play();
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

    this.currentState = newState;
    this.updateAnimation(oldState, newState);
  }

  update(deltaTime: number) {
    if (!this.model) {
      return;
    }
    this.updateState();

    this.mixer.update(deltaTime);

    if (["walk", "run"].includes(this.currentState)) {
      const angleYCameraDirection = Math.atan2(
        this.camera.position.x - this.model.position.x,
        this.camera.position.z - this.model.position.z,
      );
      const directionOffset = this.directionOffset(this.input.keys);

      this.rotateQuarternion.setFromAxisAngle(
        this.rotateAngle,
        angleYCameraDirection + directionOffset + Math.PI,
      );
      this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.3);

      this.camera.getWorldDirection(this.walkDirection);
      this.walkDirection.y = 0;
      this.walkDirection.normalize();
      this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

      const velocity = this.currentState === "run" ? 10 : 1.5;

      const moveX = this.walkDirection.x * velocity * deltaTime;
      const moveZ = this.walkDirection.z * velocity * deltaTime;
      this.model.position.x += moveX;
      this.model.position.z += moveZ;
      this.updateCameraTarget(moveX, moveZ);
      this.orbitControl.update();

      return;
    }
  }

  private directionOffset(keysPressed: Keys) {
    let directionOffset = 0; // w

    if (keysPressed.forward) {
      if (keysPressed.left) {
        directionOffset = Math.PI / 4; // w+a
      } else if (keysPressed.right) {
        directionOffset = -Math.PI / 4; // w+d
      }
    } else if (keysPressed.backward) {
      if (keysPressed.left) {
        directionOffset = Math.PI / 4 + Math.PI / 2; // s+a
      } else if (keysPressed.right) {
        directionOffset = -Math.PI / 4 - Math.PI / 2; // s+d
      } else {
        directionOffset = Math.PI; // s
      }
    } else if (keysPressed.left) {
      directionOffset = Math.PI / 2; // a
    } else if (keysPressed.right) {
      directionOffset = -Math.PI / 2; // d
    }

    return directionOffset;
  }

  private updateCameraTarget(moveX: number, moveZ: number) {
    // move camera
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;

    // update camera target
    this.cameraTarget.x = this.model.position.x;
    this.cameraTarget.y = this.model.position.y + 1;
    this.cameraTarget.z = this.model.position.z;
    this.orbitControl.target = this.cameraTarget;
  }
}

type Key = "forward" | "backward" | "left" | "right" | "space" | "shift";

type Keys = {
  [K in Key]: boolean;
};

class CharacterControllerInput {
  keys: Keys;

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
