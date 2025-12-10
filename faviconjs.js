/**
 * FaviconJS - Generate ICO files from canvas
 * Based on https://github.com/johnsorrentino/favicon.js
 * Converted to browser-compatible standalone version
 */

(function(global) {
    'use strict';

    // Resize helper class
    class Resize {
        constructor(canvas) {
            this.canvas = canvas;
        }

        generate(width, height) {
            // Clone the canvas first to avoid modifying the original
            let workCanvas = document.createElement('canvas');
            workCanvas.width = this.canvas.width;
            workCanvas.height = this.canvas.height;
            workCanvas.getContext('2d').drawImage(this.canvas, 0, 0);
            this.canvas = workCanvas;

            while (this.canvas.width / 2 >= width) {
                this._resize(this.canvas.width / 2, this.canvas.height / 2);
            }
            if (this.canvas.width > width) {
                this._resize(width, height);
            }
            return this.canvas;
        }

        _resize(width, height) {
            const canvas = document.createElement('canvas');
            const resizedContext = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;
            resizedContext.drawImage(this.canvas, 0, 0, width, height);
            this.canvas = canvas;
        }
    }

    // ICO generator class
    class Ico {
        constructor(canvas) {
            this.canvas = canvas;
        }

        generate(sizes = [16, 32, 48]) {
            const canvasMaster = new Resize(this.canvas).generate(128, 128);
            let iconDirectoryHeader = this.createIconDirectoryHeader(sizes.length);
            let iconDirectoryEntries = '';
            let bitmapData = '';

            for (let i = 0; i < sizes.length; i++) {
                const size = sizes[i];
                const canvas = new Resize(canvasMaster).generate(size, size);
                const width = canvas.width;
                const height = canvas.height;
                const bitmapInfoHeader = this.createBitmapInfoHeader(width, height);
                const bitmapImageData = this.createBitmapImageData(canvas);
                const bitmapSize = bitmapInfoHeader.length + bitmapImageData.length;
                const bitmapOffset = this.calculateBitmapOffset(sizes, i);

                iconDirectoryEntries += this.createIconDirectoryEntry(width, height, bitmapSize, bitmapOffset);
                bitmapData += bitmapInfoHeader + bitmapImageData;
            }

            const binary = iconDirectoryHeader + iconDirectoryEntries + bitmapData;
            const base64 = 'data:image/x-icon;base64,' + btoa(binary);
            return base64;
        }

        calculateBitmapOffset(sizes, entry) {
            let offset = 6; // ICONDIR header size
            offset += 16 * sizes.length; // All ICONDIRENTRY entries

            for (let i = 0; i < entry; i++) {
                const size = sizes[i];
                offset += 40; // BITMAPINFOHEADER
                offset += 4 * size * size; // Pixel data (BGRA)
                offset += 2 * size * size / 8; // AND mask
            }
            return offset;
        }

        createBitmapImageData(canvas) {
            const bitmapMask = new Uint8Array(canvas.width * canvas.height * 2 / 8);
            bitmapMask.fill(0);

            let binary = this.arrayBufferToBinary(this.canvasToBitmap(canvas));
            binary += this.Uint8ArrayToBinary(bitmapMask);
            return binary;
        }

        canvasToBitmap(canvas) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const rgbaData8 = imageData.data;
            const bgraData8 = new Uint8ClampedArray(imageData.data.length);

            // Convert RGBA to BGRA
            for (let i = 0; i < rgbaData8.length; i += 4) {
                const r = rgbaData8[i];
                const g = rgbaData8[i + 1];
                const b = rgbaData8[i + 2];
                const a = rgbaData8[i + 3];
                bgraData8[i] = b;
                bgraData8[i + 1] = g;
                bgraData8[i + 2] = r;
                bgraData8[i + 3] = a;
            }

            const bgraData32 = new Uint32Array(bgraData8.buffer);
            const bgraData32Rotated = new Uint32Array(bgraData32.length);

            // Flip vertically (BMP is bottom-up)
            for (let i = 0; i < bgraData32.length; i++) {
                const xPos = i % canvas.width;
                const yPos = Math.floor(i / canvas.width);
                const xPosRotated = xPos;
                const yPosRotated = canvas.height - 1 - yPos;
                const indexRotated = yPosRotated * canvas.width + xPosRotated;
                bgraData32Rotated[indexRotated] = bgraData32[i];
            }

            return bgraData32Rotated.buffer;
        }

        createIconDirectoryHeader(numImages) {
            const buffer = new ArrayBuffer(6);
            const view = new DataView(buffer);
            view.setUint16(0, 0, true);      // Reserved
            view.setUint16(2, 1, true);      // Type: 1 = ICO
            view.setUint16(4, numImages, true); // Number of images
            return this.arrayBufferToBinary(buffer);
        }

        createIconDirectoryEntry(width, height, size, offset) {
            const buffer = new ArrayBuffer(16);
            const view = new DataView(buffer);
            view.setUint8(0, width);         // Width
            view.setUint8(1, height);        // Height
            view.setUint8(2, 0);             // Color count
            view.setUint8(3, 0);             // Reserved
            view.setUint16(4, 1, true);      // Color planes
            view.setUint16(6, 32, true);     // Bits per pixel
            view.setUint32(8, size, true);   // Size of image data
            view.setUint32(12, offset, true); // Offset to image data
            return this.arrayBufferToBinary(buffer);
        }

        createBitmapInfoHeader(width, height) {
            const buffer = new ArrayBuffer(40);
            const view = new DataView(buffer);
            view.setUint32(0, 40, true);     // Header size
            view.setInt32(4, width, true);   // Width
            view.setInt32(8, 2 * height, true); // Height (doubled for XOR+AND masks)
            view.setUint16(12, 1, true);     // Color planes
            view.setUint16(14, 32, true);    // Bits per pixel
            view.setUint32(16, 0, true);     // Compression
            view.setUint32(20, 0, true);     // Image size
            view.setUint32(24, 0, true);     // X pixels per meter
            view.setUint32(28, 0, true);     // Y pixels per meter
            view.setUint32(32, 0, true);     // Colors used
            view.setUint32(36, 0, true);     // Important colors
            return this.arrayBufferToBinary(buffer);
        }

        arrayBufferToBinary(buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return binary;
        }

        Uint8ArrayToBinary(uint8Array) {
            let binary = '';
            for (let i = 0; i < uint8Array.byteLength; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            return binary;
        }
    }

    // PNG generator class
    class Png {
        constructor(canvas) {
            this.canvas = canvas;
        }

        generate(size) {
            return new Resize(this.canvas).generate(size, size).toDataURL();
        }
    }

    // Main FaviconJS class
    class FaviconJS {
        constructor(canvas) {
            this.canvas = canvas;
        }

        ico(sizes) {
            return new Ico(this.canvas).generate(sizes);
        }

        png(size) {
            return new Png(this.canvas).generate(size);
        }

        bundle() {
            const ico = new Ico(this.canvas);
            const png = new Png(this.canvas);
            return {
                ico: ico.generate([16, 32, 48]),
                png16: png.generate(16),
                png32: png.generate(32),
                png150: png.generate(150),
                png180: png.generate(180),
                png192: png.generate(192),
                png512: png.generate(512)
            };
        }

        resize(size) {
            return new Resize(this.canvas).generate(size, size);
        }
    }

    // Export to global scope
    global.FaviconJS = FaviconJS;

})(typeof window !== 'undefined' ? window : this);
