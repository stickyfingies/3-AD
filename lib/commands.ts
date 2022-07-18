export type GraphicsInitCmd = {
    type: 'init',
    canvas: OffscreenCanvas,
    buffer: SharedArrayBuffer,
}

export type GraphicsUploadTextureCmd = {
    type: 'uploadTexture',
    imageId: string,
    imageWidth: number,
    imageHeight: number,
    imageDataBuffer: ArrayBufferLike,
    ui: boolean
}

export type GraphicsAddCameraCmd = {
    type: 'addCamera',
    data: any,
    id: number,
}

export type GraphicsAddObjectCmd = {
    type: 'addObject',
    data: any,
    id: number,
    ui: boolean
}

export type GraphicsRemoveObjectCmd = {
    type: 'removeObject',
    id: number
}

export type GraphicsResizeCmd = {
    type: 'resize',
    width: number,
    height: number,
    pixelRatio: number
}

export type GraphicsUpdateMaterialCmd = {
    type: 'updateMaterial'
    material: any,
    id: number,
}

export type GraphicsCreateParticleSystemCmd = {
    type: 'createParticleSystem',
    position: [number, number, number]
}

/**
 * Represents any of the possible commands from frontend -> backend
 */
export type IGraphicsCommand
    = GraphicsInitCmd
    | GraphicsUploadTextureCmd
    | GraphicsAddCameraCmd
    | GraphicsAddObjectCmd
    | GraphicsRemoveObjectCmd
    | GraphicsResizeCmd
    | GraphicsUpdateMaterialCmd
    | GraphicsCreateParticleSystemCmd;
