export declare type GraphicsInitCmd = {
    type: 'init';
    canvas: OffscreenCanvas;
    buffer: SharedArrayBuffer;
};
export declare type GraphicsUploadTextureCmd = {
    type: 'uploadTexture';
    imageId: string;
    imageWidth: number;
    imageHeight: number;
    imageData: ArrayBufferView;
    ui: boolean;
};
export declare type GraphicsAddObjectCmd = {
    type: 'addObject';
    data: any;
    id: number;
    ui: boolean;
};
export declare type GraphicsRemoveObjectCmd = {
    type: 'removeObject';
    id: number;
};
export declare type GraphicsResizeCmd = {
    type: 'resize';
    width: number;
    height: number;
    pixelRatio: number;
};
export declare type GraphicsUpdateMaterialCmd = {
    type: 'updateMaterial';
    material: any;
    id: number;
};
/**
 * Represents any of the possible commands from frontend -> backend
 */
export declare type IGraphicsCommand = GraphicsInitCmd | GraphicsUploadTextureCmd | GraphicsAddObjectCmd | GraphicsRemoveObjectCmd | GraphicsResizeCmd | GraphicsUpdateMaterialCmd;
