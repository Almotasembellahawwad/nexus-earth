import {
  Activity,
  Flame,
  Mountain,
  Wind,
  Waves,
  Compass,
  Layers3,
  Globe2,
  type LucideIcon,
} from 'lucide-react';
import type { EventType } from '@/lib/types';
export const ICONS: Record<EventType, LucideIcon> = {
  earthquake: Activity,
  wildfire: Flame,
  volcano: Mountain,
  storm: Wind,
  flood: Waves,
  drought: Compass,
  iceberg: Layers3,
  other: Globe2,
};
