import './App.css';
import vapOrginal from './assets/vaporeonInput.png';
import vapInGame from './assets/vaporeonInGame.jpg';
import vapOutline from './assets/vaporeonBlackAndWhite.png';
import gameSight from './assets/gameSight.jpg';
import { useState, useRef } from 'react';
import { trace } from 'potrace';
const backend = require('./linesAndCurves.js');

const warThunderMaxLines = 2500;

function App()
{
    const windowWidth = useRef(window.innerWidth);
    // const windowHeight = useRef(window.innerHeight);

    // Images to display to user
    const [userImageBuffer, SetUserImageBuffer] = useState("");
    const [userImagePotrace, SetUserImagePotrace] = useState("");
    const [appliedSVG, SetAppliedSVG] = useState("");
    const [fileName, SetFileName] = useState("");

    // Backend to do handle war thunder blk
    const [lines, SetLines] = useState([]);
    const [beziers, SetBeziers] = useState([]);
    const [combinedLines, SetCombinedLines] = useState([]);
    const [transformedLines, SetTransformedLines] = useState([]);

    // Image breakdown
    const [maxLines, SetMaxLines] = useState(warThunderMaxLines);
    const maxLineSegments = ((lines.length + beziers.length) == 0) ? 1 : Math.ceil((maxLines - lines.length) / beziers.length);
    const [nSegments, SetNSegments] = useState(maxLineSegments);

    // Image manipulation
    const [xPos, SetXPos] = useState(0);
    const [yPos, SetYPos] = useState(0);
    const [xScale, SetXScale] = useState(1);
    const [yScale, SetYScale] = useState(1);
    const [rotation, SetRotation] = useState(0);


    /**
     * Take a new image from the user
     * @param {*} e - Action of input file change
     */
    async function UserSubmitsImage(e)
    {
        const buffer = await e.target.files[0].arrayBuffer();
        SetFileName(e.target.files[0].name.split('.')[0]);
        SetUserImageBuffer(buffer);
        trace(buffer, (err, svg) => 
        {
            if (err) throw err;
            SetUserImagePotrace(svg);

            const [lines, beziers] = backend.SVGToLinesAndBeziers(svg);
            SetLines(lines);
            SetBeziers(beziers);
            SetMaxLines(warThunderMaxLines);
            const seg = ((lines.length + beziers.length) == 0) ? 1 : Math.ceil((warThunderMaxLines - lines.length) / beziers.length);
            SetNSegments(seg);
            const scaled = backend.ScaleAndCenterLinesToWarThunderSight(lines.concat(backend.BezierCurvesToLines(beziers, {maxLines: warThunderMaxLines - lines.length, maxSegments: seg})));
            // console.log("scaled input", scaled)
            SetCombinedLines(scaled);
            SetTransformedLines(scaled)
            SetAppliedSVG(backend.LinesAndBeziersToSVG(scaled, 1780, 1000));
        });
    }


    /**
     * Display the svg by removing width and hight, and applying width or height to fit the div
     * @param {String} svg - SVG to display
     * @returns SVG edited to fit div
     */
    function DisplaySVG(svg)
    {
        if(svg == "")
        {
            return;
        }

        const maxSize = Math.ceil(windowWidth.current * 0.4);
        const widthStart = svg.indexOf("width=") + 7;
        const width = parseInt(svg.substring(widthStart, svg.indexOf('"', widthStart)));
        const heightStart = svg.indexOf("height=") + 8;
        const height = parseInt(svg.substring(heightStart, svg.indexOf('"', heightStart)));

        // Image does not need to be scaled down
        if(width <= maxSize && height <= maxSize)
        {
            return svg;
        }

        // Cut out the existing width and height, limit to maxsize of bigger attribute
        return svg.substring(0, svg.indexOf("width")) + (width > height ? `width="${maxSize}"` : `height="${maxSize}"`) + svg.substring(svg.indexOf('"', heightStart) + 1);
    }

    function ApplyLineBreakdown()
    {
        const scaled = backend.ScaleAndCenterLinesToWarThunderSight(lines.concat(backend.BezierCurvesToLines(beziers, {maxLines: maxLines - lines.length, maxSegments: nSegments})));
        SetCombinedLines(scaled);
        ApplyTransformation(scaled);
    }

    function ApplyTransformation(inputLines = [])
    {
        const newLines = backend.ApplyLinesTranformation(inputLines.length !== 0 ? inputLines : combinedLines, {xOffset: xPos, yOffset: yPos, xScale: xScale, yScale: yScale, rotation: rotation});
        SetTransformedLines(newLines);
        console.log(newLines)
        SetAppliedSVG(backend.LinesAndBeziersToSVG(newLines, 1780, 1000));
    }

    function SightFile()
    {
        return new Blob([backend.GetSightBLKContent(transformedLines)], {type: 'text/plain'});
    }

    return (<>
        {/* Set background color to dark theme */}
        <div className="Page" style={{position: "fixed", zIndex: "-1", width: "100%", height: "100%"}}></div>

        <div className="Page-content">
            <div className="Header-title">
                <h1>Convert an Image Into a War Thunder User Sight</h1>
            </div>

            <div className="Preview-window">
                <img src={vapOrginal} alt="Orginal" style={{height: "100%"}}/>

                <svg width="200px" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12H18M18 12L13 7M18 12L13 17" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                <img src={vapInGame} alt="Ingame Sight" style={{height: "100%"}}/>
            </div>

            {/* Step 0: Get a good input image */}
            <div className="Step-container">
                <h1>Step 0: You Need a Black and White (or Transparent) png or jpg</h1>

                <div className="previewWindow" style={{height: "240px"}}>
                    <img src={vapOrginal} alt="Orginal"/>

                    <svg width="100px" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 12H18M18 12L13 7M18 12L13 17" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>

                    <img src={vapOutline} alt="Ingame Sight"/>
                </div>

                <p style={{width: "60%"}}>I found that <a href="https://vectordad.com/photo-to-stencil/">this</a> website works well for the task (make sure you download the png or jpg version). White pixels will be made transparent if any exist in uploaded image. You can use other tools such as threshold. Just know that the EDGES (not color) where white goes to black or black goes to white is where the lines will be drawn. Colored images will be accepted, but will have threshold applied to them to make it black and white.</p>
            </div>

            {/* Step 1: Submit image and check it works */}
            <div className="Step-container" style={{height: "fit-content"}}>
                <h1>Step 1: Upload Your Image</h1>

                <input type="file" id="inputImage" name="image" accept="image/png, image/jpeg" onChange={(e) => UserSubmitsImage(e)}/>

                <h3 style={{color: "red", display: lines.length + beziers.length > warThunderMaxLines == "" ? "none" : "block"}}>Your image is too complex for War Thunder. War thunder has a max line limit of {warThunderMaxLines} for user sights.</h3>

                <p style={{width: "60%", display: userImageBuffer == "" ? "none" : "block"}}>Your image has {lines.length} lines and {beziers.length} curves. Curves will be broken down into n number of segments. War Thunder has a max of {warThunderMaxLines} lines per user sight.</p>

                <div className="Input-container" style={{height: "fit-content", display: userImageBuffer == "" ? "none" : "flex"}}>
                    <div className="Input-side" style={{width: Math.ceil(windowWidth.current * 0.4), maxWidth: Math.ceil(windowWidth.current * 0.4)}}>
                        <h3>Your Image Input</h3>
                        <div>
                            <img style={{maxWidth: Math.ceil(windowWidth.current * 0.4), maxHeight: Math.ceil(windowWidth.current * 0.4)}} alt="display" id="displayImage" src={"data:image/png;base64," + btoa(String.fromCharCode.apply(null, new Uint8Array(userImageBuffer)))}/>
                        </div>
                    </div>

                    <div className="Input-side" style={{width: Math.ceil(windowWidth.current * 0.4), maxWidth: Math.ceil(windowWidth.current * 0.4)}}>
                        <h3>Image I Extract</h3>

                        <div dangerouslySetInnerHTML={{__html: DisplaySVG(userImagePotrace)}}/>
                    </div>
                </div>
            </div>

            {/* Step 2: Manipulate the image to where user wants it */}
            <div className="Step-container" style={{width: "100%", display: userImagePotrace == "" ? "none" : "flex"}}>
                <h1>Step 2: Place the image on the sight</h1>

                <p>*Not exactly the sight in game, but close enough</p>

                <div className="Overlay-container">
                    <div className="Overlay-image" id="image-overlay">
                        <img width="100%" id="displayImage" alt="default sight" src={gameSight}/>
                        <div style={{position: "absolute", width: "100%"}} dangerouslySetInnerHTML={{__html: appliedSVG}}/>
                    </div>

                    <div className="Overlay-controls">
                        <div className="Overlay-control-group">
                            <h3>Break down curves into lines</h3>

                            <div className="Overlay-control">
                                Max Lines:
                                <input type="range" id="max-lines-slider" value={maxLines} name="max-lines" min={lines.length + beziers.length} max={warThunderMaxLines} step="1" onChange={(e) => {SetMaxLines(e.target.valueAsNumber); SetNSegments(Math.min(nSegments, ((lines.length + beziers.length) == 0) ? 1 : Math.ceil((e.target.valueAsNumber - lines.length) / beziers.length)))}}/>
                                <input style={{width: "69px"}} type="number" id="max-lines-field" placeholder={warThunderMaxLines} value={maxLines === warThunderMaxLines ? "" : maxLines} name="max-lines" min={lines.length + beziers.length} max={warThunderMaxLines} step="1" onChange={(e) => {isNaN(e.target.valueAsNumber) ? SetMaxLines(warThunderMaxLines) : SetMaxLines(e.target.valueAsNumber)}}/>
                            </div>

                            <div className="Overlay-control">
                                N Segments:
                                <input type="range" id="n-segments-slider" value={nSegments} name="n-segments" min="1" max={maxLineSegments} step="1" onChange={(e) => {SetNSegments(e.target.valueAsNumber)}}/>
                                <input style={{width: "69px"}} type="number" id="n-segments-field" placeholder={maxLineSegments} value={nSegments === maxLineSegments ? "" : Math.min(nSegments, maxLineSegments)} name="n-segments" min="1" max={maxLineSegments} step="1" onChange={(e) => {isNaN(e.target.valueAsNumber) ? SetNSegments(maxLineSegments) : SetNSegments(e.target.valueAsNumber)}}/>
                            </div>

                            <input type="button" id="process-curves" name="Generate" value="Apply" onClick={() => {ApplyLineBreakdown()}}/>
                            <p>Total lines: {combinedLines.length} / {warThunderMaxLines}</p>

                        </div>
                        
                        <div className="Overlay-control-group">
                            <h3>Manipulate the image</h3>
                            <div className="Overlay-control">
                                X Position:
                                <input type="range" id="x-pos-slider" value={xPos} name="X-pos" min="-1" max="1" step="0.01" onChange={(e) => {SetXPos(e.target.valueAsNumber)}}/>
                                <input style={{width: "69px"}} type="number" id="x-pos-field" placeholder="0" value={xPos === 0 ? "" : xPos} name="X-pos" min="-1.78" max="1.78" step="0.01" onChange={(e) => {isNaN(e.target.valueAsNumber) ? SetXPos(0) : SetXPos(e.target.valueAsNumber)}}/>
                            </div>

                            <div className="Overlay-control">
                                Y Position:
                                <input type="range" id="y-pos-slider" value={yPos} name="Y-pos" min="-1" max="1" step="0.01" onChange={(e) => {SetYPos(e.target.valueAsNumber)}}/>
                                <input style={{width: "69px"}} type="number" id="y-pos-field" placeholder="0" value={yPos === 0 ? "" : yPos} name="Y-pos" min="-1" max="1" step="0.01" onChange={(e) => {isNaN(e.target.valueAsNumber) ? SetYPos(0) : SetYPos(e.target.valueAsNumber)}}/>
                            </div>

                            <div className="Overlay-control">
                                X Scale:
                                <input type="range" id="x-scale-slider" value={xScale} name="X-scale" min="-1" max="1" step="0.01" onChange={(e) => {SetXScale(e.target.valueAsNumber)}}/>
                                <input style={{width: "69px"}} type="number" id="x-scale-field" placeholder="1" value={xScale === 1 ? "" : xScale} name="X-scale" min="-1" max="1" step="0.01" onChange={(e) => {isNaN(e.target.valueAsNumber) ? SetXScale(1) : SetXScale(e.target.valueAsNumber)}}/>
                            </div>

                            <div className="Overlay-control">
                                Y Scale:
                                <input type="range" id="y-scale-slider" value={yScale} name="Y-scale" min="-1" max="1" step="0.01" onChange={(e) => {SetYScale(e.target.valueAsNumber)}}/>
                                <input style={{width: "69px"}} type="number" id="y-scale-field" placeholder="1" value={yScale === 1 ? "" : yScale} name="Y-scale" min="-1" max="1" step="0.01" onChange={(e) => {isNaN(e.target.valueAsNumber) ? SetYScale(1) : SetYScale(e.target.valueAsNumber)}}/>
                            </div>

                            <div className="Overlay-control">
                                Rotation:
                                <input type="range" id="rotation-slider" value={rotation} name="Rotation" min="0" max="360" step="1" onChange={(e) => {SetRotation(e.target.valueAsNumber)}}/>
                                <input style={{width: "69px"}} type="number" id="rotation-field" placeholder="0" value={rotation === 0 ? "" : rotation} name="Rotation" min="0" max="360" step="1" onChange={(e) => {isNaN(e.target.valueAsNumber) ? SetRotation(0) : SetRotation(e.target.valueAsNumber)}}/>
                            </div>

                            <input type="button" id="manipulate-apply" name="Generate" value="Apply" onClick={() => {ApplyTransformation()}}/>
                        </div>

                        
                    </div>
                </div>
            </div>

            {/* Step 3: Download the user sight */}
            <div className="Step-container" style={{display: transformedLines.length == 0 ? "none" : "flex"}}>
                <h1>Step 3: Download the Sight</h1>
                
                <a download={`${fileName}_ItWTUS.blk`} href={URL.createObjectURL(SightFile())}><button>Download</button></a>

                <p>Place the blk file in into War Thunder. Directory: "War Thunder/UserSights/all_tanks/&#60;your_sight&#62;.blk"</p>

                <p>If these folders to not exist, create them and name them as above.</p>

                <p>Tip: If your sight is not appearing in game use the control, "Reload custom sight" with Alt + F9 by default.</p>
                <p>Tip: Still won't show up in the list? &#60;your_sight&#62;(1).blk is not read, rename the file to get rid of parenthesis</p>
            </div>
        </div>
    </>)
}

export default App;