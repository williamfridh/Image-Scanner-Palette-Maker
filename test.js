/**
 * 
 */
function getPalette(picture, scale, amountToPick, minCoverage, paletteElement) {
    console.log('getPalette');

    // Downscale the picture
    const context = downscale(picture, scale);

    // Extract the pixels from the canvas
    const pixels = extractPixels(context);

    // Find the X most common colors
    const mostCommonColors = findMostCommonColors(context, pixels, amountToPick, minCoverage);

    // Print out the palette to the document
    printPalette(mostCommonColors, paletteElement);
}

/**
 * Print out the palette to the document.
 */
function printPalette(palette, paletteElement) {
    console.log('printPalette');
    console.log(palette);

    // Clear the element
    paletteElement.innerHTML = '';

    // Loop over each color in the palette
    for (const color of palette) {
        // Create a div element
        const div = document.createElement('div');
        div.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

        // Write the color to the div
        const text = document.createTextNode(`rgb(${color[0]}, ${color[1]}, ${color[2]})`);
        div.appendChild(text);

        // Append the div to the document
        paletteElement.appendChild(div);
    }
}

/**
 * Takes a given picture and downscale it using canvas.
 * 
 * @param {string} picture - The picture to downscale.
 * @param {number} scale - The scale to downscale the picture.
 * @returns {CanvasRenderingContext2D} - The canvas context of the downscaled picture.
 */
function downscale(picture, scale) {
    console.log('downscale');

    // Calculate new dimensions
    const width = picture.width * scale;
    const height = picture.height * scale;

    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    // No impage improvement needed

    // Draw the picture on the canvas
    context.drawImage(picture, 0, 0, width, height);

    // Draw the canvas on the document
    document.body.appendChild(canvas);

    // Return the canvas context
    return context;
}

/**
 * Generates a 3d array of size 256, 256, 256 of zeros.
 * Then it loops over each pixel of the provided canvas context and
 * increments the corresponding value in the 3d array.
 * 
 * @param {CanvasRenderingContext2D} context - The canvas context to extract the pixels from.
 * @returns {number[][][]} - The 3d array of pixels.
 */
function extractPixels(context) {
    console.log('extractPixels');

    // Create a 3d array of zeros
    const pixels = new Array(256).fill(0).map(() => new Array(256).fill(0).map(() => new Array(256).fill(0)));

    // Get the image data from the canvas
    const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);

    // Loop over each pixel
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];

        // Increment the corresponding value in the 3d array
        pixels[r][g][b]++;
    }

    return pixels;
}

/**
 * Search trough the 3d array of pixels and find the X most common colors
 * and return those as a new array in the format [r, g, b].
 * 
 * @param {CanvasRenderingContext2D} context - The canvas context of the picture.
 * @param {number[][][]} pixels - The 3d array of pixels.
 * @param {number} amountToPick - The amount of colors to pick.
 * @param {number} minCoverage - The minimum coverage of the color in the picture.
 */
function findMostCommonColors(context, pixels, amountToPick, minCoverage) {

    console.log('findMostCommonColors');
    
    // Get amount of pixels in the picture
    const pixelAmount = context.canvas.width * context.canvas.height;
    
    // Loop trough the 3d array and create a new array of objects
    // with the colors and the amount of pixels of that color,
    // but only include colors with more than 0 pixels to speed
    // up the process.
    let colors = [];
    for (let r = 0; r < pixels.length; r++) {
        for (let g = 0; g < pixels[r].length; g++) {
            for (let b = 0; b < pixels[r][g].length; b++) {
                const amount = pixels[r][g][b];
                if (amount > 0) {
                    colors.push({ r, g, b, amount, score: 0 });
                }
            }
        }
    }
    
    console.log(`Given colors: `, colors);

    // Calculate the man distance between two colors to shrink the color space.
    let maxColorSpaceDistance = 0;
    for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
            const maxDistance = calculateDistance([colors[i].r, colors[i].g, colors[i].b], [colors[j].r, colors[j].g, colors[j].b]);
            if (maxDistance > maxColorSpaceDistance) {
                maxColorSpaceDistance = maxDistance;
            }
        }
    }
    console.log(`maxColorSpaceDistance: ${maxColorSpaceDistance}`);

    // Sort the array by the amount of pixels of each color
    colors.sort((a, b) => b.amount - a.amount);

    const bundleDistance = maxColorSpaceDistance / (amountToPick * (maxColorSpaceDistance / 443.405));
    console.log(`bundleDistance: ${bundleDistance}`);

    // Bundle/merge colors that are close to each other and merge the second color into the first color
    for (let i = 0; i < colors.length; i++) {
        let mergedColors = 0;
        for (let j = i + 1; j < colors.length; j++) {
            if (calculateDistance([colors[i].r, colors[i].g, colors[i].b], [colors[j].r, colors[j].g, colors[j].b]) < bundleDistance) {
                colors[i].amount += colors[j].amount;
                //colors[i].r += colors[j].r;
                //colors[i].g += colors[j].g;
                //colors[i].b += colors[j].b;
                colors.splice(j, 1);
                j--;
                mergedColors++;
            }
        }
        //colors[i].r /= mergedColors + 1;
        //colors[i].g /= mergedColors + 1;
        //colors[i].b /= mergedColors + 1;
        colors[i].amount = Math.log(colors[i].amount);
    }

    console.log(`Colors after bundeling: `, colors);

    // Find colorSpaceCenter of color space
    let colorSpaceCenter = [0, 0, 0];
    let count = 0;
    for (let r = 0; r < pixels.length; r++) {
        for (let g = 0; g < pixels[r].length; g++) {
            for (let b = 0; b < pixels[r][g].length; b++) {
                const amount = pixels[r][g][b];
                if (amount > 0) {
                    colorSpaceCenter[0] += r * amount;
                    colorSpaceCenter[1] += g * amount;
                    colorSpaceCenter[2] += b * amount;
                    count += amount;
                }
            }
        }
    }
    colorSpaceCenter[0] /= count;
    colorSpaceCenter[1] /= count;
    colorSpaceCenter[2] /= count;

    console.log(`colorSpaceCenter: ${colorSpaceCenter}`);

    /*if (minCoverage > 0)
        colors = colors.filter(color => color.amount >= minCoverage * pixelAmount);
    console.log(`Colors after minCoverage:`, colors);*/


    // Increase the score based of the distance from all other colors divided by the colorSpaceCenter
    /*for (let i = 0; i < colors.length; i++) {
        // Calculate total distance from all other colors
        let totalDistance = 0;
        for (const color of colors) {
            totalDistance += calculateDistance([colors[i].r, colors[i].g, colors[i].b], [color.r, color.g, color.b]);
        }
        totalDistance /= colors.length;
        // Increase the score based of the distance from the colorSpaceCenter
        colors[i].score += Math.exp(colors[i].amount * totalDistance);
    }*/

    //console.log(`Colors after increasing score of colors close to colorSpaceCenter:`, colors);

    // Calculate total amount.
    let totalAmount = 0;
    for (const color of colors) {
        totalAmount += color.amount;
    }

    if (minCoverage > 0)
        colors = colors.filter(color => color.amount >= minCoverage * totalAmount);
    console.log(`Colors after minCoverage:`, colors);

    // Add bonus score based on the distance from the colorSpaceCenter
    for (let i = 0; i < colors.length; i++) {
        let totalDistance = 0;
        for (const color of colors) {
            totalDistance += calculateDistance([colors[i].r, colors[i].g, colors[i].b], [color.r, color.g, color.b]);
        }
        totalDistance /= colors.length;

        // Increase the score based of the distance from the colorSpaceCenter
        //colors[i].score += Math.log(1 + colors[i].amount)
        colors[i].score += Math.log(1 + totalDistance * colors[i].amount) * (443.405 / maxColorSpaceDistance);
        //if (colors[i].amount >= minCoverage * pixelAmount)
        //colors[i].score += (1 - colors[i].amount / pixelAmount) * Math.exp(distance * 0.2);
    }

    // Reorder the array
    colors.sort((a, b) => b.score - a.score);

    // Make space for other colors of any are close to the top and black or white has been included
    if (calculateDistance([colors[0].r, colors[0].g, colors[0].b], [0, 0, 0]) < 20)
        colors.splice(amountToPick-1, 1);
    if (calculateDistance([colors[0].r, colors[0].g, colors[0].b], [255, 255, 255]) < 20)
        colors.splice(amountToPick-1, 1);

    // Slice the array to the X most common colors
    colors = colors.slice(0, amountToPick);
    
    console.log(`Colors after sorting: `, colors);

    // Return the X most common colors
    return colors.map(color => [color.r, color.g, color.b]);
}

/**
 * Calculate the distance between two colors.
 * 
 * @param {number[]} color1 - The first color.
 * @param {number[]} color2 - The second color.
 * @returns {number} - The distance between the two colors.
 */
function calculateDistance(color1, color2) {
    //console.log('calculateDistance');

    const r = color1[0] - color2[0];
    const g = color1[1] - color2[1];
    const b = color1[2] - color2[2];

    return Math.sqrt(r * r + g * g + b * b);
}

