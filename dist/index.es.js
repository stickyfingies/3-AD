import { SphereBufferGeometry, MeshPhongMaterial, Mesh, CylinderBufferGeometry, PerspectiveCamera, Sprite, Light, Scene, Material } from 'three';

function WorkerWrapper() {
          return new Worker(new URL("./worker.d9147f88.js", import.meta.url), {
  "type": "module"
})
        }

class GraphicsUtils {
  static makeBall(radius, norotate) {
    const geometry = new SphereBufferGeometry(radius, 32, 32);
    const material = new MeshPhongMaterial({ color: 52479 });
    const mesh = new Mesh(geometry, material);
    mesh.userData.norotate = norotate;
    return mesh;
  }
  static makeCapsule(radius, height) {
    const material = new MeshPhongMaterial({ color: 52479 });
    const cGeometry = new CylinderBufferGeometry(radius, radius, height, 32);
    const sGeometry = new SphereBufferGeometry(radius, 32, 32);
    const cMesh = new Mesh(cGeometry, material);
    const stMesh = new Mesh(sGeometry, material);
    const sbMesh = new Mesh(sGeometry, material);
    stMesh.position.y = height / 2;
    sbMesh.position.y = -height / 2;
    cMesh.add(stMesh);
    cMesh.add(sbMesh);
    return cMesh;
  }
  static makeCylinder(radius, height) {
    const geometry = new CylinderBufferGeometry(radius, radius, height);
    const material = new MeshPhongMaterial({ color: 52479 });
    const mesh = new Mesh(geometry, material);
    return mesh;
  }
  static scratchCanvasContext(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return { canvas, ctx: canvas.getContext("2d") };
  }
}

const CameraData = PerspectiveCamera;
const MeshData = Mesh;
const SpriteData = Sprite;
const LightData = Light;
const CAMERA_TAG = Symbol("camera");
let [log, report] = [console.log, console.error];
let [workerLog, workerReport] = [console.log, console.error];
class Graphics {
  #scene = new Scene();
  #idToObject = /* @__PURE__ */ new Map();
  #availableObjectIds = [];
  #objectId = 0;
  #textureCache = /* @__PURE__ */ new Set();
  #commandQueue = [];
  #worker;
  #buffer;
  #array;
  #camera = new PerspectiveCamera();
  #bytesPerElement = Float32Array.BYTES_PER_ELEMENT;
  #elementsPerTransform = 16;
  #maxEntityCount = 1024;
  get #bufferSize() {
    return this.#bytesPerElement * this.#elementsPerTransform * this.#maxEntityCount;
  }
  get camera() {
    return this.#camera;
  }
  constructor(logService, workerLogService) {
    if (logService) {
      [log, report] = logService;
      [workerLog, workerReport] = logService;
    }
    if (workerLogService)
      [workerLog, workerReport] = workerLogService;
    log(import.meta.url);
    if (typeof SharedArrayBuffer === "undefined") {
      report("SharedArrayBuffer not supported");
    }
    this.#buffer = new SharedArrayBuffer(this.#bufferSize);
    this.#array = new Float32Array(this.#buffer);
    this.#worker = new WorkerWrapper();
    this.#worker.onmessage = ({ data }) => {
      switch (data.type) {
        case "log": {
          workerLog(data.message);
          break;
        }
        default: {
          report(`Unknown message type ${data.type}`);
          break;
        }
      }
    };
  }
  init() {
    this.assignIdToObject(this.#camera);
    this.#scene.add(this.#camera);
    const offscreenCanvas = document.getElementById("main-canvas");
    const offscreen = offscreenCanvas.transferControlToOffscreen();
    this.submitCommand({
      type: "init",
      buffer: this.#buffer,
      canvas: offscreen
    }, true, offscreen);
    this.submitCommand({
      type: "resize",
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio
    });
    window.addEventListener("resize", () => {
      this.submitCommand({
        type: "resize",
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio
      });
    });
  }
  update() {
    this.flushCommands();
    this.writeTransformsToArray();
  }
  flushCommands() {
    for (const cmd of this.#commandQueue) {
      this.#worker.postMessage(cmd);
    }
    this.#commandQueue = [];
  }
  updateMaterial(object, ui = false) {
    object.traverse((node) => {
      if (node instanceof Mesh || node instanceof Sprite) {
        this.extractMaterialTextures(node.material, ui);
        this.submitCommand({
          type: "updateMaterial",
          material: node.material.toJSON(),
          id: node.userData.meshId
        });
      }
    });
  }
  submitCommand(cmd, immediate = false, transfer) {
    if (immediate) {
      this.#worker.postMessage(cmd, transfer ? [transfer] : void 0);
    } else {
      this.#commandQueue.push(cmd);
    }
  }
  removeObjectFromScene(object) {
    object.traverse((node) => {
      if (node.userData.meshId) {
        const id = node.userData.meshId;
        this.submitCommand({
          type: "removeObject",
          id
        });
        this.#idToObject.delete(id);
        this.#availableObjectIds.push(id);
      }
    });
  }
  writeTransformsToArray() {
    this.#scene.updateMatrixWorld();
    for (const [id, object] of this.#idToObject) {
      const offset = id * this.#elementsPerTransform;
      for (let i = 0; i < this.#elementsPerTransform; i++) {
        this.#array[offset + i] = object.matrixWorld.elements[i];
      }
    }
  }
  assignIdToObject(object) {
    let id = this.#objectId;
    if (this.#availableObjectIds.length > 0) {
      id = this.#availableObjectIds.shift();
    } else {
      this.#objectId += 1;
      if (this.#objectId > this.#maxEntityCount) {
        report(`exceeded maximum object count: ${this.#maxEntityCount}`);
        debugger;
      }
    }
    this.#idToObject.set(id, object);
    object.userData.meshId = id;
    return id;
  }
  uploadTexture(map, ui) {
    if (this.#textureCache.has(map.uuid))
      return;
    const { image, uuid } = map;
    const { width, height } = image;
    const { ctx } = GraphicsUtils.scratchCanvasContext(width, height);
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    this.#textureCache.add(uuid);
    this.submitCommand({
      type: "uploadTexture",
      imageId: uuid,
      imageData: imageData.data,
      imageWidth: width,
      imageHeight: height,
      ui
    });
  }
  extractMaterialTextures(material, ui) {
    const { map, alphaMap } = material;
    if (map)
      this.uploadTexture(map, ui);
    if (alphaMap)
      this.uploadTexture(alphaMap, ui);
  }
  addObjectToScene(object, ui = false) {
    if (object.parent)
      object.parent.add(object);
    else
      this.#scene.add(object);
    object.traverse((node) => {
      if (node instanceof Mesh || node instanceof Sprite || node instanceof Light) {
        const id = this.assignIdToObject(node);
        if ("material" in node) {
          if (node.material instanceof Material) {
            this.extractMaterialTextures(node.material, ui);
          } else {
            for (const material of node.material) {
              this.extractMaterialTextures(material, ui);
            }
          }
        }
        this.submitCommand({
          type: "addObject",
          data: node.toJSON(),
          id,
          ui
        });
      }
    });
  }
}

export { CAMERA_TAG, CameraData, Graphics, LightData, MeshData, SpriteData };
