import { markdownLinksDetector } from "./markdownLinks.js";
import { projectLayoutDetector } from "./projectLayout.js";
import type { Detector } from "../types.js";

export const DETECTORS: Detector[] = [
  projectLayoutDetector,
  markdownLinksDetector
];
