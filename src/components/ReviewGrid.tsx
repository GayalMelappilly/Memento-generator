import React, { useState, useMemo } from "react";
import { PhotoState, Point, processPhotoPipeline } from "@/lib/photoCorrection";
import ManualOverrideModal from "./ManualOverrideModal";
import { AlertCircle, CheckCircle2, Crop, Loader2 } from "lucide-react";
import { Student } from "@/types";

interface Props {
  students: Student[];
  photoStates: PhotoState[];
  onConfirm: (finalStudents: Student[]) => void;
  onUpdateState: (index: number, newState: PhotoState) => void;
}

export default function ReviewGrid({ students, photoStates, onConfirm, onUpdateState }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const needsReviewCount = photoStates.filter(s => s.status !== "success").length;

  const handleManualConfirm = async (corners: Point[]) => {
    if (editingIndex === null) return;
    setIsProcessing(true);
    try {
      // Re-run pipeline with manual corners
      const newState = await processPhotoPipeline(photoStates[editingIndex].originalSrc, corners);
      onUpdateState(editingIndex, newState);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setEditingIndex(null);
    }
  };

  const handleFinish = () => {
    // Merge final processed srcs into students
    const finalStudents = students.map((s, i) => {
      const state = photoStates[i];
      // If success, use processed, otherwise fallback to original
      return {
        ...s,
        photo: state.processedSrc || state.originalSrc
      };
    });
    onConfirm(finalStudents);
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-200px)]">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Stage 4: Review Corrections</h2>
          <p className="text-gray-500">
            {needsReviewCount > 0 
              ? `${needsReviewCount} photo(s) failed auto-correction. Click on any photo to manually fix it.`
              : "All photos processed successfully. Click on any photo if you need to adjust it."}
          </p>
        </div>
        <button
          onClick={handleFinish}
          className="px-6 py-2 rounded-lg font-medium flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
        >
          <CheckCircle2 className="w-5 h-5" /> 
          {needsReviewCount > 0 ? `Ignore ${needsReviewCount} Errors & Continue` : "Accept & Continue"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-2">
        {photoStates.map((state, idx) => (
          <div 
            key={idx} 
            onClick={() => setEditingIndex(idx)}
            className={`relative group bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${
              state.status === 'success' ? 'border-gray-200' : 'border-amber-400 ring-2 ring-amber-400'
            }`}
          >
            <div className="bg-gray-100 relative w-full" style={{ aspectRatio: '35/45' }}>
              {state.status === "success" && state.processedSrc ? (
                <img src={state.processedSrc} className="w-full h-full object-cover" alt="Processed" />
              ) : (
                <img 
                  src={state.originalSrc.startsWith("http") ? `/api/proxy-image?url=${encodeURIComponent(state.originalSrc)}` : state.originalSrc} 
                  className="w-full h-full object-contain opacity-70" 
                  alt="Original" 
                />
              )}

              {/* Status Badge */}
              <div className="absolute top-2 left-2 flex gap-1 z-10">
                {state.status === "success" ? (
                   <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium shadow-sm">
                     <CheckCircle2 className="w-3 h-3" /> Auto
                   </span>
                ) : (
                   <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium shadow-sm">
                     <AlertCircle className="w-3 h-3" /> Fix Needed
                   </span>
                )}
              </div>
              
              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                <div className="bg-white text-gray-800 p-2 rounded-full shadow-lg flex items-center gap-2 px-4 text-sm font-medium transform scale-95 group-hover:scale-100 transition-transform">
                  <Crop className="w-4 h-4" /> 
                  {state.status === "success" ? "Adjust" : "Fix Boundaries"}
                </div>
              </div>
            </div>
            <div className="p-2 border-t text-xs text-center font-medium text-gray-700 truncate bg-white">
              {students[idx].name}
            </div>
          </div>
        ))}
      </div>

      {editingIndex !== null && (
        <ManualOverrideModal
          originalSrc={photoStates[editingIndex].originalSrc}
          initialCorners={photoStates[editingIndex].detectedCorners}
          onConfirm={handleManualConfirm}
          onCancel={() => {
            if (!isProcessing) setEditingIndex(null);
          }}
        />
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center gap-4">
             <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
             <p className="font-medium text-gray-700">Applying Corrections...</p>
          </div>
        </div>
      )}

    </div>
  );
}
