let cvInstance: any = null;
let initPromise: Promise<any> | null = null;

export async function getOpenCV() {
  if (typeof window === "undefined") {
    throw new Error("OpenCV can only be loaded on the client side");
  }

  if (cvInstance) return cvInstance;
  
  if (!initPromise) {
    initPromise = new Promise(async (resolve, reject) => {
      try {
        const wrapper = await import("./opencvWrapper");
        
        let cvObj = wrapper.default;

        // If it's a promise (some wasm builds export a factory)
        if (cvObj instanceof Promise) {
            cvObj = await cvObj;
        } else if (typeof cvObj === 'function') {
            cvObj = await cvObj();
        }

        // Wait for WASM to be ready if needed
        if (cvObj.getBuildInformation) {
          cvInstance = cvObj;
          resolve(cvObj);
        } else {
          cvObj.onRuntimeInitialized = () => {
            cvInstance = cvObj;
            resolve(cvObj);
          };
        }
      } catch (err) {
        console.error("Failed to load OpenCV", err);
        reject(err);
      }
    });
  }

  return initPromise;
}
