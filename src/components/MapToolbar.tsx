import { Layers, Plus, Minus, Map, PenTool, Compass, LocateFixed, Satellite, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type MapStyle = "dark" | "satellite";

interface MapToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onStyleChange?: (style: MapStyle) => void;
  onToggleLayers?: () => void;
  onToggleDraw?: () => void;
  onResetNorth?: () => void;
  onLocateUser?: () => void;
  onToggleNdvi?: () => void;
  onToggleFpoMode?: () => void;
  
  isDrawing?: boolean;
  showFields?: boolean;
  showNdvi?: boolean;
  fpoMode?: boolean;
  defaultStyle?: MapStyle;
}

const MapToolbar = ({
  onZoomIn,
  onZoomOut,
  onStyleChange,
  onToggleLayers,
  onToggleDraw,
  onResetNorth,
  onLocateUser,
  onToggleNdvi,
  onToggleFpoMode,
  
  isDrawing,
  showFields = true,
  showNdvi = false,
  fpoMode = false,
  defaultStyle = "dark",
}: MapToolbarProps) => {
  const [currentStyle, setCurrentStyle] = useState<MapStyle>(defaultStyle);

  const handleStyleToggle = () => {
    const next: MapStyle = currentStyle === "dark" ? "satellite" : "dark";
    setCurrentStyle(next);
    onStyleChange?.(next);
  };

  const items = [
    { icon: Layers, onClick: onToggleLayers ?? (() => {}), label: showFields ? "Hide Regions" : "Show Regions", active: showFields },
    { icon: Plus, onClick: onZoomIn, label: "Zoom In" },
    { icon: Minus, onClick: onZoomOut, label: "Zoom Out" },
    { icon: Map, onClick: handleStyleToggle, label: currentStyle === "dark" ? "Satellite" : "Dark Mode", active: currentStyle === "satellite" },
    { icon: PenTool, onClick: onToggleDraw ?? (() => {}), label: "Draw Region", active: isDrawing },
    { icon: Satellite, onClick: onToggleNdvi ?? (() => {}), label: showNdvi ? "Hide NDVI" : "NDVI Overlay", active: showNdvi },
    { icon: Compass, onClick: onResetNorth ?? (() => {}), label: "Reset North" },
    { icon: LocateFixed, onClick: onLocateUser ?? (() => {}), label: "My Location" },
    { icon: ShieldAlert, onClick: onToggleFpoMode ?? (() => {}), label: fpoMode ? "Exit Officer Mode" : "🔴 Officer / FPO Mode", active: fpoMode, highlight: true },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 opacity-85">
        {items.map(({ icon: Icon, onClick, label, active, highlight }: any) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <button
                onClick={onClick}
                className={`w-10 h-10 rounded-lg backdrop-blur-sm border flex items-center justify-center transition-colors ${
                  highlight && active
                    ? "text-white bg-red-600/80 border-red-500"
                    : highlight
                    ? "text-red-400 border-red-500/40 hover:bg-red-900/30"
                    : active
                    ? "text-primary bg-accent border-border"
                    : "text-foreground border-border"
                }`}
                style={{ backgroundColor: (active && !highlight) ? undefined : (highlight ? undefined : "#041009") }}
              >
                <Icon className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default MapToolbar;
