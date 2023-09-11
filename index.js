import Head from 'next/head';
import React, { useState, useCallback, useRef } from 'react';
import Draggable from 'react-draggable';
import html2canvas from 'html2canvas';
import 'bootstrap/dist/css/bootstrap.css';

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


    const exportToImage = useCallback(() => {
        const node = document.getElementById('canvas');
      
        const resolutions = {
            '4K': { width: 3840, height: 2160 },
            '1080p': { width: 1920, height: 1080 },
            '720p': { width: 1280, height: 720 },
        };
      
        const { width, height } = resolutions[selectedResolution];
      
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
        
            const newCanvas = document.createElement('canvas');
            newCanvas.width = width;
            newCanvas.height = height;
            const context = newCanvas.getContext('2d');
        
            // Fill background with white color to avoid transparency issues
            context.fillStyle = "white"; 
            context.fillRect(0, 0, width, height);
            
            // Draw the captured content onto the new canvas, scaled and centered
            context.drawImage(capturedCanvas, 0, 0, contentWidth, contentHeight, offsetX, offsetY, scaledWidth, scaledHeight);
        
            const link = document.createElement('a');
            link.download = 'my-image.png';
            link.href = newCanvas.toDataURL('image/png');
            link.click();
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
            />
            <Canvas texts={texts} images={images} textRefs={textRefs} imageRefs={imageRefs} handleResizeStart={handleResizeStart} />
        </div>
    );
}

function Controls({ inputText, setInputText, addText, addImage, selectedResolution, setSelectedResolution, exportToImage }) {
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
        </div>
    );
}

function Canvas({ texts, images, textRefs, imageRefs, handleResizeStart }) {
    return (
        <div id="canvas" className="border border-dark bg-light" style={{ height: '80vh', position: 'relative', overflow: 'hidden' }}>
            {texts.map((text, index) => (
                <Draggable key={index} nodeRef={textRefs.current[index] || (textRefs.current[index] = React.createRef())}>
                    <div ref={textRefs.current[index]} className="border border-secondary bg-white p-2 rounded position-absolute" style={{ cursor: 'move' }}>{text}</div>
                </Draggable>
            ))}
            {images.map((imgData, index) => (
                <Draggable key={index} nodeRef={imageRefs.current[index] || (imageRefs.current[index] = React.createRef())}>
                    <div ref={imageRefs.current[index]} className="position-absolute" style={{ cursor: 'move' }}>
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
