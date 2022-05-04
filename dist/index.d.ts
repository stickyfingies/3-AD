/**
 * ===========================
 * Adding and Removing Objects
 * ===========================
 *
 * The situation is a little complicated, but it effectively works like this:
 *
 * Every time we create an object, we associate it with a unique ID that we can use to set/retrieve
 * its transform info from the shared array buffer.  When we delete an object, we recycle its ID, so
 * that future entities can reuse that slot in the shared buffer.  We do this by adding the removed
 * entity's ID to a list, `availableEntityIds`.  Whenever a new entity is added to the scene, we
 * first check that list to see if we can recycle any old, unused entity IDs.  If we cannot do that,
 * we increment a global counter and use that as the entity's ID - effectively, putting it at the
 * end of the shared array buffer.
 */
import { Light, Mesh, Object3D, PerspectiveCamera, Sprite } from 'three';
export declare type CameraData = PerspectiveCamera;
export declare const CameraData: typeof PerspectiveCamera;
export declare type MeshData = Mesh;
export declare const MeshData: typeof Mesh;
export declare type SpriteData = Sprite;
export declare const SpriteData: typeof Sprite;
export declare type LightData = Light;
export declare const LightData: typeof Light;
/**
 * Entity tag used to retrieve the main camera
 * @example Entity.getTag(CAMERA_TAG)
 */
export declare const CAMERA_TAG: unique symbol;
declare type LogFn = (payload: object | string | number) => void;
export declare class Graphics {
    #private;
    get camera(): PerspectiveCamera;
    constructor(logService?: LogFn[], workerLogService?: LogFn[]);
    init(): void;
    update(): void;
    /**
     * Upload queued graphics commands to backend & clear queue
     */
    flushCommands(): void;
    /**
     * Changes to material properties made by game code are not automatically mirrored by
     * the backend, so materials need to be manually flushed after updates
     * @note Broken for groups
     */
    updateMaterial(object: Mesh | Sprite, ui?: boolean): void;
    /**
     * Submit a command to the backend.  Note that unless `immediate` is set to true, the commands
     * will actually be queued until the next call to `flushCommands()`.
     */
    private submitCommand;
    removeObjectFromScene(object: Object3D): void;
    /**
     * Flush all renderable objects' transforms to the shared transform buffer
     */
    private writeTransformsToArray;
    /**
     * Smart algorithm for assigning ID's to renderable objects by reusing ID's from old, removed
     * objects first, and generating a new ID only if no recyclable ID's exist.
     */
    private assignIdToObject;
    /**
     * Ship a texture to the graphics backend, but only if the texture has not already been uploaded
     */
    private uploadTexture;
    private extractMaterialTextures;
    /**
     * Upload a renderable object to the graphics backend.
     * Establishing a scene hierarchy is possible by specifying `object.parent`
     *
     * Current supported objects: `Mesh`, `Sprite`, `Light`
     */
    addObjectToScene(object: Object3D, ui?: boolean): void;
}
export {};
