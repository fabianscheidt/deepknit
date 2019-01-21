import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Knitpaint } from '../knitpaint';
import { KnitpaintTool } from '../knitpaint-tools/knitpaint-tool';
import { KnitpaintCanvasUtils } from './knitpaint-canvas-utils';

@Component({
  selector: 'app-knitpaint-canvas',
  templateUrl: './knitpaint-canvas.component.html',
  styleUrls: ['./knitpaint-canvas.component.scss']
})
export class KnitpaintCanvasComponent implements AfterViewInit, OnChanges {

  @Input() knitpaint: Knitpaint;
  @Output() readonly knitpaintChanged: EventEmitter<Knitpaint> = new EventEmitter<Knitpaint>();
  @Input() activeTools: KnitpaintTool[] = [];

  @ViewChild('canvas') private canvas: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D;

  // Current view transformation
  private transform: SVGMatrix;

  constructor() {}

  /**
   * Prepares the canvas
   */
  ngAfterViewInit() {
    // Get a reference to the canvas context
    this.ctx = this.canvas.nativeElement.getContext('2d');

    // Reset transformations
    this.resetTransform();

    // Render
    this.renderCanvas();
  }

  /**
   * Updates cached values and notifies tools whenever inputs change
   *
   * @param changes
   */
  ngOnChanges(changes: SimpleChanges) {
    // Update knitpaint
    if (changes['knitpaint'] && this.knitpaint) {
      this.setKnitpaint(this.knitpaint);
    }

    // Allow proper change of tools
    if (changes['activeTools']) {
      const prev = <KnitpaintTool[]>changes['activeTools'].previousValue;
      const curr = <KnitpaintTool[]>changes['activeTools'].currentValue;
      this.changeTools(prev, curr);
    }
  }

  /**
   * Sets a new knitpaint object and makes sure that tools are informed
   *
   * @param knitpaint
   */
  private setKnitpaint(knitpaint: Knitpaint) {
    // Set new knitpaint
    this.knitpaint = knitpaint;

    // Notify tools about the change
    for (const tool of this.activeTools) {
      if (tool.knitpaintAvailable) {
        tool.knitpaintAvailable(this.knitpaint);
      }
    }

    // Render
    this.renderCanvas();

    // Notify others
    this.knitpaintChanged.emit(this.knitpaint);
  }

  /**
   * Sets a new view transformations matrix and makes sure that tools are informed
   *
   * @param transform
   */
  private setTransform(transform: SVGMatrix) {
    // Set the new matrix
    this.transform = transform;

    // Notify tools
    for (const tool of this.activeTools) {
      if (tool.transformAvailable) {
        tool.transformAvailable(this.transform);
      }
    }

    // Render the canvas
    this.renderCanvas();
  }

  /**
   * Sets a new set of tools and calls the appropriate load and unload methods
   *
   * @param prevTools
   * @param currTools
   */
  private changeTools(prevTools: KnitpaintTool[], currTools: KnitpaintTool[]) {
    prevTools = prevTools || [];
    currTools = currTools || [];
    let needsRender = false;

    // Unload old tools
    for (const prevTool of prevTools) {
      if (currTools.indexOf(prevTool) === -1 && prevTool.unload) {
        if (prevTool.render) {
          needsRender = true;
        }
        prevTool.unload();
      }
    }

    // Load new tools
    for (const currTool of currTools) {
      if (prevTools.indexOf(currTool) === -1) {
        if (currTool.load) {
          currTool.load(
            this.canvas.nativeElement,
            () => this.renderCanvas(),
            (knitpaint: Knitpaint) => this.setKnitpaint(knitpaint),
            (transform: SVGMatrix) => this.setTransform(transform));
        }
        if (currTool.transformAvailable) {
          currTool.transformAvailable(this.transform);
        }
        if (currTool.knitpaintAvailable) {
          currTool.knitpaintAvailable(this.knitpaint);
        }
        if (currTool.render) {
          needsRender = true;
        }
      }
    }

    // Render to clean paintings from old tools and allow new tools to draw
    if (needsRender) {
      this.renderCanvas();
    }
  }

  /**
   * Resets the view transformation to be centered and fit the canvas
   */
  public resetTransform() {
    const canvasWidth = this.canvas.nativeElement.offsetWidth;
    const canvasHeight = this.canvas.nativeElement.offsetHeight;
    const knitpaintWidth = this.knitpaint.width;
    const knitpaintHeight = this.knitpaint.height;
    this.setTransform(KnitpaintCanvasUtils.createResetSVGMatrix(canvasWidth, canvasHeight, knitpaintWidth, knitpaintHeight));
  }

  /**
   * Renders the canvas with the knitpaint and optionally the grid
   */
  private renderCanvas() {
    console.log('Rendering Knitpaint Canvas');
    if (!this.canvas || !this.canvas.nativeElement || !this.ctx) {
      console.warn('Knitpaint canvas not ready for drawing');
      return;
    }

    // Make sure that the canvas is set to its own dimensions
    this.canvas.nativeElement.width = this.canvas.nativeElement.offsetWidth;
    this.canvas.nativeElement.height = this.canvas.nativeElement.offsetHeight;

    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

    // Transform canvas according to current view state
    this.ctx.save();
    this.ctx.transform(this.transform.a, this.transform.b, this.transform.c, this.transform.d, this.transform.e, this.transform.f);

    // Draw pixels as image
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.knitpaint.getImage(), 0, 0);
    this.ctx.restore();

    // Allow the active tools to render something
    for (const tool of this.activeTools) {
      if (tool.render) {
        tool.render(this.ctx, this.transform);
      }
    }
  }

}
