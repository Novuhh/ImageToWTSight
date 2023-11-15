const wTSightHeight = 1;
const wTSightWidth = 1.78;
const wTSightLineLimit = 2500;


/**
 * Convert a SVG string into indiviudal lines and bezier curves
 * 
 * @param {String} svg - The svg input to extract lines and beziers from
 * 
 * @returns [lines[], beziers[]]
 */
function SVGToLinesAndBeziers(svg)
{
    // Extract just the path from the SVG input
    const pathStart = svg.indexOf(`d="`, svg.indexOf("<path")) + 3;
    const pathEnd = svg.indexOf('"', pathStart);
    const path = svg.substring(pathStart, pathEnd);

    let x0 = 0;
    let y0 = 0;
    let xEnd, yEnd, x1, y1, x2, y2;
    let lines = [];
    let beziers = [];
    let segments = path.split(/(?=M|L|C)/g);
    for(const segment of segments)
    {
        // Break down each command into its type and coordinates
        let pathParts = segment.trim().split(' ');
        let command = pathParts.splice(0,1)[0];
        let coords = pathParts.map((x) => parseFloat(x));

        // let command = segment[0];
        // let coords = segment.substring(1).split(' ').map((x) => parseFloat(x));

        // Move to command
        if(command == 'M')
        {
            [xEnd, yEnd] = coords;
        }
        // Line command 2 lines to make 
        // line from starting point to mid point
        // line from mid point to ending point
        else if(command == 'L')
        {
            [x1, y1, xEnd, yEnd] = coords;
            lines.push([x0, y0, x1, y1]);
            lines.push([x1, y1, xEnd, yEnd]);
        }
        // Bezier curve command make 1 curve, break into lines later
        // curve with points start, mid, mid2, end
        else if(command == 'C')
        {
            [x1, y1, x2, y2, xEnd, yEnd] = coords;
            beziers.push([x0, y0, x1, y1, x2, y2, xEnd, yEnd])
        }
        // No support for other svg commands at this time
        else
        {
            continue;
        }
        x0 = xEnd;
        y0 = yEnd;
    }

    return [lines, beziers];
}
module.exports.SVGToLinesAndBeziers = SVGToLinesAndBeziers;


/**
 * Convert the lines and beziers into an SVG to display.
 * 
 * @param {Number[][]} lines - Array of line segments where each line is an array with [x0, y0, x1, y1] values.
 * @param {Number} width [wTSightWidth] - The width of the svg
 * @param {Number} height [wTSightHeight] - The hight of the svg
 * 
 * @returns A SVG file
 */
function LinesAndBeziersToSVG(lines = [], width = wTSightWidth, height = wTSightHeight)
{
    const svgBegin = `<svg xmlns="http://www.w3.org/2000/svg" height="100%" viewBox="0 0 ${width} ${height}" version="1.1">`;
    const svgEnd = `</svg>`;
    const pathBegin = `<path d="`;
    const pathEnd = `" stroke="black" fill="none" fill-rule="evenodd"></path>`
    const scale = height / 1;
    let pathParts = [];

    let prevX = null;
    let prevY = null;
    for(const line of lines)
    {
        let [x0, y0, x1, y1] = line;
        x0 = (x0 * scale) + (width / 2);
        y0 = (y0 * scale) + (height / 2);
        x1 = (x1 * scale) + (width / 2);
        y1 = (y1 * scale) + (height / 2);
        
        if(x0 === prevX && y0 === prevY)
        {
            pathParts.push(`L ${x1} ${y1}`);
        }
        else
        {
            pathParts.push(`M ${x0} ${y0} L ${x1} ${y1}`);
        }

        prevX = x1;
        prevY = y1;
    }

    return svgBegin + pathBegin + pathParts.join(' ') + pathEnd + svgEnd;
}
module.exports.LinesAndBeziersToSVG = LinesAndBeziersToSVG;


/**
 * Apply offsets, scaling, and rotation to the lines
 * 
 * @param {Number[][]} lines - Array of line segments where each line is an array with [x0, y0, x1, y1] values.
 * @param {Number} options.xOffset [0] - Move lines by x amount
 * @param {number} options.yOffset [0] - Move lines by y amount
 * @param {Number} options.xScale [1] - Scale lines x amount
 * @param {Number} options.yScale [1] - Scale lines y amount
 * @param {Number} options.rotation [0] - Rotate lines by amount
 * 
 * @returns Array of line segments where each line is an array with [x0, y0, x1, y1] values.
 */
function ApplyLinesTranformation(lines = [], options = {xOffset: 0, yOffset: 1, xScale: 1, yScale: 0, rotation: 0})
{
    if(lines.length == 0)
    {
        return [];
    }

    console.log(options["xOffset"], options["yOffset"], options["xScale"], options["yScale"], options["rotation"]);

    if(options["xOffset"] != 0 || options["yOffset"] != 0)
    {
        lines = OffsetLines(lines, {xOffset: options["xOffset"], yOffset: options["yOffset"]})
    }

    if(options["xScale"] != 1 || options["yScale"] != 1)
    {
        lines = ScaleLines(lines, {xScale: options["xScale"], yScale: options["yScale"]})
    }

    if(options["rotation"] != 0)
    {
        lines = RotateLines(lines, options["rotation"]);
    }

    return lines;
}
module.exports.ApplyLinesTranformation = ApplyLinesTranformation;


/**
 * Calculate the distance of a line
 * 
 * @param {Number[]} line - Line as an array of [x0, y0, x1, y1] values
 * 
 * @returns {Number} Distance beween the given coodinates
 */
function LineDistance(line = [0,0,0,0])
{
    const [x0, y0, x1, y1] = line;
    return Math.sqrt(Math.pow(x1 - x0, 2) +  Math.pow(y1 - y0, 2));
}


/**
 * Calculate the total distance of the bezier curve
 * 
 * @param {Number[]} curve - An array with [x0, y0, x1, y1, x2, y2, x3, y3] values.
 * 
 * @returns {Number} The total distance of the bezier curve
 */
function CurveDistance(curve)
{
    // Break the curve down each of its coordinate pairs and sum up the distance
    const [x0, y0, x1, y1, x2, y2, x3, y3] = curve;
    return LineDistance([x0, y0, x1, y1]) + LineDistance([x1, y1, x2, y2]) + LineDistance([x2, y2, x3, y3]);
}


// https://en.wikipedia.org/wiki/B%C3%A9zier_curve
// {\displaystyle \mathbf {B} (t)=(1-t)^{3}\mathbf {P} _{0}+3(1-t)^{2}t\mathbf {P} _{1}+3(1-t)t^{2}\mathbf {P} _{2}+t^{3}\mathbf {P} _{3},\ 0\leq t\leq 1.}

/**
 * Break down each bezier curve into line segments while keeping as much detail as possible over all segments
 * 
 * @param {Number[][]} bezierCurves - An array of bezier curves where each curve is an array with [x0, y0, x1, y1, x2, y2, x3, y3] values.
 * @param {Number} options.maxLines [War Thunder Limit] - The maxium number of lines over all curves to not exceed.
 * @param {Number} options.maxSegments [0] - The maxium amount of line segments to break a curve into. If 0 then just max out the number of lines with as many segments needed.
 * 
 * @returns {Number[][]} - Array of line segments where each line is an array with [x0, y0, x1, y1] values.
 */
function BezierCurvesToLines(bezierCurves, options = {})
{
    // If no lines are inputed
    if(bezierCurves == null || bezierCurves.length == 0) { return []; }
    // If no number for max lines is specifed or invalid then default to war thunder limit
    const maxLines = (options["maxLines"] == null || options["maxLines"] <= 0) ? wTSightLineLimit : options["maxLines"];

    // If 0 then just max out the number of lines with as many segments needed.
    const maxSegments = (options["maxSegments"] == null || options["maxSegments"] == 0) ? Math.ceil(maxLines / bezierCurves.length) : options["maxSegments"];

    // Take the incoming curves and put them in a dictionary with the curve itself, the distance of the curve, and a segments atttribute
    const newBezier = bezierCurves.map((curve) => { return {curve: curve, distance: CurveDistance(curve), segments: 0} });

    // Give each curve 1 more segment while allowed under the limit of maxLines
    // If can not give 1 more segment to each curve, give to the line segment to the curve
    // with the greastest distance that has not already recived an additional segment
    let currentNumOfLines = 0;
    let currentSegments = 0;
    while(currentNumOfLines < maxLines && currentSegments < maxSegments)
    {
        // Enough lines left over to add a line to each curve
        if(currentNumOfLines + newBezier.length <= maxLines)
        {
            // Add 1 to the number of segments for each curve
            newBezier.forEach(element => { element["segments"] += 1 });
            currentNumOfLines += newBezier.length;
            currentSegments += 1;
            continue;
        }

        // Not enough lines for each bezier, add a segment to the longest curve first
        const longestCurve = newBezier.reduce((prev, curr) => (prev["distance"] < curr["distance"] && curr["segments"] < currentSegments + 1) ? curr : prev, {distance: 0, segments: 0});
        longestCurve["segments"] += 1;
        currentNumOfLines += 1;
        newBezier[newBezier.indexOf(longestCurve)] = longestCurve;
    }

    // Break down the curve into the number of line segments specified for each curve
    let lines = [];
    for(const element of newBezier)
    {
        // Extract required curve information
        const curve = element["curve"];
        const segments = element["segments"];

        // No need to break a curve down into 0 segments
        if(segments == 0)
        {
            continue;
        }

        // All curves start at x0, y0 when t = 0
        let [xPrev, yPrev] = [curve[0], curve[1]];

        // t = 0 - Begining of curve
        // t = 1 - End of curve
        // t <= 1 + 1 / (segments * 2) to handle floating point rounding errors
        // https://en.wikipedia.org/wiki/B%C3%A9zier_curve#/media/File:B%C3%A9zier_3_big.gif
        for(let t = 1 / segments; t <= 1 + 1 / (segments * 2); t += 1 / segments)
        {
            // Calculate the ending point of the line segment 
            const [x0, y0, x1, y1, x2, y2, x3, y3] = curve;
            const xEnd = Math.pow((1 - t), 3) * x0 + 3 * Math.pow((1 - t), 2) * t * x1 + 3 * (1 - t) * Math.pow(t, 2) * x2 + Math.pow(t, 3) * x3;
            const yEnd = Math.pow((1 - t), 3) * y0 + 3 * Math.pow((1 - t), 2) * t * y1 + 3 * (1 - t) * Math.pow(t, 2) * y2 + Math.pow(t, 3) * y3;
    
            // Add line segment to array of lines
            lines.push([xPrev, yPrev, xEnd, yEnd]);
    
            // Set the current line segment end as the start for the next line segment
            [xPrev, yPrev] = [xEnd, yEnd];
        }
    }

    return lines
}
module.exports.BezierCurvesToLines = BezierCurvesToLines;


/**
 * Any line with a length below the threshold will be removed
 * 
 * @param {Number[][]} lines - Array of line segments where each line is an array with [x0, y0, x1, y1] values.
 * @param {Number} threshold [0] - Trim if line length is below this value
 * 
 * @returns All lines that are greater or equal the threshold
 */
function TrimLines(lines = [], threshold = 0)
{
    return lines.filter((line) => LineDistance(line) >= threshold );
}

/**
 * Any bezier with a length below the threshold will be removed 
 * 
 * @param {Number[][]} beziers - An array of bezier curves where each curve is an array with [x0, y0, x1, y1, x2, y2, x3, y3] values.
 * @param {Number} threshold [0] - Trim if bezier length is below this value
 * 
 * @returns All beziers that are greater or equal the threshold
 */
function TrimBeziers(beziers = [], threshold = 0)
{
    return beziers.filter((bezier) => CurveDistance(bezier) >= threshold);
}


//line{ line:p4 =   0.424072, -0.08557061538461538, 0.4248315384615385, -0.07686569230769232}
// Zoomed out sight size
// LEF = X -0.89
// RIG = X 0.89
// TOP = Y -0.5
// BOT = Y 0.5


// const sightZoom = 12;

/**
 * Offset all lines by an x offset, y offset or both
 * 
 * @param {Number[][]} lines - Array of line segments where each line is an array with [x0, y0, x1, y1] values.
 * @param {number} options.xOffset [0] - Offset all x values by this value
 * @param {number} options.yOffset [0] - Offset all y values by this value
 * 
 * @returns Lines scaled by their respective value
 */
function OffsetLines(lines = [], options = {})
{
    const xOffset = (isNaN(options["xOffset"])) ? 0 : options["xOffset"];
    const yOffset = (isNaN(options["yOffset"])) ? 0 : options["yOffset"];

    // There is nothing we can do
    if(lines.length == 0 || (xOffset == 0 && yOffset == 0))
    {
        return lines;
    }

    return lines.map((line) => [line[0] + xOffset, line[1] + yOffset, line[2] + xOffset, line[3] + yOffset]);
}


/**
 * Scale lines by x scale, y scale, or both
 * 
 * @param {Number[][]} lines - Array of line segments where each line is an array with [x0, y0, x1, y1] values.
 * @param {Number} options.xScale [1] - Scale the x axis of the lines by this value
 * @param {Number} options.yScale [1] - Scale the y axis of the lines by this value
 * 
 * @returns Lines scaled by their respective value
 */
function ScaleLines(lines = [], options = {})
{
    const xScale = (isNaN(options["xScale"])) ? 1 : options["xScale"];
    const yScale = (isNaN(options["yScale"])) ? 1 : options["yScale"];

    // There is nothing we can do
    if(lines.length == 0 || (xScale == 1 && yScale == 1))
    {
        return lines;
    }

    return lines.map((line) => [line[0] * xScale, line[1] * yScale, line[2] * xScale, line[3] * yScale]);
}


/**
 * Rotate a point around an origin point by a specified angle
 * 
 * @param {Number[]} point [0,0] - Point to rotate
 * @param {Number[]} origin [0,0] - Point to rotate around 
 * @param {Number} angle [0] - In radians
 * 
 * @returns The rotated point as [x, y]
 */
function RotatePoint(point = [0, 0], origin = [0, 0], angle = 0)
{
    // There is nothing we can do
    if(angle == 0)
    {
        return point
    }

    const [xO, yO] = origin
    const [xP, yP] = point;

    const xR = xO + Math.cos(angle) * (xP - xO) - Math.sin(angle) * (yP - yO);
    const yR = yO + Math.sin(angle) * (xP - xO) + Math.cos(angle) * (yP - yO);

    return [xR, yR];
}


/**
 * Rotate all the lines around an origin point by a specified degrees
 * 
 * @param {Number[][]} lines - Array of line segments where each line is an array with [x0, y0, x1, y1] values.
 * @param {Number} degrees [0] - Angle to rotate by in degrees
 * @param {Number} origin - The point to rotate the lines around, if null center of lines
 * 
 * @returns Lines rotated around the origin by degrees
 */
function RotateLines(lines = [], degrees = 0, origin = [])
{
    // There is nothing we can do
    if(lines.length == 0 || degrees == 0)
    {
        return lines;
    }

    // No orgin given, set orgin to the center of the image
    if(origin.length == 0)
    {
        let [xMin, xMax, yMin, yMax] = [Infinity, -Infinity, Infinity, -Infinity];
        for(const line of lines)
        {
            xMin = Math.min(xMin, line[0], line[2]);
            xMax = Math.max(xMax, line[0], line[2]);
            yMin = Math.min(yMin, line[1], line[3]);
            yMax = Math.max(yMax, line[1], line[3]);
        }
        origin = [parseFloat(((xMax - xMin) / 2 + xMin).toFixed(3)), parseFloat(((yMax - yMin) / 2 + yMin).toFixed(3))]
    }

    // Convert input degrees to radians
    const radians = degrees * (Math.PI/180);

    return lines.map((line) => 
    {
        const [x0, y0] = RotatePoint([line[0], line[1]], origin, radians);
        const [x1, y1] = RotatePoint([line[2], line[3]], origin, radians);
        return [x0, y0, x1, y1];
    });
}


/**
 * Center and scale the lines to fit within War Thunder's default no zoom
 * 
 * @param {Number[][]} lines - Array of line segments where each line is an array with [x0, y0, x1, y1] values.
 * 
 * @returns Lines centered and scaled
 */
function ScaleAndCenterLinesToWarThunderSight(lines = [])
{
    // There is nothing we can do
    if(lines.length == 0)
    {
        return lines;
    }
    
    // Get the x and y max and min of all the lines
    let [xMin, xMax, yMin, yMax] = [Infinity, -Infinity, Infinity, -Infinity];
    for(const line of lines)
    {
        xMin = Math.min(xMin, line[0], line[2]);
        xMax = Math.max(xMax, line[0], line[2]);
        yMin = Math.min(yMin, line[1], line[3]);
        yMax = Math.max(yMax, line[1], line[3]);
    }

    // Center the image with an offset
    const xOffset = -((xMax + xMin) / 2);
    const yOffset = -((yMax + yMin) / 2);
    lines = OffsetLines(lines, {xOffset: xOffset, yOffset: yOffset})

    // Scale the image to the WT sight width and height
    const linesWidth = xMax - xMin;
    const linesHeight = yMax - yMin;
    const xScale = wTSightWidth / linesWidth;
    const yScale = wTSightHeight / linesHeight;
    const scale =  Math.min(yScale, xScale);
    lines = ScaleLines(lines, {xScale: scale, yScale: scale});

    return lines;
}
module.exports.ScaleAndCenterLinesToWarThunderSight = ScaleAndCenterLinesToWarThunderSight;


function LinesToWarThunderSightFormat(lines = [], options = {})
{
    const thousandth = (options["thousandth"] == "No" || options["thousandth"] == "Yes") ? options["thousandth"] : "No"; 
    const move = (options["move"] == "No" || options["move"] == "Yes") ? options["move"] : "No"; 

    return lines.map((x) => `\tline{ line:p4 = ${x.join(', ')}; thousandth:b = ${thousandth};  move:b = ${move} }`).join('\n');
}


function GetSightBLKContent(lines)
{
    return `crosshairHorVertSize:p2=3, 2
    rangefinderProgressBarColor1:c=0, 255, 0, 64
    rangefinderProgressBarColor2:c=255, 255, 255, 64
    rangefinderTextScale:r=0.7
    rangefinderUseThousandth:b=no
    rangefinderVerticalOffset:r=0.1
    rangefinderHorizontalOffset:r=5
    detectAllyTextScale:r=0.7
    detectAllyOffset:p2=4, 0.05
    fontSizeMult:r=1
    lineSizeMult:r=1
    drawCentralLineVert:b=yes
    drawCentralLineHorz:b=yes
    drawSightMask:b=yes
    useSmoothEdge:b=yes
    crosshairColor:c=0, 0, 0, 0
    crosshairLightColor:c=0, 0, 0, 0
    crosshairDistHorSizeMain:p2=0.03, 0.02
    crosshairDistHorSizeAdditional:p2=0.005, 0.003
    distanceCorrectionPos:p2=-0.26, -0.05
    drawDistanceCorrection:b=yes
    
    crosshair_distances{
      distance:p3=200, 0, 0
      distance:p3=400, 4, 0
      distance:p3=600, 0, 0
      distance:p3=800, 8, 0
      distance:p3=1000, 0, 0
      distance:p3=1200, 12, 0
      distance:p3=1400, 0, 0
      distance:p3=1600, 16, 0
      distance:p3=1800, 0, 0
      distance:p3=2000, 20, 0
      distance:p3=2200, 0, 0
      distance:p3=2400, 24, 0
      distance:p3=2600, 0, 0
      distance:p3=2800, 28, 0
      distance:p3=3000, 0, 0
      distance:p3=3200, 32, 0
      distance:p3=3400, 0, 0
      distance:p3=3600, 36, 0
      distance:p3=3800, 0, 0
      distance:p3=4000, 40, 0
      distance:p3=4200, 0, 0
      distance:p3=4400, 44, 0
      distance:p3=4600, 0, 0
      distance:p3=4800, 48, 0
      distance:p3=5000, 0, 0
      distance:p3=5200, 52, 0
      distance:p3=5400, 0, 0
      distance:p3=5600, 56, 0
      distance:p3=5800, 0, 0
      distance:p3=6000, 60, 0
    }
    
    crosshair_hor_ranges{
      range:p2=-32, 32
      range:p2=-28, 0
      range:p2=-24, 24
      range:p2=-20, 0
      range:p2=-16, 16
      range:p2=-12, 0
      range:p2=-8, 8
      range:p2=-4, 0
      range:p2=4, 0
      range:p2=8, 8
      range:p2=12, 0
      range:p2=16, 16
      range:p2=20, 0
      range:p2=24, 24
      range:p2=28, 0
      range:p2=32, 32
    }
    
    matchExpClass {
        exp_tank:b = yes
        exp_heavy_tank:b = yes
        exp_tank_destroyer:b = yes
        exp_SPAA:b = yes
    }
    
    drawLines{
      line{
        line:p4=0, 0, 0, 0
        move:b=no
      }
      ${LinesToWarThunderSightFormat(lines)}
    }`;
}
module.exports.GetSightBLKContent = GetSightBLKContent;