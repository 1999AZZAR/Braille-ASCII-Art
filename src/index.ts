import { $, rgbaOffset } from './helpers.js';
import KernelDitherer from './kernel-ditherer.js';

// Braille symbol is 2x4 dots
const asciiXDots = 2,
    asciiYDots = 4;

type DithererName = 'threshold' | 'floydSteinberg' | 'stucki' | 'atkinson' | 'bayer' | 'burkes' | 'sierra' | 'jarvisJudiceNinke' | 'ordered3x3' | 'ordered4x4' | 'random' | 'sobelEdge';

interface Ditherer {
    dither(pixels: ImageData, threshold: number): ImageData;
}

class SobelEdgeDitherer implements Ditherer {
    dither(pixels: ImageData, threshold: number): ImageData {
        const width = pixels.width;
        const height = pixels.height;
        const sobelData = new ImageData(width, height);
        const grayscale = new Uint8ClampedArray(width * height);

        for (let i = 0; i < pixels.data.length; i += 4) {
            const avg = (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
            grayscale[i / 4] = avg;
        }

        const sobelKernelX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];

        const sobelKernelY = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1]
        ];

        const convolve = (x: number, y: number, kernel: number[][]): number => {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const px = x + kx;
                    const py = y + ky;
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        sum += grayscale[py * width + px] * kernel[ky + 1][kx + 1];
                    }
                }
            }
            return sum;
        };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const gx = convolve(x, y, sobelKernelX);
                const gy = convolve(x, y, sobelKernelY);
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const edgeValue = magnitude > threshold ? 255 : 0;

                const index = (y * width + x) * 4;
                sobelData.data[index] = edgeValue;
                sobelData.data[index + 1] = edgeValue;
                sobelData.data[index + 2] = edgeValue;
                sobelData.data[index + 3] = 255;
            }
        }
        return sobelData;
    }
}

class RandomDitherer implements Ditherer {
    dither(pixels: ImageData, threshold: number): ImageData {
        for (let i = 0; i < pixels.data.length; i += 4) {
            const gray = pixels.data[i];
            const random = Math.random() * 255;
            const value = gray < random ? 0 : 255;

            pixels.data[i] = value;
            pixels.data[i + 1] = value;
            pixels.data[i + 2] = value;
        }
        return pixels;
    }
}

const ditherers: Record<DithererName, Ditherer> = {
    threshold: new KernelDitherer(
        [0, 0],
        [],
        1,
    ),
    floydSteinberg: new KernelDitherer(
        [1, 0],
        [
            [0, 0, 7],
            [3, 5, 1],
        ],
        16,
    ),
    stucki: new KernelDitherer(
        [2, 0],
        [
            [0, 0, 0, 8, 4],
            [2, 4, 8, 4, 2],
            [1, 2, 4, 2, 1],
        ],
        42,
    ),
    atkinson: new KernelDitherer(
        [1, 0],
        [
            [0, 0, 1, 1],
            [1, 1, 1, 0],
            [0, 1, 0, 0],
        ],
        8,
    ),
    burkes: new KernelDitherer(
        [2, 0],
        [
            [0, 0, 0, 8, 4],
            [2, 4, 8, 4, 2],
        ],
        32,
    ),
    sierra: new KernelDitherer(
        [2, 0],
        [
            [0, 0, 0, 5, 3],
            [2, 4, 5, 4, 2],
            [0, 2, 3, 2, 0],
        ],
        32,
    ),
    jarvisJudiceNinke: new KernelDitherer(
        [2, 0],
        [
            [0, 0, 0, 7, 5],
            [3, 5, 7, 5, 3],
            [1, 3, 5, 3, 1],
        ],
        48,
    ),
    ordered3x3: new KernelDitherer(
        [1, 0],
        [
            [0, 1, 0],
            [1, 0, 1],
            [0, 1, 0],
        ],
        1,
    ),
    ordered4x4: new KernelDitherer(
        [1, 0],
        [
            [0, 2, 1, 3],
            [2, 0, 3, 1],
            [1, 3, 0, 2],
            [3, 1, 2, 0],
        ],
        1,
    ),
    random: new RandomDitherer(),
    sobelEdge: new SobelEdgeDitherer()
};


let dithererName: DithererName = 'floydSteinberg',
    invert = false,
    threshold = 127,
    asciiWidth = 100,
    asciiHeight = 100;

let image: HTMLImageElement;
let canvas = document.createElement('canvas');
let context = canvas.getContext('2d')!;
let ascii = '';

on(document, 'DOMContentLoaded', function (e) {

    on($('#filepicker'), 'change', async function () {
        if (!this.files || !this.files.length) return;

        image = document.createElement('img');
        image.src = URL.createObjectURL(this.files[0].slice(0));
        await new Promise(resolve => on(image, 'load', resolve));

        render();
    });

    on($('#dither'), 'change', function () {
        let newValue = this.value as DithererName;
        if (newValue == dithererName) return;
        dithererName = newValue;
        render();
    });

    on($('#threshold'), 'change', function () {
        let newValue = parseInt(this.value);
        if (newValue == threshold) return;
        threshold = newValue;
        render();
    });

    on($('#width'), 'input', function () {
        let newValue = parseInt(this.value);
        if (newValue == asciiWidth || newValue < 1) return;
        asciiWidth = newValue;
        render();
    });

    on($('#invert'), 'change', function () {
        invert = this.checked;
        document.body.classList.toggle('invert', invert);
        render();
    });

    on($('#copy'), 'click', function () {
        navigator.clipboard.writeText(ascii);
        const oldText = this.textContent;
        this.textContent = 'Copied!';
        setTimeout(() => this.textContent = oldText, 1000);
    });

    on($('#font-size'), 'input', function () {
        document.documentElement.style.setProperty('--font-size', `${this.value}px`);
    });

});

async function render() {
    let asciiText: string[] = [];
    let asciiHtml: string[] = [];

    if (!image) return;

    asciiHeight = Math.ceil(asciiWidth * asciiXDots * (image.height / image.width) / asciiYDots);
    document.documentElement.style.setProperty('--width', asciiWidth.toString());
    document.documentElement.style.setProperty('--height', asciiHeight.toString());

    canvas.width = asciiWidth * asciiXDots;
    canvas.height = asciiHeight * asciiYDots;

    // Fill the canvas with white
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the image as greyscale
    context.globalCompositeOperation = 'luminosity';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const ditherer = ditherers[dithererName];

    const greyPixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const ditheredPixels = ditherer.dither(greyPixels, threshold);
    const targetValue = invert ? 255 : 0;

    for (let y = 0; y < canvas.height; y += asciiYDots) {
        const line: number[] = [];
        for (let x = 0; x < canvas.width; x += asciiXDots) {
            // Braille Unicode range starts at U2800 (= 10240 decimal)
            // Each of the eight dots is mapped to a bit in a byte which
            // determines its position in the range.
            // https://en.wikipedia.org/wiki/Braille_Patterns
            line.push(
                10240
                + (+(ditheredPixels.data.at(rgbaOffset(x + 1, y + 3, canvas.width)) === targetValue) << 7)
                + (+(ditheredPixels.data.at(rgbaOffset(x + 0, y + 3, canvas.width)) === targetValue) << 6)
                + (+(ditheredPixels.data.at(rgbaOffset(x + 1, y + 2, canvas.width)) === targetValue) << 5)
                + (+(ditheredPixels.data.at(rgbaOffset(x + 1, y + 1, canvas.width)) === targetValue) << 4)
                + (+(ditheredPixels.data.at(rgbaOffset(x + 1, y + 0, canvas.width)) === targetValue) << 3)
                + (+(ditheredPixels.data.at(rgbaOffset(x + 0, y + 2, canvas.width)) === targetValue) << 2)
                + (+(ditheredPixels.data.at(rgbaOffset(x + 0, y + 1, canvas.width)) === targetValue) << 1)
                + (+(ditheredPixels.data.at(rgbaOffset(x + 0, y + 0, canvas.width)) === targetValue) << 0)
            );
        }
        const lineChars = String.fromCharCode.apply(String, line);
        asciiText.push(lineChars);
        asciiHtml.push(lineChars.split('').map(char => `<span>${char}</span>`).join(''));
    }

    ascii = asciiText.join('\n');

    $('#char-count')!.textContent = ascii.length.toLocaleString();

    let output = $('#output')!;
    output.style.display = 'block';
    output.innerHTML = '';
    output.insertAdjacentHTML('afterbegin', asciiHtml.join('<br>'));
}
