/**
 * @see index.ts for information on how object transforms are communicated
 */

import {
    DataTexture,
    // GridHelper,
    LinearFilter,
    LinearMipMapLinearFilter,
    MaterialLoader,
    Matrix4,
    Mesh,
    MeshPhongMaterial,
    Object3D,
    ObjectLoader,
    OrthographicCamera,
    PCFSoftShadowMap,
    PerspectiveCamera,
    REVISION,
    RGBAFormat,
    RepeatWrapping,
    Scene,
    Sprite,
    WebGLRenderer,
    LinearToneMapping,
    Points,
    BufferGeometry,
    Material,
    Float32BufferAttribute,
} from 'three';

import {
    GraphicsAddObjectCmd,
    GraphicsCreateParticleSystemCmd,
    GraphicsInitCmd,
    GraphicsRemoveObjectCmd,
    GraphicsResizeCmd,
    GraphicsUpdateMaterialCmd,
    GraphicsUploadTextureCmd,
} from './commands';

const postMessage = (type: string) => (message: any) => globalThis.postMessage({ type, message });
const log = postMessage('log');
const report = postMessage('report');

interface ParticleSystem {
    emitter: Points,
    geometry: BufferGeometry,
    age: number,
    positions: number[];
    velocities: number[];
}

/**
 * Graphics backend designed to be ran on a WebWorker
 */
export default class GraphicsBackend {
    // eslint-disable-next-line no-undef
    [idx: string]: Function;

    /**
     * Main camera used to render the scene
     * @note camera has Id#0
     */
    #camera = new PerspectiveCamera(60, 1, 0.1, 2000);

    /**
     * Secondary camera used to render the UI
     * @note uicamera has no Id
     */
    #uicamera = new OrthographicCamera(-20, 20, 20, -20, 1, 10);

    /** Main scene graph object which holds all renderable meshes */
    #scene = new Scene();

    /** Secondary scene which holds all UI elements */
    #uiscene = new Scene();

    /** ThreeJS WebGL renderer instance */
    #renderer!: WebGLRenderer;

    /** map of mesh IDs to mesh instances */
    #idToObject = new Map<number, Object3D>();

    /** map of texture identifiers to raw image data */
    #textureCache = new Map<string, DataTexture>();

    #particle_systems = new Set<ParticleSystem>();

    /** number of elements per each transform matrix in the shared array buffer */
    readonly #elementsPerTransform = 16;

    constructor() {
        log(import.meta.url);
    }

    init({ canvas, buffer }: GraphicsInitCmd) {
        log('Initializing ...');

        const transformArray = new Float32Array(buffer);

        // @ts-ignore - TSC is cranky about newer DOM features
        const context = canvas.getContext('webgl2', { antialias: true })! as WebGLRenderingContext;

        // initialize renderer instance
        this.#renderer = new WebGLRenderer({
            canvas,
            context,
            antialias: true,
        });
        this.#renderer.toneMapping = LinearToneMapping;
        this.#renderer.toneMappingExposure = 1.0;
        this.#renderer.setClearColor(0x000000);
        this.#renderer.autoClear = false;
        this.#renderer.shadowMap.enabled = true;
        this.#renderer.shadowMap.type = PCFSoftShadowMap;

        // set up cameras
        this.#camera.matrixAutoUpdate = false;
        this.#scene.add(this.#camera);
        this.#idToObject.set(0, this.#camera);

        this.#uicamera.matrixAutoUpdate = false;
        this.#uicamera.position.z = 10;

        // grid
        // const grid = new GridHelper(100, 100);
        // grid.position.y = 1;
        // // grid.rotateX(Math.PI / 2);
        // this.#scene.add(grid);
        // const grid1 = new GridHelper(99, 50, 0xff00ff, 0xff0000);
        // grid1.position.y = 1.1;
        // this.#scene.add(grid1);

        const updateParticleSystem = (particle_system: ParticleSystem) => {
            /**
             * ! TODO
             * Move this computation from CPU->GPU by embedding it in the shader
             */
            const { geometry, positions, velocities } = particle_system;

            for (let i = 0; i < positions.length; i += 3) {
                // const wiggleScale = 0.066;
                // velocities[i + 0] = wiggleScale * (Math.random() - 0.5);
                // velocities[i + 1] = wiggleScale * (Math.random() - 0.5);
                // velocities[i + 2] = wiggleScale * (Math.random() - 0.5);

                positions[i + 0] += velocities[i + 0];
                positions[i + 1] += velocities[i + 1];
                positions[i + 2] += velocities[i + 2];
            }

            // log(`P ${positions.length}}`);
            // log(`A ${geometry.attributes.position.count}`);
            if (positions.length === geometry.attributes.position.count * 3) {
                // log('copying [dynamic positions] -> [buffer positions]');
                for (let i = 0; i < geometry.attributes.position.count; i++) {
                    geometry.attributes.position.setXYZ(i, positions[i * 3 + 0], positions[i * 3 + 1], positions[i * 3 + 2]);
                }
                geometry.attributes.position.needsUpdate = true;
            }
            else {
                log('re-creating [buffer positions]');
                geometry.attributes.position = new Float32BufferAttribute(positions, 3);
            }

            particle_system.age += 1;
            return particle_system.age > 30000;
        }

        // graphics thread render loop
        const render = () => {
            this.readTransformsFromArray(transformArray);

            for (const sys of this.#particle_systems) {
                const should_remove = updateParticleSystem(sys);
                if (should_remove) {
                    this.#scene.remove(sys.emitter);
                    this.#particle_systems.delete(sys);
                }
            }

            this.#renderer.clear();
            this.#renderer.render(this.#scene, this.#camera);
            this.#renderer.clearDepth();
            this.#renderer.render(this.#uiscene, this.#uicamera);

            requestAnimationFrame(render);
        };

        // start rendering
        requestAnimationFrame(render);
        log(`Ready - ThreeJS renderer v.${REVISION}`);
    }

    createParticleSystem({ emitter_id }: GraphicsCreateParticleSystemCmd) {
        const emitter = this.#idToObject.get(emitter_id)! as Points;
        const geometry = emitter.geometry;

        const positions: number[] = [];
        const velocities: number[] = [];
        for (let i = 0; i < geometry.attributes.position.count; i++) {
            const x = geometry.attributes.position.getX(i);
            const y = geometry.attributes.position.getY(i);
            const z = geometry.attributes.position.getZ(i);
            positions.push(x, y, z);
        }

        for (let i = 0; i < geometry.attributes.velocity.count; i++) {
            const x = geometry.attributes.velocity.getX(i);
            const y = geometry.attributes.velocity.getY(i);
            const z = geometry.attributes.velocity.getZ(i);
            velocities.push(x, y, z);
        }

        this.#particle_systems.add({
            emitter,
            geometry,
            age: 0,
            positions,
            velocities
        });
    }

    /** Copy object transforms into their corresponding ThreeJS renderable */
    private readTransformsFromArray(transformArray: Float32Array) {
        for (const [id, object] of this.#idToObject) {
            const offset = id * this.#elementsPerTransform;
            const matrix = new Matrix4().fromArray(transformArray, offset);

            // ! <hack/>
            // before the main thread starts pushing object matrices to the transform buffer,
            // there will be a period of time where `matrix` consists of entirely zeroes.
            // ThreeJS doesn't particularly like when scale elements are zero, so set them
            // to something else as a fix.
            if (matrix.elements[0] === 0) matrix.makeScale(0.1, 0.1, 0.1);

            object.matrix.copy(matrix);
        }
    }

    /** Emplaces raw texture data into a ThreeJS texture object */
    uploadTexture({
        imageId, imageDataBuffer, imageWidth, imageHeight, ui,
    }: GraphicsUploadTextureCmd) {
        const imageData = new Uint8Array(imageDataBuffer);
        const texture = new DataTexture(imageData, imageWidth, imageHeight, RGBAFormat);
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.magFilter = LinearFilter;
        // disable MipMapping for UI elements
        texture.minFilter = ui ? LinearFilter : LinearMipMapLinearFilter;
        texture.generateMipmaps = true;
        texture.flipY = true;
        texture.needsUpdate = true;

        this.#textureCache.set(imageId, texture);
    }

    /** Updates the material of a renderable object */
    updateMaterial({ material, id }: GraphicsUpdateMaterialCmd) {
        const mat = this.deserializeMaterial(material);

        const mesh = this.#idToObject.get(id)! as Mesh | Sprite;

        mesh.material = mat;
    }

    /** Adds a renderable object to the scene */
    addObject({ id, data, ui }: GraphicsAddObjectCmd) {
        data.images = [];
        data.textures = [];

        const matMap = new Map<string, MeshPhongMaterial>();
        if (data.materials) {
            for (const materialData of data.materials) {
                const mat = this.deserializeMaterial(materialData);
                matMap.set(mat.uuid, mat);
            }
        }

        const object = new ObjectLoader().parse(data);

        if (object instanceof Mesh || object instanceof Points || object instanceof Sprite) {
            if (object.material.length) {
                const matList: Material[] = [];
                for (const mat of object.material) {
                    matList.push(matMap.get(mat.uuid)!);
                }
                object.material = matList;
            } else {
                object.material = matMap.get(object.material.uuid);
            }
        }

        object.matrixAutoUpdate = false;
        (ui ? this.#uiscene : this.#scene).add(object);
        this.#idToObject.set(id, object);
    }

    /** Removes a renderable object from the scene */
    removeObject({ id }: GraphicsRemoveObjectCmd) {
        const object = this.#idToObject.get(id)!;
        this.#idToObject.delete(id);
        this.#scene.remove(object);
    }

    /** Resizes the render target */
    resize({ width, height }: GraphicsResizeCmd) {
        // console.log(`resize ${width} x ${height} @ ${pixelRatio}x scaling`);

        this.#camera.aspect = width / height;
        this.#camera.updateProjectionMatrix();

        this.#uicamera.left = -width / 2;
        this.#uicamera.right = width / 2;
        this.#uicamera.top = height / 2;
        this.#uicamera.bottom = -height / 2;
        this.#uicamera.updateProjectionMatrix();

        this.#renderer.setSize(width, height, false);

        // For *WHATEVER REASON*, passing the pixel ratio actually messes shit up on HiDPI displays
        // this.#renderer.setPixelRatio(pixelRatio);
    }

    /** Takes a JSON material description and creates a tangible (textured) ThreeJS material */
    private deserializeMaterial(json: any) {
        const {
            map, alphaMap, normalMap, specularMap,
        } = json;

        // [?] can this process be automated
        delete json.map; //
        delete json.matcap;
        delete json.alphaMap; //
        delete json.bumpMap;
        delete json.normalMap; //
        delete json.displacementMap;
        delete json.roughnessMap;
        delete json.metalnessMap;
        delete json.emissiveMap;
        delete json.specularMap; //
        delete json.envMap;
        delete json.lightMap;
        delete json.aoMap;

        const mat = new MaterialLoader().parse(json) as MeshPhongMaterial;

        // assign textures
        if (map) mat.map = this.#textureCache.get(map)!;
        if (alphaMap) mat.alphaMap = this.#textureCache.get(alphaMap)!;
        if (normalMap) mat.normalMap = this.#textureCache.get(normalMap)!;
        if (specularMap) mat.specularMap = this.#textureCache.get(specularMap)!;

        return mat;
    }
}
