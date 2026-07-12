"use client";

import React, { useEffect, useState } from "react";
import { Student, TemplateData, LayoutConfig } from "@/types";
import { renderMemento } from "@/lib/renderMemento";
import { Loader2 } from "lucide-react";

interface Props {
  template: TemplateData;
  layout: LayoutConfig;
  student: Student;
}

export default function PreviewPane({ template, layout, student }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function generate() {
      setLoading(true);
      setError(null);
      try {
        const blob = await renderMemento(template, student, layout);
        if (!active) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setError("Failed to generate preview.");
      } finally {
        if (active) setLoading(false);
      }
    }

    generate();

    return () => {
      active = false;
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [template, layout, student]);

  return (
    <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[400px]">
      {loading && (
        <div className="flex flex-col items-center text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p>Rendering preview...</p>
        </div>
      )}
      
      {error && (
        <div className="text-red-500">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && previewUrl && (
        <img 
          src={previewUrl} 
          alt={`Preview for ${student.name}`} 
          className="max-w-full max-h-[60vh] object-contain shadow-lg rounded"
        />
      )}
    </div>
  );
}
