import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// Spinner Component (scaled for thumbnails)
function Spinner({ text = "Processing..." }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <span className="text-[10px] font-medium text-white drop-shadow-lg">{text}</span>
    </div>
  );
}

// Circular Progress Component (Scaled for thumbnails)
function CircularProgress({ progress, text }) {
  const radius = 16;
  const stroke = 2;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="rgba(255,255,255,0.3)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="white"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ 
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease'
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white drop-shadow-lg">
            {progress}%
          </span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-white drop-shadow-lg text-center">
        {text}
      </span>
    </div>
  );
}

// Success State (Scaled for thumbnails)
function SuccessState({ text = "Done!" }) {
  return (
    <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-500">
      <div className="bg-green-500 rounded-full p-1">
        <CheckCircle2 className="h-6 w-6 text-white" />
      </div>
      <span className="text-[10px] font-semibold text-white drop-shadow-lg">
        {text}
      </span>
    </div>
  );
}

// Failed State (Scaled for thumbnails)
function FailedState({ text = "Failed" }) {
  return (
    <div className="flex flex-col items-center gap-1 animate-in fade-in duration-500">
      <div className="bg-red-500 rounded-full p-1">
        <AlertCircle className="h-6 w-6 text-white" />
      </div>
      <span className="text-[10px] font-semibold text-white drop-shadow-lg text-center">
        {text}
      </span>
    </div>
  );
}

// Main Vision Progress Component
export default function VisionProgressOverlay({ state, stage, progress }) {
  const stageTexts = {
    upload: 'Uploading image',
    ocr: 'Extracting text',
    layout: 'Detecting layout',
    semantic: 'Analyzing structure',
    complete: 'Analysis complete'
  };

  if (state === 'complete') {
    return <SuccessState text={stageTexts.complete} />;
  }
  
  if (state === 'failed') {
    return <FailedState />;
  }

  if (state === 'analyzing') {
    // If we have progress data, show circular progress, otherwise show spinner
    if (progress && progress > 0) {
      return (
        <CircularProgress 
          progress={progress} 
          text={stageTexts[stage] + '…'} 
        />
      );
    }
    return <Spinner text="Analyzing…" />;
  }

  return <Spinner text={stageTexts.upload + '…'} />;
}