# Skottie in Skia: Comprehensive Guide with a Minimal Full Win32 C++ App

This document covers the Skottie module in the local Skia tree.

It focuses on the real public API surface for:

- loading Lottie JSON animations
- rendering them with Skia
- seeking by normalized time, frame index, or seconds
- text and font setup
- image/resource loading
- basic observation hooks
- slot-based runtime overrides

This guide is grounded in the local sources:

- `modules/skottie/include/Skottie.h`
- `modules/skottie/include/SkottieProperty.h`
- `modules/skottie/include/SlotManager.h`
- `modules/skresources/include/SkResources.h`
- `modules/skshaper/utils/FactoryHelpers.h`

## 1. The main idea

Skottie is Skia's Lottie animation player.

The normal flow is:

1. load a Lottie JSON animation
2. create a `skottie::Animation`
3. advance it with `seek(...)`, `seekFrame(...)`, or `seekFrameTime(...)`
4. render it into an `SkCanvas`

The single most important rule from the local `Skottie.h` header is:

- it is undefined behavior to call `render()` on a newly created animation before calling one of the `seek()` variants

So the lifecycle is always:

1. build animation
2. seek to an initial frame
3. render

## 2. The central objects

### `skottie::Animation`

This is the loaded Lottie animation object.

Important APIs:

- `Make(...)`
- `Make(SkStream*)`
- `MakeFromFile(...)`
- `render(...)`
- `seek(...)`
- `seekFrame(...)`
- `seekFrameTime(...)`
- `duration()`
- `fps()`
- `inPoint()`
- `outPoint()`
- `version()`
- `size()`

### `skottie::Animation::Builder`

Use the builder when you need real application control.

It lets you set:

- `setResourceProvider(...)`
- `setFontManager(...)`
- `setPropertyObserver(...)`
- `setLogger(...)`
- `setMarkerObserver(...)`
- `setPrecompInterceptor(...)`
- `setExpressionManager(...)`
- `setTextShapingFactory(...)`

It also exposes:

- `getStats()`
- `getSlotManager()`
- `getLayerInfo()`

### `skottie::Logger`

Receives parse errors and warnings.

### `skottie::MarkerObserver`

Receives composition markers discovered during build.

### `skottie::PropertyObserver`

Lets you capture and later manipulate exposed animation properties.

### `skottie::SlotManager`

Lets you override slot-backed values at runtime:

- color
- image
- scalar
- vec2
- text

## 3. The simplest Skottie load path

If you just want to load a file:

```cpp
#include "modules/skottie/include/Skottie.h"

sk_sp<skottie::Animation> LoadAnimationSimple(const char* path) {
    return skottie::Animation::MakeFromFile(path);
}
```

That is valid, but the practical production path is usually the builder.

## 4. The recommended builder path

```cpp
#include "include/core/SkFontMgr.h"
#include "modules/skottie/include/Skottie.h"
#include "modules/skshaper/utils/FactoryHelpers.h"

sk_sp<skottie::Animation> LoadAnimationWithBuilder(const char* path) {
    skottie::Animation::Builder builder;
    builder.setFontManager(SkFontMgr::RefDefault());
    builder.setTextShapingFactory(SkShapers::BestAvailable());
    return builder.makeFromFile(path);
}
```

Why this is better:

- text layers can use a real font manager
- shaping can be better than primitive fallback
- you can later add resources, logging, markers, and property hooks without changing the load model

## 5. The three seek domains

Skottie exposes three practical ways to advance time.

### `seek(t)`

Normalized time in `[0..1]`.

```cpp
animation->seek(0.0f);
animation->seek(0.5f);
animation->seek(1.0f);
```

This is the easiest UI-facing control.

### `seekFrame(frameIndex)`

Frame-based seeking.

```cpp
animation->seekFrame(0.0);
animation->seekFrame(12.0);
animation->seekFrame(24.5);
```

Use this when your external timing model is frame-based.

### `seekFrameTime(seconds)`

Time in seconds, relative to `duration()`.

```cpp
animation->seekFrameTime(0.0);
animation->seekFrameTime(0.25);
animation->seekFrameTime(1.75);
```

Use this when your clock is already in seconds.

## 6. Rendering basics

### Render at intrinsic size

```cpp
#include "include/core/SkCanvas.h"
#include "modules/skottie/include/Skottie.h"

void RenderAnimationFullCanvas(SkCanvas* canvas, skottie::Animation* animation) {
    if (!canvas || !animation) {
        return;
    }

    animation->render(canvas);
}
```

### Render into a destination rectangle

```cpp
#include "include/core/SkRect.h"

void RenderAnimationIntoRect(SkCanvas* canvas,
                             skottie::Animation* animation,
                             float x, float y,
                             float w, float h) {
    if (!canvas || !animation) {
        return;
    }

    const SkRect dst = SkRect::MakeXYWH(x, y, w, h);
    animation->render(canvas, &dst);
}
```

### Render with flags

```cpp
void RenderAnimationWithFlags(SkCanvas* canvas,
                              skottie::Animation* animation,
                              const SkRect& dst) {
    if (!canvas || !animation) {
        return;
    }

    const uint32_t flags =
        skottie::Animation::kSkipTopLevelIsolation |
        skottie::Animation::kDisableTopLevelClipping;

    animation->render(canvas, &dst, flags);
}
```

Use flags only when you understand the tradeoff:

- `kSkipTopLevelIsolation`
  useful when rendering into a known transparent buffer
- `kDisableTopLevelClipping`
  allows drawing outside intrinsic animation bounds

## 7. Querying animation metadata

```cpp
#include "modules/skottie/include/Skottie.h"

void PrintAnimationInfo(skottie::Animation* animation) {
    if (!animation) {
        return;
    }

    const SkSize size = animation->size();
    const double duration = animation->duration();
    const double fps = animation->fps();
    const double inPoint = animation->inPoint();
    const double outPoint = animation->outPoint();
    const SkString version = animation->version();

    (void)size;
    (void)duration;
    (void)fps;
    (void)inPoint;
    (void)outPoint;
    (void)version;
}
```

The most practically useful values are:

- `size()`
- `duration()`
- `fps()`

## 8. Minimal full Win32 C++ app

This is a minimal complete Win32 app that:

- creates a window
- loads a Lottie JSON file with Skottie
- uses a timer-based clock
- seeks in seconds
- renders into a raster `SkSurface`
- blits that pixel buffer to the window with `StretchDIBits`

This sample is intentionally simple:

- no GPU
- no Direct3D
- no backend-specific Skia setup
- just Win32 + raster Skia + Skottie

### Full app code

```cpp
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <cstdint>
#include <memory>
#include <vector>

#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkFontMgr.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkRect.h"
#include "include/core/SkSurface.h"
#include "include/core/SkSurfaces.h"
#include "modules/skottie/include/Skottie.h"
#include "modules/skshaper/utils/FactoryHelpers.h"

struct AppState {
    sk_sp<skottie::Animation> animation;
    sk_sp<SkSurface> surface;
    std::vector<std::uint32_t> pixels;
    BITMAPINFO bmi = {};
    int width = 0;
    int height = 0;
    ULONGLONG startTick = 0;
};

static AppState gApp;

static bool ResizeBackbuffer(int width, int height) {
    if (width <= 0 || height <= 0) {
        return false;
    }

    gApp.width = width;
    gApp.height = height;
    gApp.pixels.assign(static_cast<size_t>(width) * static_cast<size_t>(height), 0);

    const SkImageInfo info = SkImageInfo::MakeN32Premul(width, height);
    const size_t rowBytes = static_cast<size_t>(width) * sizeof(std::uint32_t);

    gApp.surface = SkSurfaces::WrapPixels(info, gApp.pixels.data(), rowBytes);
    if (!gApp.surface) {
        return false;
    }

    ZeroMemory(&gApp.bmi, sizeof(gApp.bmi));
    gApp.bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    gApp.bmi.bmiHeader.biWidth = width;
    gApp.bmi.bmiHeader.biHeight = -height;
    gApp.bmi.bmiHeader.biPlanes = 1;
    gApp.bmi.bmiHeader.biBitCount = 32;
    gApp.bmi.bmiHeader.biCompression = BI_RGB;

    return true;
}

static bool LoadAnimation(const char* path) {
    skottie::Animation::Builder builder;
    builder.setFontManager(SkFontMgr::RefDefault());
    builder.setTextShapingFactory(SkShapers::BestAvailable());

    gApp.animation = builder.makeFromFile(path);
    if (!gApp.animation) {
        return false;
    }

    gApp.animation->seekFrameTime(0.0);
    return true;
}

static void RenderFrame() {
    if (!gApp.surface || !gApp.animation || gApp.width <= 0 || gApp.height <= 0) {
        return;
    }

    const ULONGLONG now = GetTickCount64();
    const double elapsedSeconds = (now - gApp.startTick) / 1000.0;
    const double duration = gApp.animation->duration();

    double localTime = 0.0;
    if (duration > 0.0) {
        localTime = fmod(elapsedSeconds, duration);
    }

    gApp.animation->seekFrameTime(localTime);

    SkCanvas* canvas = gApp.surface->getCanvas();
    canvas->clear(SK_ColorWHITE);

    const SkRect dst = SkRect::MakeWH(static_cast<SkScalar>(gApp.width),
                                      static_cast<SkScalar>(gApp.height));
    gApp.animation->render(canvas, &dst);
}

static void Present(HDC hdc) {
    if (!gApp.surface || gApp.pixels.empty()) {
        return;
    }

    StretchDIBits(hdc,
                  0, 0, gApp.width, gApp.height,
                  0, 0, gApp.width, gApp.height,
                  gApp.pixels.data(),
                  &gApp.bmi,
                  DIB_RGB_COLORS,
                  SRCCOPY);
}

static LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
    case WM_CREATE: {
        gApp.startTick = GetTickCount64();
        SetTimer(hwnd, 1, 16, nullptr);
        return 0;
    }

    case WM_SIZE: {
        const int width = LOWORD(lParam);
        const int height = HIWORD(lParam);
        ResizeBackbuffer(width, height);
        InvalidateRect(hwnd, nullptr, FALSE);
        return 0;
    }

    case WM_TIMER: {
        InvalidateRect(hwnd, nullptr, FALSE);
        return 0;
    }

    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);

        RenderFrame();
        Present(hdc);

        EndPaint(hwnd, &ps);
        return 0;
    }

    case WM_DESTROY: {
        KillTimer(hwnd, 1);
        PostQuitMessage(0);
        return 0;
    }
    }

    return DefWindowProc(hwnd, msg, wParam, lParam);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE, LPSTR, int nCmdShow) {
    const char* kAnimationPath = "sample.json";

    if (!LoadAnimation(kAnimationPath)) {
        MessageBoxA(nullptr, "Failed to load sample.json", "Skottie", MB_ICONERROR);
        return 1;
    }

    const char kClassName[] = "SkottieWin32App";

    WNDCLASSA wc = {};
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = kClassName;
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);

    if (!RegisterClassA(&wc)) {
        return 1;
    }

    HWND hwnd = CreateWindowExA(
        0,
        kClassName,
        "Skottie Win32 Minimal",
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT,
        960, 640,
        nullptr,
        nullptr,
        hInstance,
        nullptr);

    if (!hwnd) {
        return 1;
    }

    ShowWindow(hwnd, nCmdShow);
    UpdateWindow(hwnd);

    MSG msg;
    while (GetMessage(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return static_cast<int>(msg.wParam);
}
```

## 9. Why this Win32 sample is a good baseline

This sample demonstrates the real minimum that matters:

- builder-based load
- initial `seekFrameTime(0.0)`
- CPU raster rendering
- window resize handling
- repeated time-based playback
- presentation into a standard Win32 `HDC`

It avoids extra complexity from:

- OpenGL
- Ganesh
- Graphite
- Dawn
- Direct3D

That makes it the right first Skottie app.

## 10. How the Win32 sample works

### Pixel buffer ownership

The app owns:

- `std::vector<std::uint32_t> pixels`

Then it wraps that memory with:

- `SkSurfaces::WrapPixels(...)`

So Skia renders directly into the same memory that Win32 later displays with `StretchDIBits(...)`.

### Top-down DIB

The sample uses:

- `biHeight = -height`

That makes the DIB top-down, which matches normal screen-space expectations better.

### Timer-driven redraw

The sample uses:

- `SetTimer(hwnd, 1, 16, nullptr)`

That is a simple ~60 FPS clock.

### Seconds-based animation time

The sample uses:

- `seekFrameTime(...)`

This is usually the simplest real playback model on desktop because system clocks naturally produce elapsed seconds.

## 11. A slightly smaller one-shot render example

If you do not need a full app yet:

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkFontMgr.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkRect.h"
#include "include/core/SkSurface.h"
#include "include/core/SkSurfaces.h"
#include "modules/skottie/include/Skottie.h"
#include "modules/skshaper/utils/FactoryHelpers.h"

sk_sp<SkSurface> RenderSingleSkottieFrame(const char* path, int width, int height, double tSeconds) {
    skottie::Animation::Builder builder;
    builder.setFontManager(SkFontMgr::RefDefault());
    builder.setTextShapingFactory(SkShapers::BestAvailable());

    sk_sp<skottie::Animation> animation = builder.makeFromFile(path);
    if (!animation) {
        return nullptr;
    }

    animation->seekFrameTime(tSeconds);

    auto surface = SkSurfaces::Raster(
        SkImageInfo::MakeN32Premul(width, height));
    if (!surface) {
        return nullptr;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorTRANSPARENT);

    const SkRect dst = SkRect::MakeWH(static_cast<SkScalar>(width),
                                      static_cast<SkScalar>(height));
    animation->render(canvas, &dst);

    return surface;
}
```

## 12. Text support in Skottie

Skottie text can require:

- font lookup
- fallback
- shaping
- locale-aware behavior

So for real text animations, the safe baseline is:

```cpp
skottie::Animation::Builder builder;
builder.setFontManager(SkFontMgr::RefDefault());
builder.setTextShapingFactory(SkShapers::BestAvailable());
```

If you skip `setTextShapingFactory(...)`:

- local `Skottie.h` says text will be shaped with primitive shaping

That can be acceptable for simple Latin text, but it is not the best general choice.

## 13. Image and external resource support

Skottie uses:

- `setResourceProvider(...)`

when the animation references external resources such as images.

### File-based resources

```cpp
#include "include/core/SkFontMgr.h"
#include "modules/skottie/include/Skottie.h"
#include "modules/skresources/include/SkResources.h"
#include "modules/skshaper/utils/FactoryHelpers.h"

sk_sp<skottie::Animation> LoadAnimationWithResources(const char* jsonPath,
                                                     const char* baseDir) {
    auto resourceProvider = skresources::FileResourceProvider::Make(
        SkString(baseDir),
        skresources::ImageDecodeStrategy::kLazyDecode);

    skottie::Animation::Builder builder;
    builder.setResourceProvider(resourceProvider);
    builder.setFontManager(SkFontMgr::RefDefault());
    builder.setTextShapingFactory(SkShapers::BestAvailable());

    return builder.makeFromFile(jsonPath);
}
```

### Data URI capable resources

```cpp
sk_sp<skottie::Animation> LoadAnimationWithFileAndDataUriResources(
        const char* jsonPath,
        const char* baseDir) {
    auto fontMgr = SkFontMgr::RefDefault();

    auto fileProvider = skresources::FileResourceProvider::Make(
        SkString(baseDir),
        skresources::ImageDecodeStrategy::kLazyDecode);

    auto cachedProvider = skresources::CachingResourceProvider::Make(fileProvider);

    auto resourceProvider = skresources::DataURIResourceProviderProxy::Make(
        cachedProvider,
        skresources::ImageDecodeStrategy::kLazyDecode,
        fontMgr);

    skottie::Animation::Builder builder;
    builder.setResourceProvider(resourceProvider);
    builder.setFontManager(fontMgr);
    builder.setTextShapingFactory(SkShapers::BestAvailable());

    return builder.makeFromFile(jsonPath);
}
```

## 14. Builder stats

The builder exposes build-time stats:

```cpp
#include "modules/skottie/include/Skottie.h"

void LoadAndInspectStats(const char* path) {
    skottie::Animation::Builder builder;
    sk_sp<skottie::Animation> animation = builder.makeFromFile(path);
    if (!animation) {
        return;
    }

    const auto& stats = builder.getStats();
    const float totalLoadMS = stats.fTotalLoadTimeMS;
    const float jsonParseMS = stats.fJsonParseTimeMS;
    const float sceneParseMS = stats.fSceneParseTimeMS;
    const size_t jsonSize = stats.fJsonSize;
    const size_t animatorCount = stats.fAnimatorCount;

    (void)totalLoadMS;
    (void)jsonParseMS;
    (void)sceneParseMS;
    (void)jsonSize;
    (void)animatorCount;
}
```

These are useful for:

- performance tracking
- regression comparisons
- build/load profiling

## 15. Logging parse warnings and errors

### Logger implementation

```cpp
#include "modules/skottie/include/Skottie.h"

class SimpleSkottieLogger final : public skottie::Logger {
public:
    void log(Level level, const char message[], const char* json) override {
        (void)level;
        (void)message;
        (void)json;
    }
};
```

### Use the logger

```cpp
skottie::Animation::Builder builder;
builder.setLogger(sk_make_sp<SimpleSkottieLogger>());
sk_sp<skottie::Animation> animation = builder.makeFromFile("sample.json");
```

## 16. Marker observation

If the animation contains markers, you can observe them at build time.

```cpp
#include "modules/skottie/include/Skottie.h"

class SimpleMarkerObserver final : public skottie::MarkerObserver {
public:
    void onMarker(const char name[], float t0, float t1) override {
        (void)name;
        (void)t0;
        (void)t1;
    }
};
```

Use it like this:

```cpp
skottie::Animation::Builder builder;
builder.setMarkerObserver(sk_make_sp<SimpleMarkerObserver>());
sk_sp<skottie::Animation> animation = builder.makeFromFile("sample.json");
```

## 17. Property observation

`PropertyObserver` is how you capture editable properties while parsing.

Examples of property families:

- color
- opacity
- text
- transform

### Capture a text property handle

```cpp
#include "modules/skottie/include/Skottie.h"

class DemoPropertyObserver final : public skottie::PropertyObserver {
public:
    void onTextProperty(const char node_name[],
                        const LazyHandle<TextPropertyHandle>& handleFactory) override {
        if (node_name && strcmp(node_name, "Title") == 0) {
            titleHandle = handleFactory();
        }
    }

    std::unique_ptr<TextPropertyHandle> titleHandle;
};
```

### Change the text after load

```cpp
auto observer = sk_make_sp<DemoPropertyObserver>();

skottie::Animation::Builder builder;
builder.setPropertyObserver(observer);
builder.setFontManager(SkFontMgr::RefDefault());
builder.setTextShapingFactory(SkShapers::BestAvailable());

sk_sp<skottie::Animation> animation = builder.makeFromFile("sample.json");

if (animation && observer->titleHandle) {
    auto value = observer->titleHandle->get();
    value.fText = SkString("Hello from Skottie");
    value.fFillColor = SK_ColorBLUE;
    value.fHasFill = true;
    observer->titleHandle->set(value);
}
```

## 18. SlotManager usage

If the animation is authored with slots, the builder exposes a slot manager.

### Get the slot manager

```cpp
skottie::Animation::Builder builder;
sk_sp<skottie::Animation> animation = builder.makeFromFile("sample.json");
sk_sp<skottie::SlotManager> slots = builder.getSlotManager();
```

### Inspect available slot ids

```cpp
if (slots) {
    skottie::SlotManager::SlotInfo info = slots->getSlotInfo();
}
```

### Set color slot

```cpp
if (slots) {
    slots->setColorSlot("accent", SK_ColorRED);
}
```

### Set scalar slot

```cpp
if (slots) {
    slots->setScalarSlot("opacity", 0.5f);
}
```

### Set text slot

```cpp
if (slots) {
    std::optional<skottie::TextPropertyValue> textValue = slots->getTextSlot("headline");
    if (textValue.has_value()) {
        auto v = *textValue;
        v.fText = SkString("Updated headline");
        v.fHasFill = true;
        v.fFillColor = SK_ColorBLACK;
        slots->setTextSlot("headline", v);
    }
}
```

Slots are useful when the animation author intentionally exposed override points.

## 19. Layer info

The builder also exposes parsed layer metadata.

```cpp
skottie::Animation::Builder builder;
sk_sp<skottie::Animation> animation = builder.makeFromFile("sample.json");

for (const skottie::LayerInfo& layer : builder.getLayerInfo()) {
    const SkString& name = layer.fName;
    const SkSize size = layer.fSize;
    const float inPoint = layer.fInPoint;
    const float outPoint = layer.fOutPoint;

    (void)name;
    (void)size;
    (void)inPoint;
    (void)outPoint;
}
```

Useful for:

- debugging
- tooling
- editorial inspection

## 20. Common mistakes

### 1. Calling `render()` before `seek()`

This is the biggest one.

The local header explicitly says this is undefined behavior.

Always do:

```cpp
animation->seekFrameTime(0.0);
animation->render(canvas);
```

### 2. Text layers render poorly or incorrectly

Likely cause:

- no `setFontManager(...)`
- no `setTextShapingFactory(...)`

### 3. External images do not load

Likely cause:

- no `setResourceProvider(...)`

### 4. Animation timing feels wrong

Likely cause:

- mixing normalized time, frames, and seconds

Pick one domain and stay consistent.

### 5. Nothing draws because destination mapping is wrong

Likely cause:

- not passing a destination rect
- assuming intrinsic animation size matches window size

### 6. Buffer orientation is upside-down in Win32

Likely cause:

- bottom-up DIB assumptions

Use:

- negative `biHeight`

for a top-down DIB.

## 21. Practical rules of thumb

- Use `Animation::Builder` for real apps.
- Call `seekFrameTime(0.0)` immediately after a successful load.
- For desktop playback, seconds-based timing is usually the simplest.
- For text animations, set both `FontManager` and `TextShapingFactory`.
- For image-backed animations, set a `ResourceProvider`.
- Use raster first on Win32; add GPU later only if needed.

## 22. Recommended minimal Win32 baseline

If you want the shortest real recipe for Windows:

1. create a `skottie::Animation::Builder`
2. set `SkFontMgr::RefDefault()`
3. set `SkShapers::BestAvailable()`
4. `makeFromFile("sample.json")`
5. `seekFrameTime(0.0)`
6. create a 32-bit top-down DIB-backed pixel buffer
7. wrap it with `SkSurfaces::WrapPixels(...)`
8. call `seekFrameTime(currentSeconds)`
9. call `render(canvas, &dst)`
10. present with `StretchDIBits(...)`

That is the cleanest first Skottie application on Win32 C++.
