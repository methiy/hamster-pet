// src/sprites/image-renderer.ts

const SIZE = 128

export class ImageRenderer {
  private ctx: CanvasRenderingContext2D
  private imageData: ImageData | null = null

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2d context')
    ctx.imageSmoothingEnabled = false
    this.ctx = ctx
  }

  /** Draw an HTMLImageElement to the canvas */
  drawFrame(img: HTMLImageElement): void {
    this.ctx.clearRect(0, 0, SIZE, SIZE)
    this.ctx.drawImage(img, 0, 0, SIZE, SIZE)
    // Cache imageData for hit detection
    this.imageData = this.ctx.getImageData(0, 0, SIZE, SIZE)
  }

  /** Get the alpha value of a pixel at (x, y) from the current frame */
  getPixelAlpha(x: number, y: number): number {
    if (!this.imageData) return 0
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return 0
    const i = (y * SIZE + x) * 4
    return this.imageData.data[i + 3]
  }

  /** Clear the canvas to fully transparent */
  clear(): void {
    this.ctx.clearRect(0, 0, SIZE, SIZE)
    this.imageData = null
  }
}
