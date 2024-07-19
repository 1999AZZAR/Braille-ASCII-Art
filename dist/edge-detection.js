// edge-detection.js

export function sobelEdgeDetection(imageData, threshold = 127, invert = false) {
    const width = imageData.width;
    const height = imageData.height;
    const outputData = new ImageData(width, height);

    // Sobel kernels
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pixelX = 0;
            let pixelY = 0;

            for (let offsetY = -1; offsetY <= 1; offsetY++) {
                for (let offsetX = -1; offsetX <= 1; offsetX++) {
                    const pixelIndex = ((y + offsetY) * width + (x + offsetX)) * 4;
                    const pixel = imageData.data[pixelIndex];

                    pixelX += pixel * sobelX[offsetY + 1][offsetX + 1];
                    pixelY += pixel * sobelY[offsetY + 1][offsetX + 1];
                }
            }

            const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
            const normalizedMagnitude = Math.min(255, Math.max(0, magnitude));

            let edgePixel = normalizedMagnitude > threshold ? 255 : 0;
            if (invert) {
                edgePixel = 255 - edgePixel;
            }

            const outputIndex = (y * width + x) * 4;
            outputData.data[outputIndex] = edgePixel;
            outputData.data[outputIndex + 1] = edgePixel;
            outputData.data[outputIndex + 2] = edgePixel;
            outputData.data[outputIndex + 3] = 255;  // Alpha channel
        }
    }

    return outputData;
}
