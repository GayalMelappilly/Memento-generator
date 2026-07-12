"use client";

import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer, Circle } from "react-konva";
import useImage from "use-image";
import { TemplateData, LayoutConfig, PhotoBoxConfig, NameBoxConfig } from "@/types";

interface Props {
  template: TemplateData;
  layout: LayoutConfig;
  onChange: (layout: LayoutConfig) => void;
  onConfirm: () => void;
}

export default function CalibrationStage({ template, layout, onChange, onConfirm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(800);
  
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageWidth(containerRef.current.offsetWidth);
      }
    };
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const scale = stageWidth / template.width;
  const stageHeight = template.height * scale;

  const [selectedId, selectShape] = useState<string | null>(null);

  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === "template";
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  const handlePhotoChange = (newAttrs: Partial<PhotoBoxConfig>) => {
    onChange({ ...layout, photoBox: { ...layout.photoBox, ...newAttrs } });
  };

  const handleNameChange = (newAttrs: Partial<NameBoxConfig>) => {
    onChange({ ...layout, nameBox: { ...layout.nameBox, ...newAttrs } });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto p-4">
      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden bg-gray-100 rounded-xl border border-gray-200" ref={containerRef}>
        <Stage 
          width={stageWidth} 
          height={stageHeight} 
          onMouseDown={checkDeselect}
          onTouchStart={checkDeselect}
        >
          <Layer scaleX={scale} scaleY={scale}>
            <KonvaImage image={template.image} name="template" width={template.width} height={template.height} />
            
            {/* Photo Box */}
            <EditablePhotoBox 
              shapeProps={layout.photoBox}
              isSelected={selectedId === "photo"}
              onSelect={() => selectShape("photo")}
              onChange={handlePhotoChange}
            />

            {/* Name Box */}
            <EditableNameBox
              shapeProps={layout.nameBox}
              isSelected={selectedId === "name"}
              onSelect={() => selectShape("name")}
              onChange={handleNameChange}
            />
          </Layer>
        </Stage>
      </div>

      {/* Controls Area */}
      <div className="w-full lg:w-80 space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
        <div>
          <h3 className="text-lg font-medium text-gray-800">Calibration</h3>
          <p className="text-sm text-gray-500">Drag and resize the boxes on the template.</p>
        </div>

        {selectedId === "photo" && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700 border-b pb-2">Photo Box Settings</h4>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Shape</label>
              <select 
                value={layout.photoBox.shape}
                onChange={(e) => handlePhotoChange({ shape: e.target.value as any })}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Object Fit</label>
              <select 
                value={layout.photoBox.objectFit}
                onChange={(e) => handlePhotoChange({ objectFit: e.target.value as any })}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="cover">Cover (Crop)</option>
                <option value="contain">Contain (Fit inside)</option>
              </select>
            </div>
            {layout.photoBox.shape === "rectangle" && (
              <div>
                <label className="text-sm text-gray-600 block mb-1">Corner Radius</label>
                <input 
                  type="range" min="0" max="100" 
                  value={layout.photoBox.cornerRadius || 0}
                  onChange={(e) => handlePhotoChange({ cornerRadius: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}

        {selectedId === "name" && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700 border-b pb-2">Name Box Settings</h4>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Font Family</label>
              <select 
                value={layout.nameBox.fontFamily}
                onChange={(e) => handleNameChange({ fontFamily: e.target.value })}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-gray-600 block mb-1">Size</label>
                <input 
                  type="number"
                  value={layout.nameBox.fontSize}
                  onChange={(e) => handleNameChange({ fontSize: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600 block mb-1">Color</label>
                <input 
                  type="color"
                  value={layout.nameBox.color}
                  onChange={(e) => handleNameChange({ color: e.target.value })}
                  className="w-full h-9 p-1 border rounded"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Alignment</label>
              <select 
                value={layout.nameBox.align}
                onChange={(e) => handleNameChange({ align: e.target.value as any })}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div>
              <label className="flex items-center text-sm text-gray-600 gap-2">
                <input 
                  type="checkbox"
                  checked={layout.nameBox.autoShrink}
                  onChange={(e) => handleNameChange({ autoShrink: e.target.checked })}
                />
                Auto-shrink to fit box
              </label>
            </div>
          </div>
        )}

        {!selectedId && (
          <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded">
            Click on a placeholder box on the image to edit its properties.
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(layout, null, 2));
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute("href",     dataStr);
              downloadAnchorNode.setAttribute("download", "layout.json");
              document.body.appendChild(downloadAnchorNode); // required for firefox
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
            }}
            className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition"
          >
            Export Layout
          </button>
          
          <label className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition cursor-pointer text-center">
            Import Layout
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const importedLayout = JSON.parse(event.target?.result as string);
                    // Minimal validation
                    if (importedLayout.photoBox && importedLayout.nameBox) {
                      onChange(importedLayout);
                      alert("Layout imported successfully!");
                    } else {
                      alert("Invalid layout file");
                    }
                  } catch (err) {
                    alert("Error parsing JSON");
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>
        </div>

        <button 
          onClick={onConfirm}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition mt-2"
        >
          Confirm Layout
        </button>
      </div>
    </div>
  );
}

// Editable Photo Box Sub-component
function EditablePhotoBox({ shapeProps, isSelected, onSelect, onChange }: any) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const props = {
    x: shapeProps.x,
    y: shapeProps.y,
    width: shapeProps.width,
    height: shapeProps.height,
    fill: "rgba(100, 150, 255, 0.5)",
    stroke: isSelected ? "#0066ff" : "transparent",
    strokeWidth: 2,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: any) => {
      onChange({
        ...shapeProps,
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    onTransformEnd: (e: any) => {
      const node = shapeRef.current;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        ...shapeProps,
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
      });
    }
  };

  return (
    <React.Fragment>
      {shapeProps.shape === "circle" ? (
        <Circle {...props} ref={shapeRef} x={props.x + props.width/2} y={props.y + props.height/2} radius={Math.min(props.width, props.height)/2} 
          onDragEnd={(e:any)=>{
            onChange({...shapeProps, x: e.target.x() - props.width/2, y: e.target.y() - props.height/2});
          }}
          onTransformEnd={(e: any) => {
            const node = shapeRef.current;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            node.scaleX(1);
            node.scaleY(1);
            const r = node.radius() * Math.max(scaleX, scaleY);
            node.radius(r);
            onChange({
              ...shapeProps,
              x: node.x() - r,
              y: node.y() - r,
              width: r * 2,
              height: r * 2,
            });
          }}
        />
      ) : (
        <Rect {...props} ref={shapeRef} cornerRadius={shapeProps.cornerRadius || 0} />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) return oldBox;
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
}

// Editable Name Box Sub-component
function EditableNameBox({ shapeProps, isSelected, onSelect, onChange }: any) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <Text
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        text="Sample Name"
        x={shapeProps.x}
        y={shapeProps.y}
        width={shapeProps.width}
        height={shapeProps.height}
        fontFamily={shapeProps.fontFamily}
        fontSize={shapeProps.fontSize}
        fill={shapeProps.color}
        align={shapeProps.align}
        verticalAlign="middle"
        draggable
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
          });
        }}
      />
      {/* Box highlight to make text area visible */}
      {isSelected && (
        <Rect 
          x={shapeProps.x} y={shapeProps.y} 
          width={shapeProps.width} height={shapeProps.height}
          stroke="#ff0066" strokeWidth={1} strokeDashArray={[4,4]}
          listening={false}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
}
