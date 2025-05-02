import React from "react";
import { cn } from "@/lib/utils";

interface BotMascotLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
  type?: "thinking" | "processing" | "strains" | "vrchat";
}

export function BotMascotLoader({
  className,
  size = "md",
  text = "Thinking...",
  type = "thinking",
}: BotMascotLoaderProps) {
  // Set dimensions based on size
  const dimensions = {
    sm: { width: 40, height: 40 },
    md: { width: 60, height: 60 },
    lg: { width: 80, height: 80 },
  };

  // Different animation styles based on type
  const animationStyles = {
    thinking: "animate-bounce",
    processing: "animate-pulse",
    strains: "animate-spin-slow",
    vrchat: "animate-float",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <div
        className={cn(
          "relative",
          animationStyles[type]
        )}
        style={{
          width: dimensions[size].width,
          height: dimensions[size].height,
        }}
      >
        {/* Bot mascot SVG */}
        <svg
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Face */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="#5865F2"
            className="animate-pulse"
          />
          
          {/* Eyes */}
          <circle
            cx="35"
            cy="40"
            r="6"
            fill="white"
            className={type === "thinking" ? "animate-blink" : ""}
          />
          <circle
            cx="65"
            cy="40"
            r="6"
            fill="white"
            className={type === "thinking" ? "animate-blink" : ""}
          />
          
          {/* Pupils */}
          <circle
            cx="35"
            cy="40"
            r="3"
            fill="black"
            className={type === "thinking" ? "animate-look" : ""}
          />
          <circle
            cx="65"
            cy="40"
            r="3"
            fill="black"
            className={type === "thinking" ? "animate-look" : ""}
          />
          
          {/* Mouth */}
          <path
            d={type === "thinking" ? "M 40,60 Q 50,70 60,60" : "M 35,60 Q 50,65 65,60"}
            stroke="white"
            strokeWidth="3"
            fill="transparent"
            className="animate-talk"
          />
          
          {/* Ears */}
          <circle cx="15" cy="40" r="10" fill="#5865F2" />
          <circle cx="85" cy="40" r="10" fill="#5865F2" />
          
          {/* Antenna */}
          {type === "processing" && (
            <>
              <line x1="50" y1="10" x2="50" y2="20" stroke="#FAA61A" strokeWidth="3" />
              <circle cx="50" cy="5" r="5" fill="#FAA61A" className="animate-pulse" />
            </>
          )}

          {/* VRChat goggles */}
          {type === "vrchat" && (
            <path
              d="M 30,35 H 70 Q 75,35 75,40 V 45 Q 75,50 70,50 H 30 Q 25,50 25,45 V 40 Q 25,35 30,35 Z"
              fill="#222"
              stroke="#43B581"
              strokeWidth="2"
              className="animate-glow"
            />
          )}

          {/* Strain leaf */}
          {type === "strains" && (
            <path
              d="M 50,15 Q 60,5 70,15 T 85,25 T 70,40 T 50,15 M 50,15 Q 40,5 30,15 T 15,25 T 30,40 T 50,15"
              fill="#43B581"
              className="animate-wave"
            />
          )}
        </svg>
      </div>
      <div className="text-sm font-medium text-muted-foreground">
        {text}
        <span className="inline-block w-6 relative overflow-hidden">
          <span className="absolute animate-ellipsis"></span>
        </span>
      </div>
    </div>
  );
}