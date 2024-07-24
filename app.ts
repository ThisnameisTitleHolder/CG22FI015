//22FI015 伊藤理来
import * as CANNON from 'cannon-es';
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

class ThreeJSContainer {
    private scene: THREE.Scene;
    private light: THREE.Light;
    private sphereMeshes: THREE.Mesh[] = [];
    private sphereBodies: CANNON.Body[] = [];
    private world: CANNON.World;

    constructor() {
        this.createScene();
    }

    // 画面部分の作成(表示する枠ごとに)
    public createRendererDOM = (width: number, height: number, cameraPos: THREE.Vector3) => {
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
        renderer.setClearColor(new THREE.Color(0x495ed));
        renderer.shadowMap.enabled = true; // シャドウマップを有効にする

        // カメラの設定
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.set(15, 15, 15);
camera.lookAt(new THREE.Vector3(0, 0, 0));

        const orbitControls = new OrbitControls(camera, renderer.domElement);

        // 毎フレームのupdateを呼んで，render
        // requestAnimationFrame により次フレームを呼ぶ
        const render: FrameRequestCallback = (time) => {
            orbitControls.update();
            this.updateScene();
            renderer.render(this.scene, camera);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);

        renderer.domElement.style.cssFloat = "left";
        renderer.domElement.style.margin = "10px";
        return renderer.domElement;
    }

    // シーンの作成(全体で1回)
    private createScene = () => {
        this.scene = new THREE.Scene();

        this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

        this.world.defaultContactMaterial.friction = 0.01;
        this.world.defaultContactMaterial.restitution = 0.9;

        const geometry = new THREE.SphereGeometry(1, 32, 16);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

        const numSpheres = 15; // 球の数を15に変更
        const spacing = 2.1; // 球の間隔を調整

        let index = 0;
        let middleSpherePosition: THREE.Vector3;

        for (let row = 0; row < 5; row++) {
            for (let col = 0; col <= row; col++) {
                if (index >= numSpheres) break;

                const x = (col - row * 0.5) * spacing;
                const z = row * spacing * Math.sqrt(3) / 2;

                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.set(x, 1.0, z);
                this.scene.add(sphere);
                this.sphereMeshes.push(sphere);

                const sphereShape = new CANNON.Sphere(1);
                const sphereBody = new CANNON.Body({ mass: 1 });
                sphereBody.addShape(sphereShape);
                sphereBody.position.set(sphere.position.x, sphere.position.y, sphere.position.z);
                sphereBody.quaternion.set(sphere.quaternion.x, sphere.quaternion.y, sphere.quaternion.z, sphere.quaternion.w);

                this.world.addBody(sphereBody);
                this.sphereBodies.push(sphereBody);

                if (row === 4 && col === 2) {
                    middleSpherePosition = sphere.position.clone();
                }

                index++;
            }
        }

        if (middleSpherePosition) {
            const newSpherePosition = middleSpherePosition.clone();
            newSpherePosition.z = -middleSpherePosition.z;

            const redMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });

            const newSphere = new THREE.Mesh(geometry, redMaterial);
            newSphere.position.copy(newSpherePosition);
            this.scene.add(newSphere);
            this.sphereMeshes.push(newSphere);

            const newSphereShape = new CANNON.Sphere(1);
            const newSphereBody = new CANNON.Body({ mass: 10 });
            newSphereBody.addShape(newSphereShape);
            newSphereBody.position.set(newSphere.position.x, newSphere.position.y, newSphere.position.z);
            newSphereBody.quaternion.set(newSphere.quaternion.x, newSphere.quaternion.y, newSphere.quaternion.z, newSphere.quaternion.w);

            //球に速度を与える
            newSphereBody.velocity.set(0.5, 0, 50);

            this.world.addBody(newSphereBody);
            this.sphereBodies.push(newSphereBody);
        }

        // 地面
        const phongMaterial = new THREE.MeshPhongMaterial();
        const planeGeometry = new THREE.PlaneGeometry(25, 25);
        const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
        planeMesh.material.side = THREE.DoubleSide; // 両面
        planeMesh.rotateX(-Math.PI / 2);
        this.scene.add(planeMesh);

        const planeShape = new CANNON.Plane();
        const planeBody = new CANNON.Body({ mass: 0 });
        planeBody.addShape(planeShape);
        planeBody.position.set(planeMesh.position.x, planeMesh.position.y, planeMesh.position.z);
        planeBody.quaternion.set(planeMesh.quaternion.x, planeMesh.quaternion.y, planeMesh.quaternion.z, planeMesh.quaternion.w);
        this.world.addBody(planeBody);

        // グリッド表示
        const gridHelper = new THREE.GridHelper(10);
        this.scene.add(gridHelper);

        // 軸表示
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // ライトの設定
        this.light = new THREE.DirectionalLight(0xffffff);
        const lvec = new THREE.Vector3(1, 1, 1).normalize();
        this.light.position.set(lvec.x, lvec.y, lvec.z);
        this.scene.add(this.light);

        // 壁の追加
        const wallHeight = 3;
        const wallThickness = 0.5;
        const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const wallGeometry = new THREE.BoxGeometry(25, wallHeight, wallThickness);

        const createWall = (x: number, y: number, z: number, rotationY: number) => {
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            wallMesh.position.set(x, y, z);
            wallMesh.rotation.y = rotationY;
            this.scene.add(wallMesh);

            const wallShape = new CANNON.Box(new CANNON.Vec3(25 / 2, wallHeight / 2, wallThickness / 2));
            const wallBody = new CANNON.Body({ mass: 0 });
            wallBody.addShape(wallShape);
            wallBody.position.set(x, y, z);
            wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
            this.world.addBody(wallBody);
        }

        // 壁を配置
        createWall(0, wallHeight / 2, -12.5, 0); // 下側の壁
        createWall(0, wallHeight / 2, 12.5, 0); // 上側の壁
        createWall(-12.5, wallHeight / 2, 0, Math.PI / 2); // 左側の壁
        createWall(12.5, wallHeight / 2, 0, Math.PI / 2); // 右側の壁
    }

    private updateScene = () => {
        this.world.fixedStep();
        for (let i = 0; i < this.sphereMeshes.length; i++) {
            this.sphereMeshes[i].position.set(this.sphereBodies[i].position.x, this.sphereBodies[i].position.y, this.sphereBodies[i].position.z);
            this.sphereMeshes[i].quaternion.set(this.sphereBodies[i].quaternion.x, this.sphereBodies[i].quaternion.y, this.sphereBodies[i].quaternion.z, this.sphereBodies[i].quaternion.w);
        }
    }
}

window.addEventListener("DOMContentLoaded", init);

function init() {
    let container = new ThreeJSContainer();

    let viewport = container.createRendererDOM(640, 480, new THREE.Vector3(10, 10, 10));
    document.body.appendChild(viewport);
}
