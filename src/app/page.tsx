"use client";

import React, { useState } from "react";
import { TemplateData, LayoutConfig, Student } from "@/types";
import TemplateUpload from "@/components/TemplateUpload";
import CalibrationStage from "@/components/CalibrationStage";
import DataUpload from "@/components/DataUpload";
import AutoCorrectStage from "@/components/AutoCorrectStage";
import PreviewPane from "@/components/PreviewPane";
import BatchGenerator from "@/components/BatchGenerator";
import { RefreshCcw, ArrowRight } from "lucide-react";

const initialLayout: LayoutConfig = {
  photoBox: {
    x: 100, y: 100, width: 200, height: 200, shape: "rectangle", objectFit: "cover", cornerRadius: 0
  },
  nameBox: {
    x: 100, y: 350, width: 300, height: 50, fontFamily: "Arial", fontSize: 40, fontWeight: "bold", color: "#000000", align: "center", autoShrink: true
  }
};

export default function Home() {
  const [step, setStep] = useState<number>(1);
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [layout, setLayout] = useState<LayoutConfig>(initialLayout);
  const [students, setStudents] = useState<Student[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleStartOver = () => {
    if (confirm("Are you sure you want to start over? All progress will be lost.")) {
      setStep(1);
      setTemplate(null);
      setLayout(initialLayout);
      setStudents([]);
      setPreviewIndex(0);
    }
  };

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Memento Generator</h1>
            <p className="text-gray-500">Client-side batch generation tool</p>
          </div>
          {step > 1 && (
            <button 
              onClick={handleStartOver}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition"
            >
              <RefreshCcw className="h-4 w-4" /> Start Over
            </button>
          )}
        </header>

        {/* Stepper indicators */}
        <div className="flex gap-2 mb-8 max-w-3xl mx-auto">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className="flex-1">
              <div className={`h-2 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`text-xs mt-1 text-center font-medium ${s <= step ? 'text-blue-600' : 'text-gray-400'}`}>
                {s === 1 && "Template"}
                {s === 2 && "Calibrate"}
                {s === 3 && "Data"}
                {s === 4 && "AI Correct"}
                {s === 5 && "Generate"}
              </div>
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <TemplateUpload 
              onTemplateLoaded={(t) => {
                setTemplate(t);
                // Try to place defaults somewhat reasonably based on size
                setLayout({
                  photoBox: {
                    ...initialLayout.photoBox,
                    x: t.width / 2 - 150,
                    y: t.height / 3 - 150,
                    width: 300,
                    height: 300
                  },
                  nameBox: {
                    ...initialLayout.nameBox,
                    x: t.width / 2 - 300,
                    y: (t.height / 3) * 2,
                    width: 600,
                    height: 100,
                    fontSize: Math.floor(t.width / 20)
                  }
                });
                setStep(2);
              }}
            />
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && template && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <CalibrationStage 
              template={template} 
              layout={layout} 
              onChange={setLayout}
              onConfirm={() => setStep(3)}
            />
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <DataUpload 
              onDataLoaded={(data) => {
                setStudents(data);
                setStep(4);
              }}
            />
          </div>
        )}

        {/* Step 4: AI Auto Correct */}
        {step === 4 && template && students.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AutoCorrectStage 
              students={students}
              onComplete={(corrected) => {
                setStudents(corrected);
                setStep(5);
              }}
              onSkip={() => setStep(5)}
            />
          </div>
        )}

        {/* Step 5: Preview and Batch */}
        {step === 5 && template && students.length > 0 && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
            
            <section className="max-w-5xl mx-auto">
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Student Selector */}
                <div className="w-full md:w-1/3 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col max-h-[600px]">
                  <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Step 5: Preview</h3>
                  <div className="text-sm text-gray-500 mb-4">
                    Select a student to preview how their memento will look.
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {students.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPreviewIndex(idx)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3
                          ${previewIndex === idx ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                      >
                        <img 
                          src={s.photo.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(s.photo)}` : s.photo} 
                          alt={s.name} 
                          className="w-10 h-10 rounded-full object-cover bg-gray-200" 
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>' }}
                        />
                        <span className="font-medium truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setStep(2)}
                    className="mt-4 py-2 px-4 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                  >
                    Adjust Layout
                  </button>
                </div>

                {/* Preview Canvas */}
                <div className="w-full md:w-2/3">
                  <PreviewPane 
                    template={template} 
                    layout={layout} 
                    student={students[previewIndex]} 
                  />
                </div>

              </div>
            </section>

            <BatchGenerator 
              template={template} 
              layout={layout} 
              students={students} 
            />

          </div>
        )}

      </div>
    </main>
  );
}
