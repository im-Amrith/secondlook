// One place for the app's icons (Lucide, MIT). Line icons at a consistent weight, sized to the
// text they sit next to; decorative, so hidden from screen readers.
import type { LucideIcon } from "lucide-react";
import { Cloud, ShieldCheck, Zap } from "lucide-react";

export {
  ArrowLeft, ArrowRight, BadgeCheck, Bell, Camera, Check, ChevronRight, CircleCheck, Cloud, EyeOff, GraduationCap, Landmark, Link2, MessageSquareText,
  Mic, OctagonX, Phone, PhoneCall, Play, Radar, Settings, ShieldAlert, ShieldCheck, Smartphone, Square, TrendingDown, TrendingUp,
  Timer, TriangleAlert, Users, Volume2, Zap,
} from "lucide-react";

/** A Lucide icon with the app's defaults. */
export function Ico({ icon: I, size = "1.2em", className = "", strokeWidth = 2 }: { icon: LucideIcon; size?: string | number; className?: string; strokeWidth?: number }) {
  return <I size={size} strokeWidth={strokeWidth} className={`ico ${className}`} aria-hidden focusable={false} />;
}

const SOURCE: Record<"device" | "cloud" | "rules", LucideIcon> = { device: ShieldCheck, cloud: Cloud, rules: Zap };

/** Where a check ran or will run: shield (this device), cloud, or bolt (quick rules check). */
export function SourceIcon({ route, size }: { route: "device" | "cloud" | "rules"; size?: string | number }) {
  return <Ico icon={SOURCE[route]} size={size} className={`source-${route}`} />;
}
