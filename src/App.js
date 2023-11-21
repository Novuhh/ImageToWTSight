import './App.css';
import vapOrginal from './assets/vaporeonInput.png';
import vapInGame from './assets/vaporeonInGame.jpg';
import vapOutline from './assets/vaporeonBlackAndWhite.png';
import gameSight from './assets/gameSight.jpg';
import { useState, useRef, useEffect } from 'react';
import { trace } from 'potrace';
const backend = require('./linesAndCurves.js');


// War thunder has a max number of lines it will display on a sight, exact number unknown but around 26XX, set to 2500 for safety
const warThunderMaxLines = 2500;

// How long after the user changes the sliders to make the change
// Prevents needing to apply changes but also not applying 50 times in the span of 10ms
const userInputDelayInMS = 250;


function App()
{
    const scollToImages = useRef();

    // Images to display to user
    const [userImage, SetUserImage] = useState("");
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

    // Timeout for user changes
    // https://stackoverflow.com/questions/57995978/why-is-cleartimeout-not-clearing-the-timeout-in-this-react-component
    useEffect(() => 
    {
        const t = setTimeout(() => { ApplyLineBreakdown(); }, userInputDelayInMS);
        return () => { clearTimeout(t); }
    }, [maxLines, nSegments]);

    useEffect(() => 
    {
        const t = setTimeout(() => { ApplyTransformation(); }, userInputDelayInMS);
        return () => { clearTimeout(t); }
    }, [xPos, yPos, xScale, yScale, rotation]);


    /**
     * Take a new image from the user
     * @param {*} e - Action of input file change
     */
    async function UserSubmitsImage(e)
    {
        const file = e.target.files[0];
        if(!file)
        {
            return;
        }

        try 
        {
            // Save the image, buffer and file name
            // Buffer for potrace and to display on page
            // Name for downloading the sight.blk
            const buffer = await file.arrayBuffer();
            SetFileName(file.name.split('.')[0]);
            SetUserImage(URL.createObjectURL(file));

            // Use potrace edge detection to get edges into an svg format
            trace(buffer, (err, svg) => 
            {
                if (err) throw err;
                SetUserImagePotrace(svg);

                // Extract lines and bezier curves from the svg result
                const [lines, beziers] = backend.SVGToLinesAndBeziers(svg);
                SetLines(lines);
                SetBeziers(beziers);

                // Set parameters to display the lines to the user
                SetMaxLines(warThunderMaxLines);
                const seg = ((lines.length + beziers.length) == 0) ? 1 : Math.ceil((warThunderMaxLines - lines.length) / beziers.length);
                SetNSegments(seg);

                // Scale and position the lines to fill the sight
                const scaled = backend.ScaleAndCenterLinesToWarThunderSight(lines.concat(backend.BezierCurvesToLines(beziers, {maxLines: warThunderMaxLines - lines.length, maxSegments: seg})));
                SetCombinedLines(scaled);
                SetTransformedLines(scaled);
                SetAppliedSVG(backend.LinesAndBeziersToSVG(scaled, 1920, 1080));

                scollToImages.current.scrollIntoView({behavior: "smooth"});
            });
        }
        catch(err)
        {
            console.log(err);
            SetUserImagePotrace("An error occured with your image. Try converting from jpg to png or vice versa.");
        }
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

        // Error message pass through
        if(!svg.startsWith("<svg"))
        {
            return svg;
        }

        // Get the max size the image should be and how big the image acutally is
        const widthStart = svg.indexOf("width=") + 7;
        const width = parseInt(svg.substring(widthStart, svg.indexOf('"', widthStart)));
        const heightStart = svg.indexOf("height=") + 8;
        const height = parseInt(svg.substring(heightStart, svg.indexOf('"', heightStart)));

        // Cut out the existing width and height, limit to maxsize of bigger attribute
        return svg.substring(0, svg.indexOf("width")) + (width > height ? `width="40vw"` : `height="40vw"`) + svg.substring(svg.indexOf('"', heightStart) + 1);
    }

    /**
     * Break down the curves into lines of user specified segments + lines
     * Move the lines to the position given by the user
     */
    function ApplyLineBreakdown()
    {
        const scaled = backend.ScaleAndCenterLinesToWarThunderSight(lines.concat(backend.BezierCurvesToLines(beziers, {maxLines: maxLines - lines.length, maxSegments: nSegments})));
        SetCombinedLines(scaled);
        ApplyTransformation(scaled);
    }

    /**
     * Move, scale, and rotate the lines by values from user
     * @param {Number[]} inputLines [combinedLines] - The lines to manipulate
     */
    function ApplyTransformation(inputLines = [])
    {
        const newLines = backend.ApplyLinesTranformation(inputLines.length !== 0 ? inputLines : combinedLines, {xOffset: xPos, yOffset: yPos, xScale: xScale, yScale: yScale, rotation: rotation});
        SetTransformedLines(newLines);
        SetAppliedSVG(backend.LinesAndBeziersToSVG(newLines, 1920, 1080));
    }

    /**
     * Download the sight to be put into WT
     * @returns Blob - File containing the text for the blk download
     */
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
                <img src={vapOrginal} alt="Orginal" style={{height: "calc(40vw * 9 / 16)"}}/>

                <svg style={{width: "10vw"}} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 6 12 L 18 12 M 18 12 L 13 7 M 18 12 L 13 17" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                <img src={vapInGame} alt="Ingame Sight" style={{width: "40vw", height: "auto"}}/>
            </div>

            {/* Step 0: Get a good input image */}
            <div className="Step-container">
                <h1>Step 0: You Need a Black and White (or Transparent) png or jpg</h1>

                <div className="previewWindow" style={{height: "240px"}}>
                    <img src={vapOrginal} alt="Orginal"/>

                    <svg width="100px" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 6 12 L 18 12 M 18 12 L 13 7 M 18 12 L 13 17" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>

                    <img src={vapOutline} alt="Ingame Sight"/>
                </div>

                <p style={{width: "60%"}}>I found that <a href="https://vectordad.com/photo-to-stencil/">this</a> website works well for the task (make sure you download the png or jpg version). White pixels will be made transparent if any exist in uploaded image. You can use other tools such as threshold. Just know that the EDGES (not color) where white goes to black or black goes to white is where the lines will be drawn. Colored images will be accepted, but will have threshold applied to them to make it black and white.</p>
            </div>

            {/* Step 1: Submit image and check it works */}
            <div className="Step-container" style={{height: "fit-content"}}>
                <h1>Step 1: Upload Your Image</h1>

                <input type="file" id="inputImage" name="image" accept="image/png, image/jpeg" onChange={(e) => UserSubmitsImage(e)}/>

                <h3 style={{color: "red", display: lines.length + beziers.length > warThunderMaxLines == "" ? "none" : "block"}}>Your image is too complex for War Thunder. War Thunder has a max line limit of {warThunderMaxLines} for user sights.</h3>

                <p style={{display: userImage == "" ? "none" : "block"}}>Your image has {lines.length} lines and {beziers.length} curves. Curves will be broken down into n number of segments.</p>
                <p>War Thunder has a limit of {warThunderMaxLines} lines per user sight.</p>

                <div className="Input-container" style={{height: "fit-content", display: userImage == "" ? "none" : "flex"}} ref={scollToImages}>
                    <div className="Input-side">
                        <h3>Your Image Input</h3>
                        
                        <img style={{objectFit: "contain", width: "100%", maxHeight: "40vw"}} alt="display" id="displayImage" src={userImage}/>
                    </div>

                    <div className="Input-side">
                        <h3>Image I Extract</h3>

                        <div style={{width: "100%"}} dangerouslySetInnerHTML={{__html: DisplaySVG(userImagePotrace)}}/>
                    </div>
                </div>
            </div>

            {/* Step 2: Manipulate the image to where user wants it */}
            <div className="Step-container" style={{width: "100%", display: userImagePotrace == "" ? "none" : "flex"}}>
                <h1>Step 2: Place the image on the sight</h1>

                <p>*Preview, not actual in game sight. How it will be displayed on a 16:9 display.</p>

                <div className="Overlay-container">
                    <div className="Overlay-image" id="image-overlay">
                        <img width="100%" id="displayImage" alt="default sight" src={gameSight} style={{height: "fit-content"}}/>
                        <div className="SVG-overlay" dangerouslySetInnerHTML={{__html: appliedSVG}}/>
                    </div>

                    <div className="Overlay-controls">
                        <div className="Overlay-control-group" style={{marginBottom: "5vh"}}>
                            <h3 className="Centered">Break down curves into lines</h3>

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

                            {/* <div style={{paddingRight: "12px"}}>
                                <input type="button" id="process-curves" name="Generate" value="Apply" onClick={() => {ApplyLineBreakdown()}}/>
                            </div> */}
                            
                            <p>Total lines: {combinedLines.length} / {warThunderMaxLines}</p>
                        </div>
                        
                        <div className="Overlay-control-group">
                            <h3 className="Centered">Manipulate the image</h3>
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

                            <input type="button" id="reset-manipulate" name="Reset" value="Reset" className="Centered" onClick={() => {
                                SetXPos(0);
                                SetYPos(0);
                                SetXScale(1);
                                SetYScale(1);
                                SetRotation(0);
                            }}/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 3: Download the user sight */}
            <div className="Step-container" style={{display: transformedLines.length == 0 ? "none" : "flex"}}>
                <h1>Step 3: Download the Sight</h1>
                
                <a download={`${fileName}_ItWTUS.blk`} href={URL.createObjectURL(SightFile())}><button>Download</button></a>

                <p>Place the blk file in into War Thunder. Directory Path: "War Thunder/UserSights/all_tanks/&#60;your_sight&#62;_ItWTUS.blk"</p>

                <p>If these folders to not exist, create them and name them exactly as above.</p>

                <p>Equip the sight on your vehicle: Options -&#62; Common Battle Settings -&#62; Use Alternative Grid Sight -&#62; "&#60;your_sight&#62;_ItWTUS"</p>

                <p>&nbsp;</p>

                <p>Tip: If your sight is not appearing in game use the control, "Reload custom sight" with Alt + F9 by default.</p>
                
                <p>Tip: Still won't show up in the list? &#60;your_sight&#62;326178_ItWTUS(1).blk is not valid for WT, rename the file to get rid of anything execpt for letters and underscores. Ex: example_sight_ItWTUS.blk</p>
            </div>
        </div>
    </>)
}

export default App;
