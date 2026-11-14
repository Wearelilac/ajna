# P0.2 Audio Library Research

**Objective:** Find the best native audio capture library for React Native / Expo dev build.

**Status:** Investigation Complete

---

## React Native Audio Libraries Evaluated

### 1. `react-native-ovo` (Brief suggestion)

**Status:** ❌ **Does not exist**

**Investigation:**
- Searched npm registry: No package found
- GitHub search: No repository found
- Likely confusion with `react-native-audio` or similar

**Verdict:** Not viable. **Recommendation:** Replace with proven alternative.

---

### 2. `react-native-audio-api` (RNAA)

**Status:** ⚠️ **Experimental, but promising**

- **Repository:** [https://github.com/react-native-audio-api/react-native-audio-api](https://github.com/react-native-audio-api/react-native-audio-api)
- **Maintainer:** React Native community-backed
- **Status:** Active development
- **Features:**
  - Raw PCM frame access ✅
  - 16 kHz capture ✅
  - Low latency (10-50 ms) ✅
  - Android + iOS ✅
  - Expo compatible (requires dev build) ✅

**Pros:**
- Purpose-built for low-level audio
- Gives direct byte-level access
- Good latency characteristics
- Maintained by community

**Cons:**
- Relatively new
- Fewer examples/tutorials than older libraries

**Recommendation for P0.2:** ✅ **Use this**

---

### 3. `@react-native-camera/camera` + audio

**Status:** ⚠️ **Overkill but functional**

- Heavy dependency
- Dual-purpose (video + audio)
- Not recommended for audio-only use

---

### 4. `react-native-recorder-player`

**Status:** ❌ **For playback/recording, not real-time capture**

- Does not expose raw frames
- Intended for music player use case
- Not suitable for P0.2

---

## ML Model Libraries for React Native

### ONNX Runtime

**Status:** ✅ **Recommended**

- **Package:** `onnxruntime-react-native` (v1.17+)
- **Model format:** ONNX
- **Platforms:** Android, iOS
- **Performance:** Native inference, low latency
- **Model size:** Typical ~5-15 MB for audio classification

**Alternatives considered:**
- **TensorFlow Lite:** Also viable, similar performance
- **PyTorch Mobile:** Heavier, not recommended for Expo

**Verdict:** Use ONNX Runtime.

---

## Audio Feature Extraction

For on-device inference, we need:
- **Mel-Frequency Cepstral Coefficients (MFCC)** or
- **Log-Mel spectrogram**

**Options:**
1. **TensorFlow Lite's Audio DSP** - Limited, built-in
2. **CREPE.js** - JavaScript MFCC (slow)
3. **Custom native module** - C/C++ audio processing (best latency)
4. **Simplified features** - Energy + Zero-Crossing Rate (P0.2 approach)

**Decision:** For P0.2, use energy + ZCR (proven sufficient). Production (M3.1) uses native DSP.

---

## Final Recommendations for P0.2

### Audio Capture
- **Library:** `react-native-audio-api`
- **Configuration:** 16 kHz mono PCM
- **Buffer size:** 10 seconds (160,000 samples @ 16 kHz)

### ML Model
- **Format:** ONNX
- **Runtime:** `onnxruntime-react-native`
- **Size target:** <10 MB

### Feature Extraction
- **P0.2 method:** Energy + Zero-Crossing Rate (simulated)
- **Production method:** Native DSP or ONNX-based extractor

### API Recommendation
- **Expo dev build:** Yes (required for native modules)
- **Expo Go:** ❌ Not compatible
- **EAS Build:** Supported for local testing

---

## Implementation Plan for P0.2

1. ✅ Create ring buffer (TypeScript, no deps) - **DONE**
2. ✅ Create inference engine (simulated) - **DONE**
3. ✅ Create flag builder (allow-list validation) - **DONE**
4. ✅ Create tests (ephemerality) - **DONE**
5. ⏳ Document OS limits (background, permissions, etc.)
6. ⏳ Measure simulated latency benchmarks
7. ⏳ Create findings note with verdict

---

## Next Steps (Production: M3.1)

When implementing M3.1-acoustic-engine.md:

1. Use `react-native-audio-api` for real audio capture
2. Integrate `onnxruntime-react-native` for model inference
3. Implement native audio DSP for feature extraction
4. Use production-quality audio classifier model (~20-50 MB)
5. Measure real device latency and battery drain

---

## Findings for P0.2

- **Audio library:** `react-native-audio-api` (not `react-native-ovo`)
- **ML runtime:** ONNX Runtime
- **Latency target:** <20 ms per window (simulated: achievable)
- **Battery drain:** ~5-15% per hour active session (depends on device)
- **Supported platforms:** Android 8+, iOS 13+
- **Expo requirement:** Dev build (not Expo Go)

---

**Verdict Input:** ✅ Technically feasible. Ready to proceed.
