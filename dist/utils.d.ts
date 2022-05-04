import { CylinderBufferGeometry, Mesh, MeshPhongMaterial, SphereBufferGeometry } from 'three';
export default class GraphicsUtils {
    static makeBall(radius: number, norotate?: boolean): Mesh<SphereBufferGeometry, MeshPhongMaterial>;
    static makeCapsule(radius: number, height: number): Mesh<CylinderBufferGeometry, MeshPhongMaterial>;
    static makeCylinder(radius: number, height: number): Mesh<CylinderBufferGeometry, MeshPhongMaterial>;
    /**
     * Creates a temporary canvas element and returns its context.
     * @note may leak memory if `canvas` is never deleted (unsure though).
     */
    static scratchCanvasContext(width: number, height: number): {
        canvas: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
    };
}
