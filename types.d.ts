declare module "fused-canvas" {
    export interface FusedCanvas {
        container: HTMLElement;
        view: {
            panX: number;
            panY: number;
            zoom: number;
        };
        fitToScreen: () => void;
    }

    export function createFusedCanvas(options: {
        viewport: HTMLElement;
        canvas: HTMLElement;
        mouseDown0Action?: string;
        mouseDown1Action?: string;
        mouseDown2Action?: string;
        scrollAction?: string;
        scrollCtrlAction?: string;
        fitToScreen?: boolean;
        yScaling?: number;
        arrowLength?: number;
        arrowPitch?: number;
        dagre?: string;
        onNewBox: (x: any) => void;
    }): FusedCanvas;
}
