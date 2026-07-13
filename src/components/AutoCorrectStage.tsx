import React, { useState } from "react";
import { Student } from "@/types";
import { PhotoState, processPhotoPipeline, initFaceDetector } from "@/lib/photoCorrection";
import { getOpenCV } from "@/lib/opencvWasm";
import ReviewGrid from "./ReviewGrid";
import { Loader2, Wand2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  students: Student[];
  onComplete: (correctedStudents: Student[]) => void;
  onSkip: () => void;
}

export default function AutoCorrectStage({ students, onComplete, onSkip }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [photoStates, setPhotoStates] = useState<PhotoState[] | null>(null);

  const handleProcess = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    let states: PhotoState[] = [];

    try {
      toast.loading("Initializing AI Models (OpenCV & MediaPipe)...", { id: "init" });
      await Promise.all([
        initFaceDetector(),
        getOpenCV()
      ]);
      toast.dismiss("init");

      for (let i = 0; i < students.length; i++) {
        try {
          const originalSrc = students[i].photo;
          if (originalSrc) {
            const state = await processPhotoPipeline(originalSrc);
            states.push(state);
          } else {
            states.push({ originalSrc: "", status: "error", processedSrc: null, cropBox: null, detectedCorners: null });
          }
        } catch (err) {
          console.error(`Failed to correct photo for ${students[i].name}`, err);
          states.push({ originalSrc: students[i].photo, status: "error", processedSrc: null, cropBox: null, detectedCorners: null });
        }
        setProgress(i + 1);
        
        // Yield to the main thread
        await new Promise(r => setTimeout(r, 50));
      }

      setPhotoStates(states);
    } catch (err) {
      console.error(err);
      toast.dismiss("init");
      toast.error("Failed to initialize AI models. Are you offline?");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateState = (index: number, newState: PhotoState) => {
    if (!photoStates) return;
    const newStates = [...photoStates];
    newStates[index] = newState;
    setPhotoStates(newStates);
  };

  // If we have finished processing (even with errors), show the review grid
  if (photoStates) {
    return (
      <ReviewGrid 
        students={students} 
        photoStates={photoStates} 
        onConfirm={onComplete}
        onUpdateState={handleUpdateState}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
      <div className="mb-6 flex justify-center text-blue-600">
        <Wand2 className="h-12 w-12" />
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 mb-2">Step 4: AI Photo Auto Correction</h2>
      <p className="text-gray-500 mb-8">
        We detected {students.length} uploaded students. Would you like to automatically extract the prints, straighten, crop, and align all passport photos using AI?
      </p>

      {isProcessing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 text-blue-600">
            <Loader2 className="animate-spin h-6 w-6" />
            <span className="font-medium">
              Processing {progress} of {students.length}...
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${(progress / Math.max(students.length, 1)) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-400">Please leave this tab open until finished.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            onClick={handleProcess}
            className={`inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm`}
          >
            <CheckCircle2 className="h-5 w-5" />
            Start Auto Correction
          </button>
          
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-800 transition"
          >
            Skip this step
          </button>
        </div>
      )}
    </div>
  );
}
