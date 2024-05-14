declare module "fused-canvas" {
    export function createFusedCanvas(): (options: {
        viewport: HTMLElement,
        canvas: HTMLElement,
        mouseDown0Action?: string,
        mouseDown1Action?: string,
        mouseDown2Action?: string,
        scrollAction?: string,
        scrollCtrlAction?: string,
        fitToScreen?: boolean,
        yScaling?: number,
        dagre?: string
    }) => {
        container: HTMLElement,
        view: { panX: number, panY: number, zoom: number },
        fitToScreen: () => void,
    };
}
