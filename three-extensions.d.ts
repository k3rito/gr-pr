declare module "three/examples/jsm/loaders/SVGLoader" {
  import { Loader, LoadingManager, Shape, ShapePath } from "three";

  export interface SVGResult {
    paths: ShapePath[];
    xml: SVGElement;
  }

  export class SVGLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (data: SVGResult) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (event: unknown) => void,
    ): void;
    parse(text: string): SVGResult;
    static createShapes(path: ShapePath): Shape[];
  }
}
