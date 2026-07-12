"use client";

import React, { useState } from "react";
import { Student, TemplateData, LayoutConfig } from "@/types";
import { renderMemento } from "@/lib/renderMemento";
import { downloadBlob, delay } from "@/lib/download";
import { toast } from "sonner";
import { PlayCircle, Loader2 } from "lucide-react";

interface Props {
  template: TemplateData;
  layout: LayoutConfig;
  students: Student[];
}

export default function BatchGenerator({ template, layout, students }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    
    let successes = 0;
    let failures = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      setProgress(i);
      
      try {
        const toastId = toast.loading(`Downloading ${i + 1} of ${students.length} — ${student.name}`);
        const blob = await renderMemento(template, student, layout);
        
        // Sanitize filename
        const safeName = student.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await downloadBlob(blob, `${safeName}_memento.jpg`);
        
        toast.dismiss(toastId);
        successes++;
        
        // Delay to prevent browser throttling/blocking auto-downloads
        await delay(600);
      } catch (err) {
        console.error(`Failed to generate memento for ${student.name}`, err);
        failures++;
        toast.error(`Failed to generate memento for ${student.name}`);
      }
    }

    setProgress(students.length);
    setIsGenerating(false);

    toast.success(`Batch complete! ${successes} downloaded. ${failures > 0 ? `${failures} failed.` : ''}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">Step 5: Batch Generate</h2>
      <p className="text-gray-500 mb-8">
        Ready to generate mementos for {students.length} students.
        Files will download sequentially to your default downloads folder.
      </p>

      {isGenerating ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 text-blue-600">
            <Loader2 className="animate-spin h-6 w-6" />
            <span className="font-medium">Processing {progress + 1} of {students.length}...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${(progress / students.length) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-400">Please leave this tab open until finished.</p>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <PlayCircle className="h-5 w-5" />
          Generate All Mementos ({students.length})
        </button>
      )}
    </div>
  );
}
