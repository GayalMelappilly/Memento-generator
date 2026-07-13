import cv from "@techstark/opencv-js";

// We wrap the import in this file so that it exports the cv object as default.
// This prevents the JS runtime from encountering a Module object with a .then export,
// which causes a "Method Promise.prototype.then called on incompatible receiver" error.
export default cv;
