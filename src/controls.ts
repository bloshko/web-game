import {
  Vector3,
  Scene,
  AnimationMixer,
  LoopRepeat,
  Quaternion,
  Camera,
  Group,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import manGLB from "../assets/man.glb";

type BasicCharacterControllerParams = {
  scene: Scene;
  orbitControl: OrbitControls;
  camera: Camera;
};

export class BasicCharacterController {
  private input: BasicCharacterControllerInput;
  velocity: Vector3;
  acceleration: Vector3;
  params: BasicCharacterControllerParams;
  mixer: AnimationMixer;
  animations: Record<string, any>;
  model: Group;

  camera: Camera;
  orbitControl: OrbitControls;

  walkDirection = new Vector3();
  rotateAngle = new Vector3(0, 1, 0);
  rotateQuarternion = new Quaternion();
  cameraTarget = new Vector3();

  constructor(params: BasicCharacterControllerParams) {
    this.camera = params.camera;
    this.orbitControl = params.orbitControl;
    this.input = new BasicCharacterControllerInput();
  }

  async init() {
    this.velocity = new Vector3(0, 0, 0);

    this.animations = {};
    this.input = new BasicCharacterControllerInput();

    await this.loadModel();
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(manGLB);

    this.model = gltf.scene;
    this.mixer = new AnimationMixer(gltf.scene);
    this.animations = {
      idle: gltf.animations[1],
      walk: gltf.animations[3],
      run: gltf.animations[2],
    };

    this.mixer.clipAction(this.animations.run).setLoop(LoopRepeat).play();
    // this.model.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2);
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

  update(deltaTime: number) {
    if (!this.model) {
      return;
    }

    const { forward, backward, left, right, shift } = this.input.keys;

    this.mixer.update(deltaTime);

    if (forward || backward || left || right) {
      const angleYCameraDirection = Math.atan2(
        this.camera.position.x - this.model.position.x,
        this.camera.position.z - this.model.position.z,
      );
      const directionOffset = this.directionOffset(this.input.keys);

      this.rotateQuarternion.setFromAxisAngle(
        this.rotateAngle,
        angleYCameraDirection + directionOffset + Math.PI,
      );
      this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

      this.camera.getWorldDirection(this.walkDirection);
      this.walkDirection.y = 0;
      this.walkDirection.normalize();
      this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

      const velocity = shift ? 10 : 3;

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
}

type Key = "forward" | "backward" | "left" | "right" | "space" | "shift";

type Keys = {
  [K in Key]: boolean;
};

class BasicCharacterControllerInput {
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
      this.setKey(e.keyCode, true);
    });

    window.addEventListener("keyup", (e) => {
      this.setKey(e.keyCode, false);
    });
  }
}
