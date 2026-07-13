import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Circle } from "react-konva";
import useImage from "use-image";
import { Point } from "@/lib/photoCorrection";
import { X, Check } from "lucide-react";

interface Props {
  originalSrc: string;
  initialCorners: Point[] | null;
  onConfirm: (corners: Point[]) => void;
  onCancel: () => void;
}

export default function ManualOverrideModal({ originalSrc, initialCorners, onConfirm, onCancel }: Props) {
  const proxySrc = originalSrc.startsWith("http") ? `/api/proxy-image?url=${encodeURIComponent(originalSrc)}` : originalSrc;
  const [image] = useImage(proxySrc, "anonymous");
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [corners, setCorners] = useState<Point[]>([]);

  useEffect(() => {
    if (image && containerRef.current) {
      // Calculate scale to fit image in container
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;
      const imgRatio = image.width / image.height;
      const containerRatio = containerW / containerH;
      
      let finalW = containerW;
      let finalH = containerH;
      if (imgRatio > containerRatio) {
        finalH = containerW / imgRatio;
      } else {
        finalW = containerH * imgRatio;
      }
      setStageSize({ width: finalW, height: finalH });

      // Initialize corners scaled to display size
      const scaleX = finalW / image.width;
      const scaleY = finalH / image.height;

      if (initialCorners && initialCorners.length === 4) {
        setCorners(initialCorners.map(c => ({ x: c.x * scaleX, y: c.y * scaleY })));
      } else {
        // Default to a 10% inset rectangle
        const insetX = finalW * 0.1;
        const insetY = finalH * 0.1;
        setCorners([
          { x: insetX, y: insetY },
          { x: finalW - insetX, y: insetY },
          { x: finalW - insetX, y: finalH - insetY },
          { x: insetX, y: finalH - insetY },
        ]);
      }
    }
  }, [image, initialCorners]);

  const handleDragMove = (index: number, e: any) => {
    const newCorners = [...corners];
    newCorners[index] = {
      x: Math.max(0, Math.min(stageSize.width, e.target.x())),
      y: Math.max(0, Math.min(stageSize.height, e.target.y()))
    };
    setCorners(newCorners);
  };

  const handleConfirm = () => {
    if (!image) return;
    // Map back to original image scale
    const scaleX = image.width / stageSize.width;
    const scaleY = image.height / stageSize.height;
    const originalScaleCorners = corners.map(c => ({
      x: Math.round(c.x * scaleX),
      y: Math.round(c.y * scaleY)
    }));
    onConfirm(originalScaleCorners);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl min-h-[70vh] max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">Adjust Print Boundaries</h2>
          <button onClick={onCancel} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 bg-gray-900 p-4 flex items-center justify-center min-h-0" ref={containerRef}>
          {image && stageSize.width > 0 && (
            <Stage width={stageSize.width} height={stageSize.height} className="border border-gray-600 shadow-lg">
              <Layer>
                <KonvaImage image={image} width={stageSize.width} height={stageSize.height} />
                
                {corners.length === 4 && (
                  <>
                    <Line
                      points={[
                        corners[0].x, corners[0].y,
                        corners[1].x, corners[1].y,
                        corners[2].x, corners[2].y,
                        corners[3].x, corners[3].y,
                        corners[0].x, corners[0].y, // close the loop
                      ]}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      closed
                    />
                    
                    {corners.map((corner, i) => (
                      <Circle
                        key={i}
                        x={corner.x}
                        y={corner.y}
                        radius={10}
                        fill="white"
                        stroke="#2563eb"
                        strokeWidth={3}
                        draggable
                        onDragMove={(e) => handleDragMove(i, e)}
                        onMouseEnter={e => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'grab';
                        }}
                        onMouseLeave={e => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                    ))}
                  </>
                )}
              </Layer>
            </Stage>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Drag the 4 corners to accurately wrap the physical photo print.
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Apply Correction
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
