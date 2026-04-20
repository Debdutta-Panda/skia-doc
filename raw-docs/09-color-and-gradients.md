# Color And Gradients

## What This Document Covers

This page is the deep guide for color and gradients in the current Skia documentation set.

It is grounded in your local headers:

- `include/core/SkColor.h`
- `include/core/SkColorSpace.h`
- `include/core/SkShader.h`
- `include/core/SkTileMode.h`
- `include/effects/SkGradient.h`

This document covers:

- `SkColor`
- `SkColor4f`
- color constants and channel helpers
- HSV conversion helpers
- premultiplied vs unpremultiplied color
- `SkColorSpace`
- tile modes
- solid-color shaders
- gradient description via `SkGradient`
- gradient interpolation
- linear gradients
- radial gradients
- two-point conical gradients
- sweep gradients
- local matrices on gradients
- shader composition related to color/gradient use

The goal here is usage-first and exhaustive for the color-and-gradient surface you have locally.

## 1. The Two Main Public Color Forms

In normal public Skia usage, the two most important color representations are:

- `SkColor`
- `SkColor4f`

### `SkColor`

Your local `SkColor.h` defines `SkColor` as:

- a 32-bit ARGB color
- unpremultiplied
- always in a known component order

This is the most common convenience color type in everyday Skia code.

### `SkColor4f`

Your local `SkColor.h` also defines float RGBA color representation, exposed publicly as `SkColor4f`.

This is useful when:

- you want float precision
- you want color-space-aware APIs
- you are constructing gradients and advanced color workflows

## 2. Creating `SkColor`

Your local header exposes these direct helpers:

- `SkColorSetARGB(a, r, g, b)`
- `SkColorSetRGB(r, g, b)`
- `SkColorSetA(color, alpha)`

### `SkColorSetARGB(...)`

```cpp
#include "include/core/SkColor.h"

SkColor color = SkColorSetARGB(255, 240, 120, 40);
```

### `SkColorSetRGB(...)`

```cpp
SkColor color = SkColorSetRGB(20, 120, 220);
```

This always produces an opaque color.

### `SkColorSetA(...)`

```cpp
SkColor blue = SK_ColorBLUE;
SkColor translucentBlue = SkColorSetA(blue, 128);
```

This replaces only the alpha channel.

## 3. Reading Color Channels

Your local header provides channel extraction macros:

- `SkColorGetA(color)`
- `SkColorGetR(color)`
- `SkColorGetG(color)`
- `SkColorGetB(color)`

Real usage:

```cpp
SkColor color = SkColorSetARGB(255, 240, 120, 40);

U8CPU a = SkColorGetA(color);
U8CPU r = SkColorGetR(color);
U8CPU g = SkColorGetG(color);
U8CPU b = SkColorGetB(color);
```

This is useful when:

- inspecting colors
- debugging channel values
- converting between representations

## 4. Built-In Color Constants

Your local `SkColor.h` defines many named constants:

- `SK_ColorTRANSPARENT`
- `SK_ColorBLACK`
- `SK_ColorWHITE`
- `SK_ColorRED`
- `SK_ColorGREEN`
- `SK_ColorBLUE`
- `SK_ColorYELLOW`
- `SK_ColorCYAN`
- `SK_ColorMAGENTA`
- plus the gray variants

Real usage:

```cpp
SkPaint paint;
paint.setColor(SK_ColorBLUE);

canvas->clear(SK_ColorWHITE);
canvas->drawRect(SkRect::MakeXYWH(40, 40, 120, 80), paint);
```

These constants are often the fastest way to make examples readable.

## 5. `SkColor4f`

`SkColor4f` is the float RGBA form used by several modern Skia APIs.

Real usage:

```cpp
SkColor4f color = {0.15f, 0.55f, 0.95f, 1.0f};

SkPaint paint;
paint.setColor4f(color);
```

It is especially useful when:

- passing colors into `SkGradient`
- working with explicit `SkColorSpace`
- avoiding repeated 8-bit packing and unpacking

### Converting From `SkColor`

```cpp
SkColor4f color4f = SkColor4f::FromColor(SK_ColorBLUE);
```

This is a very common bridge between the two color forms.

## 6. HSV Helpers

Your local `SkColor.h` exposes:

- `SkRGBToHSV(...)`
- `SkColorToHSV(...)`
- `SkHSVToColor(alpha, hsv)`
- `SkHSVToColor(hsv)`

These are useful when you want procedural color changes using hue, saturation, and value.

### Convert RGB To HSV

```cpp
SkScalar hsv[3];
SkRGBToHSV(255, 0, 0, hsv);
```

### Convert `SkColor` To HSV

```cpp
SkScalar hsv[3];
SkColorToHSV(SK_ColorBLUE, hsv);
```

### Convert HSV Back To Color

```cpp
SkScalar hsv[3] = {210.0f, 0.8f, 0.9f};
SkColor color = SkHSVToColor(255, hsv);
```

### Practical HSV Modification

```cpp
SkScalar hsv[3];
SkColorToHSV(SK_ColorBLUE, hsv);

hsv[0] += 40.0f;  // shift hue
SkColor shifted = SkHSVToColor(hsv);

SkPaint paint;
paint.setColor(shifted);
canvas->drawCircle(100, 100, 40, paint);
```

## 7. Premultiplied vs Unpremultiplied Color

Your local `SkColor.h` is explicit:

- `SkColor` is unpremultiplied
- `SkPMColor` is premultiplied

It also exposes:

- `SkPreMultiplyARGB(...)`
- `SkPreMultiplyColor(...)`

For most public API usage:

- you usually work in `SkColor` or `SkColor4f`

But it is still important to know this distinction, especially when dealing with raw pixel data.

### Premultiplication Helpers

```cpp
SkPMColor pm = SkPreMultiplyARGB(128, 255, 0, 0);
SkPMColor pm2 = SkPreMultiplyColor(SK_ColorRED);
```

## 8. `SkColorSpace`

Your local `SkColorSpace.h` provides the public color-space object used across modern Skia APIs.

Important factory APIs in your tree:

- `SkColorSpace::MakeSRGB()`
- `SkColorSpace::MakeSRGBLinear()`
- `SkColorSpace::MakeRGB(...)`
- `SkColorSpace::MakeCICP(...)`
- `SkColorSpace::Make(const skcms_ICCProfile&)`

Important query/transform APIs:

- `gammaCloseToSRGB()`
- `gammaIsLinear()`
- `isNumericalTransferFn(...)`
- `toXYZD50(...)`
- `makeLinearGamma()`
- `makeSRGBGamma()`
- `makeColorSpin()`
- `isSRGB()`
- `serialize()`
- `writeToMemory(...)`
- `Deserialize(...)`
- `Equals(...)`

## 9. Common Color Spaces

### sRGB

```cpp
sk_sp<SkColorSpace> srgb = SkColorSpace::MakeSRGB();
```

This is the default, common color space for many normal Skia workflows.

### Linear sRGB

```cpp
sk_sp<SkColorSpace> linear = SkColorSpace::MakeSRGBLinear();
```

This is useful when you want the sRGB gamut but linear gamma behavior.

### Custom RGB Color Space

Your local header exposes:

```cpp
sk_sp<SkColorSpace> cs = SkColorSpace::MakeRGB(
    SkNamedTransferFn::kSRGB,
    SkNamedGamut::kDisplayP3
);
```

This is the core route for creating a custom RGB color space from:

- a transfer function
- a gamut transform

### CICP-Based Color Space

Your local header also exposes:

```cpp
sk_sp<SkColorSpace> cs = SkColorSpace::MakeCICP(
    SkNamedPrimaries::CicpId::kRec2020,
    SkNamedTransferFn::CicpId::kPQ
);
```

This is useful when you have color-space metadata described in ITU-T H.273 terms.

## 10. Inspecting A Color Space

### Is It sRGB?

```cpp
bool isSRGB = cs->isSRGB();
```

### Is Gamma Linear?

```cpp
bool linearGamma = cs->gammaIsLinear();
```

### Is Gamma Close To sRGB?

```cpp
bool nearSRGB = cs->gammaCloseToSRGB();
```

### Convert To XYZ D50

```cpp
skcms_Matrix3x3 toXYZ;
bool ok = cs->toXYZD50(&toXYZ);
```

### Derive Related Color Spaces

```cpp
sk_sp<SkColorSpace> linearVersion = cs->makeLinearGamma();
sk_sp<SkColorSpace> srgbGammaVersion = cs->makeSRGBGamma();
sk_sp<SkColorSpace> spun = cs->makeColorSpin();
```

## 11. Serializing Color Spaces

Your local header exposes:

- `serialize()`
- `writeToMemory(...)`
- `Deserialize(...)`

### Serialize To `SkData`

```cpp
sk_sp<SkData> encoded = cs->serialize();
```

### Serialize To Caller Memory

```cpp
size_t size = cs->writeToMemory(nullptr);
std::vector<uint8_t> buffer(size);
cs->writeToMemory(buffer.data());
```

### Deserialize

```cpp
sk_sp<SkColorSpace> decoded =
    SkColorSpace::Deserialize(buffer.data(), buffer.size());
```

## 12. `SkTileMode`

Your local `SkTileMode.h` defines four tile modes:

- `kClamp`
- `kRepeat`
- `kMirror`
- `kDecal`

These matter for:

- gradients
- image shaders
- shader sampling outside original content bounds

### What They Mean

- `kClamp`: extend the edge color
- `kRepeat`: repeat the shader/image
- `kMirror`: repeat with mirrored alternation
- `kDecal`: transparent-black outside original bounds

You will see tile mode in nearly every serious gradient workflow.

## 13. Solid-Color Shaders

Even though this doc is gradient-focused, your local `SkShader.h` also provides shader APIs for solid color.

### Solid Color Shader From `SkColor`

```cpp
#include "include/core/SkShader.h"

sk_sp<SkShader> shader = SkShaders::Color(SK_ColorBLUE);

SkPaint paint;
paint.setShader(shader);
canvas->drawRect(SkRect::MakeXYWH(40, 40, 140, 80), paint);
```

### Solid Color Shader From `SkColor4f`

```cpp
sk_sp<SkColorSpace> srgb = SkColorSpace::MakeSRGB();
sk_sp<SkShader> shader =
    SkShaders::Color(SkColor4f{0.2f, 0.6f, 1.0f, 1.0f}, srgb);
```

This matters because gradients are also shaders, and it helps to understand that “solid color” and “gradient” are both shader-based sources.

## 14. What A Gradient Is In This API

In your local Skia tree, gradients are created via:

- `SkGradient`
- then a shader factory in `SkShaders`

That means gradient creation is a two-part process:

1. describe the colors and interpolation
2. create a shader of a specific gradient family

## 15. `SkGradient`

Your local `SkGradient.h` defines two key nested types:

- `SkGradient::Colors`
- `SkGradient::Interpolation`

### `SkGradient::Colors`

This wraps:

- `SkSpan<const SkColor4f>` colors
- optional positions
- tile mode
- optional `SkColorSpace`

### `SkGradient::Interpolation`

This wraps:

- premul interpolation choice
- interpolation color space
- hue interpolation method

That means your local gradient API is more expressive than just “a couple of colors and stops.”

## 16. The Simplest Gradient Setup

```cpp
#include "include/effects/SkGradient.h"

SkColor4f colors[] = {
    SkColor4f::FromColor(SK_ColorBLUE),
    SkColor4f::FromColor(SK_ColorCYAN),
};

SkGradient gradient(
    SkGradient::Colors(colors, SkTileMode::kClamp),
    SkGradient::Interpolation()
);
```

This is the basic reusable gradient description object.

## 17. Color Stops / Positions

Your local `SkGradient::Colors` constructor allows explicit stop positions.

### Without Explicit Positions

```cpp
SkColor4f colors[] = {
    SkColor4f::FromColor(SK_ColorRED),
    SkColor4f::FromColor(SK_ColorYELLOW),
    SkColor4f::FromColor(SK_ColorBLUE),
};

SkGradient::Colors colorSpec(colors, SkTileMode::kClamp);
```

This distributes colors evenly.

### With Explicit Positions

```cpp
SkColor4f colors[] = {
    SkColor4f::FromColor(SK_ColorRED),
    SkColor4f::FromColor(SK_ColorYELLOW),
    SkColor4f::FromColor(SK_ColorBLUE),
};

float pos[] = {0.0f, 0.2f, 1.0f};

SkGradient::Colors colorSpec(colors, pos, SkTileMode::kClamp);
```

This gives explicit control over where each stop appears.

## 18. Gradient Interpolation

Your local `SkGradient::Interpolation` supports:

- premul interpolation
- interpolation color space
- hue interpolation method

### Default Interpolation

```cpp
SkGradient::Interpolation interp;
```

This uses:

- destination interpolation space
- non-premul interpolation by default
- shorter hue interpolation as default when hue-based spaces matter

### Explicit Interpolation Setup

```cpp
SkGradient::Interpolation interp;
interp.fInPremul = SkGradient::Interpolation::InPremul::kYes;
interp.fColorSpace = SkGradient::Interpolation::ColorSpace::kSRGBLinear;
interp.fHueMethod = SkGradient::Interpolation::HueMethod::kShorter;
```

### Constructing A Gradient With Explicit Interpolation

```cpp
SkGradient gradient(
    SkGradient::Colors(colorArray, positions, SkTileMode::kClamp, SkColorSpace::MakeSRGB()),
    interp
);
```

## 19. Linear Gradient

Your local `SkGradient.h` exposes:

- `SkShaders::LinearGradient(...)`

### Minimal Linear Gradient

```cpp
SkPoint pts[2] = {{40, 40}, {240, 40}};

SkColor4f colors[] = {
    SkColor4f::FromColor(SK_ColorBLUE),
    SkColor4f::FromColor(SK_ColorCYAN),
};

SkGradient gradient(
    SkGradient::Colors(colors, SkTileMode::kClamp),
    SkGradient::Interpolation()
);

sk_sp<SkShader> shader = SkShaders::LinearGradient(pts, gradient);

SkPaint paint;
paint.setShader(shader);
canvas->drawRect(SkRect::MakeXYWH(40, 40, 220, 100), paint);
```

### Linear Gradient With Stops

```cpp
SkPoint pts[2] = {{40, 40}, {260, 40}};

SkColor4f colors[] = {
    SkColor4f::FromColor(SK_ColorRED),
    SkColor4f::FromColor(SK_ColorYELLOW),
    SkColor4f::FromColor(SK_ColorBLUE),
};

float pos[] = {0.0f, 0.25f, 1.0f};

SkGradient gradient(
    SkGradient::Colors(colors, pos, SkTileMode::kClamp),
    SkGradient::Interpolation()
);

sk_sp<SkShader> shader = SkShaders::LinearGradient(pts, gradient);
```

### Linear Gradient With Repeat Tile Mode

```cpp
SkGradient gradient(
    SkGradient::Colors(colors, pos, SkTileMode::kRepeat),
    SkGradient::Interpolation()
);

sk_sp<SkShader> shader = SkShaders::LinearGradient(pts, gradient);
```

This is how you create repeating stripe-like gradient patterns.

## 20. Radial Gradient

Your local `SkGradient.h` exposes:

- `SkShaders::RadialGradient(center, radius, grad, localMatrix)`

### Minimal Radial Gradient

```cpp
SkColor4f colors[] = {
    SkColor4f::FromColor(SK_ColorWHITE),
    SkColor4f::FromColor(SK_ColorBLUE),
};

SkGradient gradient(
    SkGradient::Colors(colors, SkTileMode::kClamp),
    SkGradient::Interpolation()
);

sk_sp<SkShader> shader =
    SkShaders::RadialGradient(SkPoint{140, 140}, 80.0f, gradient);

SkPaint paint;
paint.setShader(shader);
canvas->drawCircle(140, 140, 80, paint);
```

### Radial Gradient With Mirror Tiling

```cpp
SkGradient gradient(
    SkGradient::Colors(colors, SkTileMode::kMirror),
    SkGradient::Interpolation()
);

sk_sp<SkShader> shader =
    SkShaders::RadialGradient(SkPoint{140, 140}, 80.0f, gradient);
```

## 21. Two-Point Conical Gradient

Your local `SkGradient.h` exposes:

- `SkShaders::TwoPointConicalGradient(...)`

This is the conical/two-circle gradient family.

### Real Usage

```cpp
SkColor4f colors[] = {
    SkColor4f::FromColor(SK_ColorRED),
    SkColor4f::FromColor(SK_ColorBLUE),
};

SkGradient gradient(
    SkGradient::Colors(colors, SkTileMode::kClamp),
    SkGradient::Interpolation()
);

sk_sp<SkShader> shader = SkShaders::TwoPointConicalGradient(
    SkPoint{100, 100},
    20.0f,
    SkPoint{180, 140},
    90.0f,
    gradient
);

SkPaint paint;
paint.setShader(shader);
canvas->drawRect(SkRect::MakeXYWH(40, 40, 260, 180), paint);
```

Use this when you need a gradient defined between two circles rather than just a line or a single center radius.

## 22. Sweep Gradient

Your local `SkGradient.h` exposes:

- `SkShaders::SweepGradient(center, startAngle, endAngle, grad, lm)`
- and the convenience full-sweep overload

### Full Sweep Gradient

```cpp
SkColor4f colors[] = {
    SkColor4f::FromColor(SK_ColorRED),
    SkColor4f::FromColor(SK_ColorYELLOW),
    SkColor4f::FromColor(SK_ColorGREEN),
    SkColor4f::FromColor(SK_ColorCYAN),
    SkColor4f::FromColor(SK_ColorBLUE),
    SkColor4f::FromColor(SK_ColorMAGENTA),
    SkColor4f::FromColor(SK_ColorRED),
};

SkGradient gradient(
    SkGradient::Colors(colors, SkTileMode::kClamp),
    SkGradient::Interpolation()
);

sk_sp<SkShader> shader =
    SkShaders::SweepGradient(SkPoint{140, 140}, gradient);

SkPaint paint;
paint.setShader(shader);
canvas->drawCircle(140, 140, 100, paint);
```

### Partial Sweep Gradient

```cpp
sk_sp<SkShader> shader =
    SkShaders::SweepGradient(SkPoint{140, 140}, 45.0f, 270.0f, gradient);
```

This is useful when the angular range is intentionally limited.

## 23. Local Matrix On Gradients

All four gradient families in your local header accept an optional local matrix.

This allows you to transform the shader independently of the geometry being drawn.

### Linear Gradient With Local Matrix

```cpp
#include "include/core/SkMatrix.h"

SkMatrix local;
local.setRotate(45.0f, 140.0f, 90.0f);

sk_sp<SkShader> shader = SkShaders::LinearGradient(pts, gradient, &local);
```

### Radial Gradient With Local Matrix

```cpp
SkMatrix local;
local.setScale(1.0f, 0.6f);

sk_sp<SkShader> shader =
    SkShaders::RadialGradient(SkPoint{140, 140}, 80.0f, gradient, &local);
```

This is one of the most useful ways to make gradients feel more flexible without changing destination geometry.

## 24. Gradients In Different Color Spaces

Your local `SkGradient::Colors` supports an optional `SkColorSpace`.

That means the color values in the gradient can be interpreted in a specific color space instead of assuming sRGB.

### Example With Explicit sRGB Color Space

```cpp
sk_sp<SkColorSpace> srgb = SkColorSpace::MakeSRGB();

SkColor4f colors[] = {
    {0.1f, 0.4f, 1.0f, 1.0f},
    {0.8f, 0.1f, 0.2f, 1.0f},
};

SkGradient gradient(
    SkGradient::Colors(colors, SkTileMode::kClamp, srgb),
    SkGradient::Interpolation()
);
```

### Example With Display P3

```cpp
sk_sp<SkColorSpace> displayP3 =
    SkColorSpace::MakeRGB(SkNamedTransferFn::kSRGB, SkNamedGamut::kDisplayP3);

SkGradient gradient(
    SkGradient::Colors(colors, SkTileMode::kClamp, displayP3),
    SkGradient::Interpolation()
);
```

## 25. Interpolation Color Spaces

Your local `SkGradient::Interpolation::ColorSpace` enum is richer than the old-style gradient APIs many users expect.

It includes:

- destination
- sRGB linear
- Lab
- OKLab
- LCH
- OKLCH
- HSL
- HWB
- DisplayP3
- Rec2020
- ProPhoto RGB
- A98 RGB

### Explicit Interpolation In Linear sRGB

```cpp
SkGradient::Interpolation interp;
interp.fColorSpace = SkGradient::Interpolation::ColorSpace::kSRGBLinear;

SkGradient gradient(
    SkGradient::Colors(colors, pos, SkTileMode::kClamp),
    interp
);
```

### Explicit Interpolation In OKLab

```cpp
SkGradient::Interpolation interp;
interp.fColorSpace = SkGradient::Interpolation::ColorSpace::kOKLab;

SkGradient gradient(
    SkGradient::Colors(colors, pos, SkTileMode::kClamp),
    interp
);
```

This is one of the deeper parts of your local gradient system and should be treated as a genuine tool, not just trivia.

## 26. Hue Interpolation Method

Your local `SkGradient::Interpolation` also includes:

- `kShorter`
- `kLonger`
- `kIncreasing`
- `kDecreasing`

These matter for hue-based interpolation spaces such as:

- LCH
- OKLCH
- HSL
- HWB

### Explicit Hue Method Example

```cpp
SkGradient::Interpolation interp;
interp.fColorSpace = SkGradient::Interpolation::ColorSpace::kHSL;
interp.fHueMethod = SkGradient::Interpolation::HueMethod::kLonger;

SkGradient gradient(
    SkGradient::Colors(colors, pos, SkTileMode::kClamp),
    interp
);
```

## 27. Premultiplied Gradient Interpolation

Your local interpolation type also includes:

- `InPremul::kNo`
- `InPremul::kYes`

### Explicit Premul Interpolation

```cpp
SkGradient::Interpolation interp;
interp.fInPremul = SkGradient::Interpolation::InPremul::kYes;

SkGradient gradient(
    SkGradient::Colors(colors, pos, SkTileMode::kClamp),
    interp
);
```

This matters most when alpha variation is part of the gradient design.

## 28. Shader Variants Related To Color Work

Your local `SkShader.h` also exposes several useful related shader APIs:

- `SkShaders::Blend(...)`
- `SkShaders::CoordClamp(...)`
- `SkShaders::Image(...)`
- `SkShaders::RawImage(...)`
- `SkShader::makeWithLocalMatrix(...)`
- `SkShader::makeWithColorFilter(...)`
- `SkShader::makeWithWorkingColorSpace(...)`

These are not gradient families, but they matter in advanced color/shader workflows.

### Blend Two Shaders

```cpp
sk_sp<SkShader> a = SkShaders::Color(SK_ColorBLUE);
sk_sp<SkShader> b = SkShaders::Color(SK_ColorRED);

sk_sp<SkShader> blended = SkShaders::Blend(SkBlendMode::kSrcOver, a, b);
```

### Apply A Local Matrix To A Shader

```cpp
SkMatrix local;
local.setScale(2.0f, 1.0f);

sk_sp<SkShader> scaled = shader->makeWithLocalMatrix(local);
```

### Apply A Color Filter To A Shader

```cpp
sk_sp<SkShader> filtered = shader->makeWithColorFilter(colorFilter);
```

### Working Color Space For A Shader

```cpp
sk_sp<SkShader> csAdjusted =
    shader->makeWithWorkingColorSpace(SkColorSpace::MakeSRGBLinear(), SkColorSpace::MakeSRGB());
```

## 29. Genuine End-To-End Example: Gradient Gallery

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkSurface.h"
#include "include/effects/SkGradient.h"

void GradientGallery() {
    SkImageInfo info = SkImageInfo::MakeN32Premul(900, 700);
    sk_sp<SkSurface> surface = SkSurfaces::Raster(info);
    if (!surface) {
        return;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorWHITE);

    {
        SkPoint pts[2] = {{20, 40}, {260, 40}};
        SkColor4f colors[] = {
            SkColor4f::FromColor(SK_ColorBLUE),
            SkColor4f::FromColor(SK_ColorCYAN),
        };
        SkGradient gradient(
            SkGradient::Colors(colors, SkTileMode::kClamp),
            SkGradient::Interpolation()
        );
        SkPaint paint;
        paint.setShader(SkShaders::LinearGradient(pts, gradient));
        canvas->drawRect(SkRect::MakeXYWH(20, 20, 240, 80), paint);
    }

    {
        SkColor4f colors[] = {
            SkColor4f::FromColor(SK_ColorWHITE),
            SkColor4f::FromColor(SK_ColorRED),
        };
        SkGradient gradient(
            SkGradient::Colors(colors, SkTileMode::kClamp),
            SkGradient::Interpolation()
        );
        SkPaint paint;
        paint.setShader(SkShaders::RadialGradient(SkPoint{140, 200}, 80.0f, gradient));
        canvas->drawCircle(140, 200, 80, paint);
    }

    {
        SkColor4f colors[] = {
            SkColor4f::FromColor(SK_ColorRED),
            SkColor4f::FromColor(SK_ColorBLUE),
        };
        SkGradient gradient(
            SkGradient::Colors(colors, SkTileMode::kClamp),
            SkGradient::Interpolation()
        );
        SkPaint paint;
        paint.setShader(SkShaders::TwoPointConicalGradient(
            SkPoint{340, 160}, 20.0f,
            SkPoint{430, 220}, 90.0f,
            gradient));
        canvas->drawRect(SkRect::MakeXYWH(280, 100, 220, 160), paint);
    }

    {
        SkColor4f colors[] = {
            SkColor4f::FromColor(SK_ColorRED),
            SkColor4f::FromColor(SK_ColorYELLOW),
            SkColor4f::FromColor(SK_ColorGREEN),
            SkColor4f::FromColor(SK_ColorCYAN),
            SkColor4f::FromColor(SK_ColorBLUE),
            SkColor4f::FromColor(SK_ColorMAGENTA),
            SkColor4f::FromColor(SK_ColorRED),
        };
        SkGradient gradient(
            SkGradient::Colors(colors, SkTileMode::kClamp),
            SkGradient::Interpolation()
        );
        SkPaint paint;
        paint.setShader(SkShaders::SweepGradient(SkPoint{700, 180}, gradient));
        canvas->drawCircle(700, 180, 100, paint);
    }
}
```

## 30. Common Mistakes

### Mistake 1: Treating `SkColor` As Premultiplied

Your local header is explicit that `SkColor` is unpremultiplied.

### Mistake 2: Forgetting That Tile Mode Changes Gradient Behavior Outside The Core Domain

`kClamp`, `kRepeat`, `kMirror`, and `kDecal` are materially different.

### Mistake 3: Assuming Gradient Stops Must Always Include 0 And 1

Your local gradient comments explain that missing edge stops may be filled in automatically.

### Mistake 4: Ignoring Color Space In Advanced Color Work

If wide-gamut or transfer-function correctness matters, explicit `SkColorSpace` use matters.

### Mistake 5: Confusing Gradient Geometry With Draw Geometry

A gradient shader defines color distribution. The geometry you draw determines where that shader is sampled.

### Mistake 6: Forgetting The Local Matrix Option

A gradient can often be fixed more cleanly by changing its local matrix instead of changing destination geometry.

## 31. Rules Of Thumb

- use `SkColor` for simple day-to-day color setup
- use `SkColor4f` when precision or color-space-aware APIs matter
- use `SkColorSpace::MakeSRGB()` as the practical default unless you know you need something else
- use explicit stop positions when distribution matters
- start with `kClamp` tile mode unless you specifically want repeat, mirror, or decal behavior
- use linear or perceptual interpolation spaces intentionally, not accidentally
- treat gradients as shaders first and geometry second

## What To Remember

- color in Skia is not just a packed integer; the API also supports float color and explicit color spaces
- gradients in your local Skia tree are built from `SkGradient` plus `SkShaders::*Gradient(...)`
- there are four main gradient families: linear, radial, two-point conical, and sweep
- tile mode, interpolation space, and local matrix are all first-class parts of real gradient behavior

## Next Step

The natural next document is `text-and-fonts`, unless you want to switch directly into `SVG`, `PDF`, or `Skottie`.
