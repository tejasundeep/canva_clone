import Head from 'next/head';
import React, { useState, useCallback, useRef } from 'react';
import Draggable from 'react-draggable';
import html2canvas from 'html2canvas';
import 'bootstrap/dist/css/bootstrap.css';
import pica from 'pica';


const RESOLUTIONS = {
    '4K': { width: 3840, height: 2160 },
    '1080p': { width: 1920, height: 1080 },
    '720p': { width: 1280, height: 720 },
};

export default function Home() {
    const [texts, setTexts] = useState([]);
    const [images, setImages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [selectedResolution, setSelectedResolution] = useState('1080p');
    const [selectedElement, setSelectedElement] = useState(null);
    const [selectedType, setSelectedType] = useState(null);

    const [zIndices, setZIndices] = useState({ texts: {}, images: {} });

    const textRefs = useRef([]);
    const imageRefs = useRef([]);

    const addText = useCallback(() => {
        if (inputText.trim()) {
            setTexts((prev) => [...prev, inputText.trim()]);
            setInputText('');
        }
    }, [inputText]);

    const addImage = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImages((prev) => [...prev, { src: e.target.result, width: 'auto', height: 'auto' }]);
            reader.readAsDataURL(file);
        }
    }, []);

    const handleResizeStart = useCallback((e, index) => {
        e.stopPropagation();
        const img = e.target.previousSibling;
        const initialWidth = img.offsetWidth;
        const initialHeight = img.offsetHeight;
        let rafId;

        const handleResize = (e) => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(() => {
                const rect = img.getBoundingClientRect();
                const width = e.clientX - rect.left;
                const aspectRatio = initialHeight / initialWidth;
                const height = width * aspectRatio;
                setImages((prev) => {
                    const newImages = [...prev];
                    newImages[index].width = width;
                    newImages[index].height = height;
                    return newImages;
                });
            });
        };

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', handleResize);
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        }, { once: true });
    }, []);

    const increaseZIndex = useCallback((index, type) => {
        setZIndices((prev) => {
            let updated = { ...prev };
            updated[type][index] = (updated[type][index] || 0) + 1;
            return updated;
        });
    }, []);

    const decreaseZIndex = useCallback((index, type) => {
        setZIndices((prev) => {
            let updated = { ...prev };
            if (updated[type][index] > 0) {
                updated[type][index] -= 1;
            }
            return updated;
        });
    }, []);

    const exportToImage = useCallback(() => {
        const node = document.getElementById('canvas');

        const { width, height } = RESOLUTIONS[selectedResolution];

        html2canvas(node).then(capturedCanvas => {
            const contentWidth = capturedCanvas.width;
            const contentHeight = capturedCanvas.height;

            // Adjust the scale to fit the resolution
            const scale = Math.max(width / contentWidth, height / contentHeight);

            const scaledWidth = contentWidth * scale;
            const scaledHeight = contentHeight * scale;

            // Calculate offsets to center the content
            const offsetX = (width - scaledWidth) / 2;
            const offsetY = (height - scaledHeight) / 2;

            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = scaledWidth;
            scaledCanvas.height = scaledHeight;
            scaledCanvas.textBaseline = 'top';

            // Use pica to resize the image with high quality to an intermediate canvas
            pica({ features: ['all'], quality: 3 })
                .resize(capturedCanvas, scaledCanvas, { unsharpAmount: 80, unsharpRadius: 0.6, unsharpThreshold: 1 })
                .then(() => {
                    const finalCanvas = document.createElement('canvas');
                    finalCanvas.width = width;
                    finalCanvas.height = height;
                    finalCanvas.imageSmoothingEnabled = true;
                    finalCanvas.imageSmoothingQuality = 'high';

                    const context = finalCanvas.getContext('2d');

                    // Fill background with white color to avoid transparency issues
                    context.fillStyle = "white";
                    context.fillRect(0, 0, width, height);

                    // Now upscale it to the final resolution while maintaining the aspect ratio
                    return pica().resize(scaledCanvas, finalCanvas);
                })
                .then((resultCanvas) => {
                    // Draw the high-quality resized image onto the final canvas
                    const context = resultCanvas.getContext('2d');

                    // Draw the high-quality resized image onto the final canvas
                    context.drawImage(resultCanvas, offsetX, offsetY, scaledWidth, scaledHeight);

                    // Continue with your existing code to export the image...
                    const link = document.createElement('a');
                    link.download = 'my-image.png';
                    link.href = resultCanvas.toDataURL('image/png');
                    link.click();
                });
        });
    }, [selectedResolution]);

    return (
        <div className="container vh-100">
            <Head>
                <title>Canva Clone</title>
                <meta name="description" content="A basic version of a Canva-like tool created with Next.js" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Controls
                inputText={inputText}
                setInputText={setInputText}
                addText={addText}
                addImage={addImage}
                selectedResolution={selectedResolution}
                setSelectedResolution={setSelectedResolution}
                exportToImage={exportToImage}
                increaseZIndex={increaseZIndex}
                decreaseZIndex={decreaseZIndex}
                selectedElement={selectedElement}
                selectedType={selectedType}
            />
            <Canvas
                texts={texts}
                images={images}
                textRefs={textRefs}
                imageRefs={imageRefs}
                handleResizeStart={handleResizeStart}
                increaseZIndex={increaseZIndex}
                decreaseZIndex={decreaseZIndex}
                zIndices={zIndices}
                setSelectedElement={setSelectedElement}
                setSelectedType={setSelectedType}
            />
        </div>
    );
}

function Controls({ inputText, setInputText, addText, addImage, selectedResolution, setSelectedResolution, selectedElement, increaseZIndex, decreaseZIndex, exportToImage, selectedType }) {
    return (
        <div className="d-flex justify-content-start align-items-center py-3">
            <input
                type="text"
                className="form-control me-2"
                placeholder="Enter text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
            />
            <button className="btn btn-primary me-2" onClick={addText}>Add</button>
            <input type="file" accept="image/*" className="me-2" onChange={addImage} />
            <select
                className="form-select me-2"
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value)}
            >
                {Object.keys(RESOLUTIONS).map((res) => (
                    <option key={res} value={res}>{res}</option>
                ))}
            </select>
            <button className="btn btn-success" onClick={exportToImage}>Export</button>
            <>
                <button className="btn btn-secondary me-2" onClick={() => increaseZIndex(selectedElement, selectedType)} disabled={selectedElement === null}>Up</button>
                <button className="btn btn-secondary me-2" onClick={() => decreaseZIndex(selectedElement, selectedType)} disabled={selectedElement === null}>Down</button>
            </>
        </div>
    );
}

function Canvas({ texts, images, textRefs, imageRefs, handleResizeStart, increaseZIndex, decreaseZIndex, setSelectedElement, setSelectedType, zIndices }) {
    return (
        <div id="canvas" className="border border-dark bg-light" style={{ height: '80vh', position: 'relative', overflow: 'hidden' }}>
            {texts.map((text, index) => (
                <Draggable key={index} nodeRef={textRefs.current[index] || (textRefs.current[index] = React.createRef())}>
                    <div
                        ref={textRefs.current[index]}
                        className="border border-secondary bg-white p-2 rounded position-absolute text-element"
                        style={{ cursor: 'move', zIndex: zIndices.texts[index] || 0 }}
                        onClick={() => { setSelectedElement(index); setSelectedType('texts'); }}
                    >
                        {text}
                    </div>

                </Draggable>
            ))}
            {images.map((imgData, index) => (
                <Draggable key={index} nodeRef={imageRefs.current[index] || (imageRefs.current[index] = React.createRef())}>
                    <div
                        ref={imageRefs.current[index]}
                        className="position-absolute"
                        style={{ cursor: 'move', zIndex: zIndices.images[index] || 0 }}
                        onClick={() => { setSelectedElement(index); setSelectedType('images'); }}
                    >
                        <img src={imgData.src} style={{ width: imgData.width, height: imgData.height }} alt="User uploaded content" />
                        <div
                            style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: 'blue',
                                position: 'absolute',
                                bottom: '0',
                                right: '0',
                                cursor: 'se-resize',
                            }}
                            onMouseDown={(e) => handleResizeStart(e, index)}
                        ></div>
                    </div>
                </Draggable>
            ))}
        </div>
    );
}
