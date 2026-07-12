"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { TemplateData } from "@/types";

interface Props {
  onTemplateLoaded: (template: TemplateData) => void;
}

export default function TemplateUpload({ onTemplateLoaded }: Props) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    // Ensure it's an image
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file (PNG, JPG)");
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onTemplateLoaded({
          file,
          image: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => {
        setError("Failed to parse image");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [onTemplateLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] },
    maxFiles: 1,
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Step 1: Upload Template</h2>
        <p className="text-gray-500 mt-2">Upload your memento or certificate background image</p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`mx-auto h-12 w-12 ${isDragActive ? "text-blue-500" : "text-gray-400"}`} />
        <p className="mt-4 text-sm text-gray-600">
          {isDragActive
            ? "Drop the template here..."
            : "Drag & drop a template image here, or click to select"}
        </p>
        <p className="text-xs text-gray-400 mt-2">Supports PNG, JPG (Ideally high resolution)</p>
      </div>

      <div className="mt-6 border-t pt-6 text-center">
        <button
          onClick={async () => {
            setError(null);
            try {
              const dataUrl = "/default-template.png";
              const img = new Image();
              img.onload = () => {
                // Mock a file object since we loaded from URL
                const mockFile = new File([new Blob()], "default-template.png", { type: "image/png" });
                onTemplateLoaded({
                  file: mockFile,
                  image: img,
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                });
              };
              img.onerror = () => {
                setError("Failed to load default template.");
              };
              img.src = dataUrl;
            } catch (err: any) {
              setError("Failed to load default template: " + err.message);
              console.error(err);
            }
          }}
          className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
        >
          Use Default Common Template (PNG)
        </button>
      </div>
      
      {error && <p className="mt-4 text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
