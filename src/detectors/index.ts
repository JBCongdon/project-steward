import { adrQualityDetector } from "./adrQuality.js";
import { markdownLinksDetector } from "./markdownLinks.js";
import { planStateDetector } from "./planState.js";
import { policyConfigDetector } from "./policyConfig.js";
import { projectLayoutDetector } from "./projectLayout.js";
import type { Detector } from "../types.js";

export const DETECTORS: Detector[] = [
  projectLayoutDetector,
  policyConfigDetector,
  markdownLinksDetector,
  adrQualityDetector,
  planStateDetector
];
