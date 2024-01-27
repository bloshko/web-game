import { Sphere, Vector3 } from 'three';
import { Timer } from 'three/addons/misc/Timer.js';

export abstract class Attack {
    abstract attack(vector: Vector3);
    abstract hasCollisionWithSphere(sphere: Sphere): boolean;
}

export class SphericalAttack extends Attack {
    collider: Sphere;
    readonly radius = 1;
    duration = 1;

    timer: Timer;
    getAwayPoint: Vector3;
    isAtAttackPoint = false;

    attackPoint: Vector3 | null;

    attackTime: number | null;

    constructor() {
        super();
        this.timer = new Timer();
        this.getAwayPoint = new Vector3(0, 50, 0);
        this.collider = new Sphere(this.getAwayPoint.clone(), this.radius);
    }

    private moveCollider(vector: Vector3) {
        this.collider.set(vector.clone(), this.radius);
    }

    private stopAttack() {
        this.moveCollider(this.getAwayPoint);
        this.isAtAttackPoint = false;
        this.attackTime = null;

        console.log(this.collider);
    }

    hasCollisionWithSphere(sphere: Sphere) {
        // console.log(sphere.center, 'CENTER 1');
        // console.log(this.collider.center, 'CENTER 2');
        return this.collider.intersectsSphere(sphere);
    }

    attack(vector: Vector3) {
        if (this.isAtAttackPoint) {
            return;
        }
        this.moveCollider(vector);
        this.isAtAttackPoint = true;
        this.attackTime = this.timer.getElapsed();

        console.log('attack started');
        console.log(this.attackTime);
    }

    private moveToGetAwayIfNotThere() {
        if (
            !this.isAtAttackPoint &&
            !this.collider.center.equals(this.getAwayPoint)
        ) {
            this.stopAttack();
        }
    }

    private getTimerDurationDelta() {
        return this.timer.getElapsed() - (this.attackTime || 0);
    }

    update() {
        this.timer.update();
        // this.moveToGetAwayIfNotThere();

        if (
            this.isAtAttackPoint &&
            this.attackTime !== null &&
            this.getTimerDurationDelta() >= this.duration
        ) {
            this.stopAttack();

            console.log('attack stopped');
        }
    }
}
