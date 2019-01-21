import { Injectable, NgZone } from '@angular/core';
import { KnitpaintTool } from './knitpaint-tool';
import { AbstractKnitpaintTool } from './abstract-knitpaint-tool';
import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { KnitpaintCanvasUtils } from '../knitpaint-canvas/knitpaint-canvas-utils';

@Injectable({
  providedIn: 'root'
})
export class MultitouchTransformTool extends AbstractKnitpaintTool implements KnitpaintTool {

  public readonly name = 'Multitouch Transform Tool';
  private setTransform: (transform: SVGMatrix) => void;

  constructor(private ngZone: NgZone) {
    super();
  }

  load(canvas: HTMLCanvasElement, requestRender: () => void, setTransform: (transform: SVGMatrix) => void): void {
    this.setTransform = setTransform;
    this.attachTransformEvents(canvas);
  }

  /**
   * Attaches event handlers to allow scaling and translating the canvas
   *
   * @param canvas
   * Canvas to attach events to
   */
  private attachTransformEvents(canvas: HTMLCanvasElement) {
    this.ngZone.runOutsideAngular(() => {
      // Define methods to translate and scale based on canvas coordinates
      const doTranslate = (transform: SVGMatrix, x: number, y: number): SVGMatrix => {
        return transform.multiply(transform.inverse()).translate(x, y).multiply(transform);
      };
      const doScale = (transform: SVGMatrix, scale: number): SVGMatrix => {
        const scaleCenter = mousePoint.matrixTransform(transform.inverse());
        return KnitpaintCanvasUtils.scaleAroundPoint(transform, scale, scaleCenter);
      };

      // Track the mouse as origin for scaling
      let mousePoint: SVGPoint;
      fromEvent(canvas, 'mousemove').pipe(takeUntil(this.unloadSubject)).subscribe((e: MouseEvent) => {
        mousePoint = KnitpaintCanvasUtils.createSVGPoint(e.offsetX, e.offsetY);
      });

      // Track wheel events for translating and zooming
      fromEvent(canvas, 'wheel').pipe(takeUntil(this.unloadSubject)).subscribe((e: MouseWheelEvent) => {
        e.preventDefault();
        if (e.ctrlKey) {
          const scale = Math.pow(1.015, -e.deltaY);
          this.setTransform(doScale(this.transform, scale));
        } else {
          this.setTransform(doTranslate(this.transform, -e.deltaX * 2, -e.deltaY * 2));
        }
      });

      // Track gestures for translating and zooming in browsers like Safari
      let gestureStartPoint: SVGPoint;
      let gestureStartTransform: SVGMatrix;

      fromEvent(canvas, 'gesturestart').pipe(takeUntil(this.unloadSubject)).subscribe((e: any) => {
        e.preventDefault();
        gestureStartPoint = KnitpaintCanvasUtils.createSVGPoint(e.pageX, e.pageY);
        gestureStartTransform = this.transform.scale(1);
      });

      fromEvent(canvas, 'gesturechange').pipe(takeUntil(this.unloadSubject)).subscribe((e: any) => {
        e.preventDefault();
        let transform = doTranslate(gestureStartTransform, e.pageX - gestureStartPoint.x, e.pageY - gestureStartPoint.y);
        transform = doScale(transform, e.scale);
        this.setTransform(transform);
      });

      fromEvent(canvas, 'gestureend').pipe(takeUntil(this.unloadSubject)).subscribe((e: any) => {
        e.preventDefault();
      });
    });
  }
}
