import { $, on, rgbaOffset } from './helpers.js';
import KernelDitherer from './kernel-ditherer.js';
import { sobelEdgeDetection } from './edge-detection.js';

// Braille symbol is 2x4 dots
const asciiXDots = 2, asciiYDots = 4;

const ditherers = {
    threshold: new KernelDitherer([0, 0], [], 1),
    floydSteinberg: new KernelDitherer([1, 0], [
        [0, 0, 7],
        [3, 5, 1],
    ], 16),
    stucki: new KernelDitherer([2, 0], [
        [0, 0, 0, 8, 4],
        [2, 4, 8, 4, 2],
        [1, 2, 4, 2, 1],
    ], 42),
    atkinson: new KernelDitherer([1, 0], [
        [0, 0, 1, 1],
        [1, 1, 1, 0],
        [0, 1, 0, 0],
    ], 8),
    burkes: new KernelDitherer([2, 0], [
        [0, 0, 0, 8, 4],
        [2, 4, 8, 4, 2],
    ], 32),
    sierra: new KernelDitherer([2, 0], [
        [0, 0, 0, 5, 3],
        [2, 4, 5, 4, 2],
        [0, 2, 3, 2, 0],
    ], 32),
    jarvisJudiceNinke: new KernelDitherer([2, 0], [
        [0, 0, 0, 7, 5],
        [3, 5, 7, 5, 3],
        [1, 3, 5, 3, 1],
    ], 48),
    ordered3x3: new KernelDitherer([0, 0], [
        [1, 7, 4],
        [5, 8, 3],
        [6, 2, 9],
    ], 9),
    ordered4x4: new KernelDitherer([0, 0], [
        [1, 9, 3, 11],
        [13, 5, 15, 7],
        [4, 12, 2, 10],
        [16, 8, 14, 6],
    ], 17),
    random: {
        dither(pixels, threshold) {
            for (let i = 0; i < pixels.data.length; i += 4) {
                const avg = (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
                const rand = Math.random() * 255;
                const value = avg < rand ? 0 : 255;
                pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
            }
            return pixels;
        }
    },
    sobelEdge: {
        dither(pixels, threshold) {
            return sobelEdgeDetection(pixels, threshold);
        }
    }
};

let dithererName = 'floydSteinberg', invert = false, threshold = 127, asciiWidth = 100, asciiHeight = 100;
let image;
let canvas = document.createElement('canvas');
let context = canvas.getContext('2d');
let ascii = '';

on(document, 'DOMContentLoaded', function (e) {
    on($('#filepicker'), 'change', async function () {
        if (!this.files || !this.files.length) return;
        image = document.createElement('img');
        image.src = URL.createObjectURL(this.files[0]);
        await new Promise(resolve => on(image, 'load', resolve));
        render();
    });

    on($('#dither'), 'change', function () {
        let newValue = this.value;
        if (newValue == dithererName) return;
        dithererName = newValue;
        render();
    });

    on($('#threshold'), 'change', function () {  // Changed from 'change' to 'input' for real-time updates
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
    let asciiText = [];
    let asciiHtml = [];

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
        const line = [];
        for (let x = 0; x < canvas.width; x += asciiXDots) {
            // Braille Unicode range starts at U2800 (= 10240 decimal)
            line.push(10240
                + (+(ditheredPixels.data[rgbaOffset(x + 1, y + 3, canvas.width)] === targetValue) << 7)
                + (+(ditheredPixels.data[rgbaOffset(x + 0, y + 3, canvas.width)] === targetValue) << 6)
                + (+(ditheredPixels.data[rgbaOffset(x + 1, y + 2, canvas.width)] === targetValue) << 5)
                + (+(ditheredPixels.data[rgbaOffset(x + 1, y + 1, canvas.width)] === targetValue) << 4)
                + (+(ditheredPixels.data[rgbaOffset(x + 1, y + 0, canvas.width)] === targetValue) << 3)
                + (+(ditheredPixels.data[rgbaOffset(x + 0, y + 2, canvas.width)] === targetValue) << 2)
                + (+(ditheredPixels.data[rgbaOffset(x + 0, y + 1, canvas.width)] === targetValue) << 1)
                + (+(ditheredPixels.data[rgbaOffset(x + 0, y + 0, canvas.width)] === targetValue) << 0));
        }
        const lineChars = String.fromCharCode(...line);
        asciiText.push(lineChars);
        asciiHtml.push(lineChars.split('').map(char => `<span>${char}</span>`).join(''));
    }

    ascii = asciiText.join('\n');
    $('#char-count').textContent = ascii.length.toLocaleString();
    let output = $('#output');
    output.style.display = 'block';
    output.innerHTML = '';
    output.insertAdjacentHTML('afterbegin', asciiHtml.join('<br>'));
}
