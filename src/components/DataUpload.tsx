"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { Student } from "@/types";
import { DatasetSchema } from "@/lib/schema";

interface Props {
  onDataLoaded: (data: Student[]) => void;
}

export default function DataUpload({ onDataLoaded }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");

  const parseAndValidate = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const result = DatasetSchema.safeParse(parsed);
      
      if (result.success) {
        setError(null);
        onDataLoaded(result.data);
      } else {
        const firstError = result.error.issues[0];
        setError(`Validation error at index ${String(firstError.path[0])}: ${firstError.message}`);
      }
    } catch (e) {
      setError("Invalid JSON format");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseAndValidate(text);
    };
    reader.readAsText(file);
  }, [onDataLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/json": [".json"] },
    maxFiles: 1,
  });

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      setError("Please paste some JSON first");
      return;
    }
    parseAndValidate(textInput);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Step 3: Upload Student Data</h2>
        <p className="text-gray-500 mt-2">Upload a JSON file or paste JSON containing student names and photos.</p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`mx-auto h-10 w-10 ${isDragActive ? "text-blue-500" : "text-gray-400"}`} />
        <p className="mt-2 text-sm text-gray-600">Drag & drop a .json file here</p>
      </div>

      <div className="text-center text-sm text-gray-400 my-4">OR</div>

      <div>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder='[{"name": "Jane Doe", "photo": "https://..."}]'
          className="w-full h-32 p-3 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <button
          onClick={handleTextSubmit}
          className="mt-2 w-full py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
        >
          Parse JSON Text
        </button>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
