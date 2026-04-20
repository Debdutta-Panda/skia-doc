# SkPaint Comprehensive Guide

## What This Document Is

This is the comprehensive `SkPaint` guide for the current documentation set.

It is based on your local `F:\skiaCombined\skia\include\core\SkPaint.h`, and it is meant to cover the full public paint surface area rather than only the beginner subset.

This document covers:

- what `SkPaint` is responsible for
- default construction and lifetime behavior
- copying and moving paint objects
- color and alpha
- fill and stroke style
- stroke width, miter, cap, and join
- antialiasing and dithering
- shader, color filter, blender, path effect, mask filter, and image filter attachments
- paint utility queries like `nothingToDraw()`
- fast-bounds-related helpers
- real usage examples

## What `SkPaint` Is Responsible For

Your local `SkPaint.h` describes `SkPaint` this way:

- it controls options applied when drawing
- it collects options outside the `SkCanvas` clip and matrix
- its options apply to strokes, fills, and images
- it collects effects and filters that alter geometry, color, and transparency

That makes `SkPaint` the rendering-style object for a draw call.

The practical split is:

- `SkCanvas` decides where commands go
- geometry or content decides what is being drawn
- `SkPaint` decides how that drawing should look

## 1. Construction, Reset, Copy, and Move

### Default Construction

```cpp
#include "include/core/SkPaint.h"

SkPaint paint;
```

This gives a paint object with default values.

Practical factory-style usage:

```cpp
SkPaint MakeBasePaint() {
    SkPaint paint;
    paint.setAntiAlias(true);
    paint.setDither(true);
    paint.setColor(SK_ColorBLUE);
    return paint;
}
```

### Construction With A `SkColor4f`

Your local header also exposes:

```cpp
SkPaint paint(SkColor4f{0.2f, 0.4f, 0.8f, 1.0f});
```

There is also an optional `SkColorSpace*` parameter for this constructor.

### Reset

`reset()` restores the paint to its default-initialized state:

```cpp
paint.reset();
```

This is equivalent to replacing it with a new default `SkPaint`.

Practical usage:

```cpp
SkPaint paint;
paint.setColor(SK_ColorRED);
paint.setStroke(true);
paint.setStrokeWidth(8);

paint.reset();
```

### Copy Behavior

Your local header is explicit:

- copying `SkPaint` is shallow for attached effect/filter objects
- attached `SkShader`, `SkPathEffect`, `SkMaskFilter`, `SkColorFilter`, and `SkImageFilter` objects are shared

Real usage:

```cpp
SkPaint base;
base.setAntiAlias(true);
base.setColor(SK_ColorBLUE);

SkPaint copy = base;
copy.setColor(SK_ColorRED);
```

This is a normal and useful pattern, but it matters that attached effect objects are shared by reference-counted ownership.

Another common usage pattern:

```cpp
SkPaint base;
base.setAntiAlias(true);
base.setStyle(SkPaint::kStroke_Style);
base.setStrokeWidth(6);

SkPaint blueStroke = base;
blueStroke.setColor(SK_ColorBLUE);

SkPaint redStroke = base;
redStroke.setColor(SK_ColorRED);
```

### Move Behavior

Your local header also provides move construction and move assignment.

This matters more for performance-sensitive or container-heavy code, but the main takeaway is:

- `SkPaint` supports efficient move semantics

Practical usage:

```cpp
SkPaint MakeStrokePaint() {
    SkPaint paint;
    paint.setAntiAlias(true);
    paint.setStyle(SkPaint::kStroke_Style);
    paint.setStrokeWidth(5);
    paint.setColor(SK_ColorBLACK);
    return paint;
}
```

## 2. Antialiasing

Your local header exposes:

- `isAntiAlias()`
- `setAntiAlias(bool)`

Antialiasing affects whether edge pixels may be drawn with partial transparency.

Real usage:

```cpp
SkPaint noAA;
noAA.setColor(SK_ColorBLUE);
noAA.setAntiAlias(false);

SkPaint withAA;
withAA.setColor(SK_ColorBLUE);
withAA.setAntiAlias(true);
```

Visible comparison:

```cpp
SkPaint noAA;
noAA.setColor(SK_ColorBLUE);
noAA.setAntiAlias(false);

SkPaint withAA;
withAA.setColor(SK_ColorRED);
withAA.setAntiAlias(true);

canvas->drawCircle(80, 80, 35, noAA);
canvas->drawCircle(180, 80, 35, withAA);
```

In practice:

- antialiasing is usually desirable for curves, diagonals, and text
- it may be intentionally disabled for crisp pixel-art-like rendering

## 3. Dithering

Your local header exposes:

- `isDither()`
- `setDither(bool)`

The header describes this as distributing color error to smooth color transitions.

Real usage:

```cpp
SkPaint paint;
paint.setDither(true);
```

This is a secondary paint option compared to color, style, and antialiasing, but it is part of the complete paint state.

Practical usage:

```cpp
SkPaint paint;
paint.setDither(true);
paint.setColor(SK_ColorBLUE);

canvas->drawRect(SkRect::MakeXYWH(40, 40, 160, 100), paint);
```

## 4. Style: Fill, Stroke, Stroke-And-Fill

Your local header defines `SkPaint::Style`:

- `kFill_Style`
- `kStroke_Style`
- `kStrokeAndFill_Style`

It also exposes:

- `getStyle()`
- `setStyle(Style)`
- `setStroke(bool)`

### Fill

```cpp
SkPaint fill;
fill.setColor(SK_ColorBLUE);
fill.setStyle(SkPaint::kFill_Style);

canvas->drawCircle(80, 80, 40, fill);
```

### Stroke

```cpp
SkPaint stroke;
stroke.setAntiAlias(true);
stroke.setColor(SK_ColorRED);
stroke.setStyle(SkPaint::kStroke_Style);
stroke.setStrokeWidth(8);

canvas->drawCircle(200, 80, 40, stroke);
```

### Stroke And Fill

```cpp
SkPaint both;
both.setAntiAlias(true);
both.setColor(SK_ColorBLACK);
both.setStyle(SkPaint::kStrokeAndFill_Style);
both.setStrokeWidth(6);

canvas->drawCircle(320, 80, 34, both);
```

### `setStroke(bool)`

This convenience helper switches style between fill and stroke:

```cpp
SkPaint paint;
paint.setStroke(true);   // stroke
paint.setStroke(false);  // fill
```

One real style comparison scene:

```cpp
SkPaint fill;
fill.setAntiAlias(true);
fill.setColor(SK_ColorBLUE);
fill.setStyle(SkPaint::kFill_Style);

SkPaint stroke;
stroke.setAntiAlias(true);
stroke.setColor(SK_ColorRED);
stroke.setStyle(SkPaint::kStroke_Style);
stroke.setStrokeWidth(8);

SkPaint both;
both.setAntiAlias(true);
both.setColor(SK_ColorBLACK);
both.setStyle(SkPaint::kStrokeAndFill_Style);
both.setStrokeWidth(6);

canvas->drawRect(SkRect::MakeXYWH(20, 20, 100, 60), fill);
canvas->drawRect(SkRect::MakeXYWH(150, 20, 100, 60), stroke);
canvas->drawRect(SkRect::MakeXYWH(280, 20, 100, 60), both);
```

## 5. Color

Your local header exposes:

- `getColor()`
- `getColor4f()`
- `setColor(SkColor)`
- `setColor(const SkColor4f&, SkColorSpace*)`
- `setColor4f(...)`
- `setARGB(...)`

### `setColor(SkColor)`

```cpp
SkPaint paint;
paint.setColor(SK_ColorBLUE);
```

This is the most common basics-level color entry point.

Readback:

```cpp
SkColor color = paint.getColor();
```

### `setARGB(...)`

```cpp
SkPaint paint;
paint.setARGB(255, 240, 120, 40);
```

One real color comparison scene:

```cpp
SkPaint blue;
blue.setColor(SK_ColorBLUE);

SkPaint green;
green.setColor(SK_ColorGREEN);

SkPaint orange;
orange.setARGB(255, 240, 120, 40);

canvas->drawRect(SkRect::MakeXYWH(20, 20, 100, 50), blue);
canvas->drawRect(SkRect::MakeXYWH(140, 20, 100, 50), green);
canvas->drawRect(SkRect::MakeXYWH(260, 20, 100, 50), orange);
```

### `setColor4f(...)`

```cpp
SkPaint paint;
paint.setColor4f(SkColor4f{0.1f, 0.6f, 0.9f, 1.0f});
```

This is useful when you want float color values and optional color-space-aware setup.

## 6. Alpha

Your local header exposes:

- `getAlphaf()`
- `getAlpha()`
- `setAlphaf(float)`
- `setAlpha(U8CPU)`

Alpha controls transparency.

### Integer Alpha

```cpp
SkPaint paint;
paint.setColor(SK_ColorBLUE);
paint.setAlpha(128);
```

Readback:

```cpp
uint8_t alpha8 = paint.getAlpha();
float alphaf = paint.getAlphaf();
```

### Float Alpha

```cpp
SkPaint paint;
paint.setColor(SK_ColorBLUE);
paint.setAlphaf(0.5f);
```

### Real Overlap Example

```cpp
SkPaint a;
a.setColor(SK_ColorBLUE);
a.setAlpha(160);

SkPaint b;
b.setColor(SK_ColorRED);
b.setAlpha(160);

canvas->drawRect(SkRect::MakeXYWH(40, 40, 120, 80), a);
canvas->drawRect(SkRect::MakeXYWH(100, 80, 120, 80), b);
```

## 7. Stroke Width

Your local header exposes:

- `getStrokeWidth()`
- `setStrokeWidth(SkScalar)`

Important local-header behavior:

- zero means hairline
- hairlines are always one device pixel wide
- negative stroke widths are invalid and have no effect

### Normal Stroke Width

```cpp
SkPaint paint;
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(12);
paint.setColor(SK_ColorBLACK);

canvas->drawLine(40, 40, 220, 40, paint);
```

### Hairline

```cpp
SkPaint paint;
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(0);
paint.setColor(SK_ColorBLACK);

canvas->drawLine(40, 70, 220, 70, paint);
```

## 8. Stroke Miter

Your local header exposes:

- `getStrokeMiter()`
- `setStrokeMiter(SkScalar)`

The header explains that miter limit controls when sharp corners fall back to bevel-like behavior.

Real usage:

```cpp
SkPaint paint;
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(18);
paint.setStrokeJoin(SkPaint::kMiter_Join);
paint.setStrokeMiter(8);
```

This matters most when using sharp stroked path corners.

Visible example:

```cpp
SkPath sharp;
sharp.moveTo(40, 160);
sharp.lineTo(90, 60);
sharp.lineTo(140, 160);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLACK);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(18);
paint.setStrokeJoin(SkPaint::kMiter_Join);
paint.setStrokeMiter(8);

canvas->drawPath(sharp, paint);
```

## 9. Stroke Cap

Your local header defines:

- `kButt_Cap`
- `kRound_Cap`
- `kSquare_Cap`

and exposes:

- `getStrokeCap()`
- `setStrokeCap(Cap)`

Real usage:

```cpp
SkPaint butt;
butt.setColor(SK_ColorBLACK);
butt.setStyle(SkPaint::kStroke_Style);
butt.setStrokeWidth(16);
butt.setStrokeCap(SkPaint::kButt_Cap);

SkPaint round = butt;
round.setStrokeCap(SkPaint::kRound_Cap);

SkPaint square = butt;
square.setStrokeCap(SkPaint::kSquare_Cap);

canvas->drawLine(40, 60, 180, 60, butt);
canvas->drawLine(40, 110, 180, 110, round);
canvas->drawLine(40, 160, 180, 160, square);
```

Readback:

```cpp
SkPaint::Cap cap = butt.getStrokeCap();
```

## 10. Stroke Join

Your local header defines:

- `kMiter_Join`
- `kRound_Join`
- `kBevel_Join`

and exposes:

- `getStrokeJoin()`
- `setStrokeJoin(Join)`

Real usage:

```cpp
SkPath angle;
angle.moveTo(40, 180);
angle.lineTo(100, 80);
angle.lineTo(160, 180);

SkPaint miter;
miter.setAntiAlias(true);
miter.setColor(SK_ColorBLUE);
miter.setStyle(SkPaint::kStroke_Style);
miter.setStrokeWidth(18);
miter.setStrokeJoin(SkPaint::kMiter_Join);

canvas->drawPath(angle, miter);
```

Readback:

```cpp
SkPaint::Join join = miter.getStrokeJoin();
```

## 11. Shader Attachment

Your local header exposes:

- `getShader()`
- `refShader()`
- `setShader(sk_sp<SkShader>)`

The header describes shaders as optional colors used when filling geometry, such as gradients.

Real usage pattern:

```cpp
SkPaint paint;
paint.setShader(shader);
canvas->drawRect(SkRect::MakeXYWH(40, 40, 200, 100), paint);
```

Inspection pattern:

```cpp
SkShader* rawShader = paint.getShader();
sk_sp<SkShader> ownedShader = paint.refShader();
```

### Genuine Shader Creation: Linear Gradient

```cpp
#include "include/effects/SkGradient.h"

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

### Genuine Shader Creation: Radial Gradient

```cpp
#include "include/effects/SkGradient.h"

SkColor4f radialColors[] = {
    SkColor4f::FromColor(SK_ColorWHITE),
    SkColor4f::FromColor(SK_ColorBLUE),
};

SkGradient radialGradient(
    SkGradient::Colors(radialColors, SkTileMode::kClamp),
    SkGradient::Interpolation()
);

sk_sp<SkShader> radialShader =
    SkShaders::RadialGradient(SkPoint{140, 140}, 80.0f, radialGradient);

SkPaint radialPaint;
radialPaint.setShader(radialShader);
canvas->drawCircle(140, 140, 80, radialPaint);
```

Comprehensive-document takeaway:

- a shader replaces plain solid-color fill behavior with shader-driven fill behavior
- the paint still controls the draw call; the shader is one attached component of the paint

## 12. Color Filter Attachment

Your local header exposes:

- `getColorFilter()`
- `refColorFilter()`
- `setColorFilter(sk_sp<SkColorFilter>)`

Real usage pattern:

```cpp
SkPaint paint;
paint.setColor(SK_ColorBLUE);
paint.setColorFilter(colorFilter);
```

This makes the color filter part of the paint state for subsequent draw calls using that paint.

Inspection pattern:

```cpp
SkColorFilter* rawFilter = paint.getColorFilter();
sk_sp<SkColorFilter> ownedFilter = paint.refColorFilter();
```

### Genuine Color Filter Creation: Blend

```cpp
#include "include/core/SkBlendMode.h"
#include "include/core/SkColorFilter.h"

sk_sp<SkColorFilter> colorFilter =
    SkColorFilters::Blend(SK_ColorRED, SkBlendMode::kModulate);

SkPaint paint;
paint.setColor(SK_ColorBLUE);
paint.setColorFilter(colorFilter);

canvas->drawRect(SkRect::MakeXYWH(40, 40, 160, 100), paint);
```

### Genuine Color Filter Creation: Matrix

```cpp
#include "include/core/SkColorFilter.h"

float matrix[20] = {
    1, 0, 0, 0,  0,
    0, 1, 0, 0,  0,
    0, 0, 1, 0,  0,
    0, 0, 0, 0.5f, 0
};

sk_sp<SkColorFilter> matrixFilter = SkColorFilters::Matrix(matrix);

SkPaint paint;
paint.setColorFilter(matrixFilter);
canvas->drawImage(image.get(), 40, 40, SkSamplingOptions(), &paint);
```

## 13. Blend Mode And Blender

This is one of the most important comprehensive-paint sections.

Your local header exposes:

- `asBlendMode()`
- `getBlendMode_or(...)`
- `isSrcOver()`
- `setBlendMode(SkBlendMode)`
- `getBlender()`
- `refBlender()`
- `setBlender(sk_sp<SkBlender>)`

### Blend Mode

Blend mode is the convenient enum-based path:

```cpp
#include "include/core/SkBlendMode.h"

SkPaint paint;
paint.setBlendMode(SkBlendMode::kSrcOver);
```

Readback-oriented usage:

```cpp
std::optional<SkBlendMode> maybeMode = paint.asBlendMode();
SkBlendMode mode = paint.getBlendMode_or(SkBlendMode::kSrcOver);
bool isDefaultSrcOver = paint.isSrcOver();
```

### Blender

Blender is the more general attached blend object:

```cpp
SkPaint paint;
paint.setBlender(blender);
```

Inspection pattern:

```cpp
SkBlender* rawBlender = paint.getBlender();
sk_sp<SkBlender> ownedBlender = paint.refBlender();
```

### Genuine Blender Creation: Mode Blender

```cpp
#include "include/core/SkBlender.h"
#include "include/core/SkBlendMode.h"

sk_sp<SkBlender> blender = SkBlender::Mode(SkBlendMode::kMultiply);

SkPaint paint;
paint.setBlender(blender);
paint.setColor(SK_ColorRED);

canvas->drawRect(SkRect::MakeXYWH(80, 80, 120, 80), paint);
```

### Genuine Blender Creation: Arithmetic Blender

```cpp
#include "include/effects/SkBlenders.h"

sk_sp<SkBlender> arithmetic =
    SkBlenders::Arithmetic(0.0f, 1.0f, 1.0f, 0.0f, true);

SkPaint paint;
paint.setBlender(arithmetic);
paint.setColor(SK_ColorBLUE);
canvas->drawRect(SkRect::MakeXYWH(220, 80, 120, 80), paint);
```

### Important Relationship

The local header is explicit:

- a `nullptr` blender means default `SrcOver` behavior
- `setBlendMode(...)` is a convenience helper for blender behavior expressible as an enum

### Real Overlap Example

```cpp
SkPaint blue;
blue.setColor(SK_ColorBLUE);
blue.setAlpha(180);

SkPaint red;
red.setColor(SK_ColorRED);
red.setAlpha(180);
red.setBlendMode(SkBlendMode::kSrcOver);

canvas->drawRect(SkRect::MakeXYWH(40, 40, 120, 120), blue);
canvas->drawRect(SkRect::MakeXYWH(100, 100, 120, 120), red);
```

## 14. Path Effect Attachment

Your local header exposes:

- `getPathEffect()`
- `refPathEffect()`
- `setPathEffect(sk_sp<SkPathEffect>)`

The header describes this as replacing or modifying path geometry when drawn.

Real usage pattern:

```cpp
SkPaint paint;
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(6);
paint.setPathEffect(pathEffect);

canvas->drawPath(path, paint);
```

This is one of the major examples of paint affecting more than color alone.

Inspection pattern:

```cpp
SkPathEffect* rawEffect = paint.getPathEffect();
sk_sp<SkPathEffect> ownedEffect = paint.refPathEffect();
```

### Genuine Path Effect Creation: Dash

```cpp
#include "include/effects/SkDashPathEffect.h"

SkScalar intervals[] = {10, 6};
sk_sp<SkPathEffect> dash = SkDashPathEffect::Make(intervals, 0);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLACK);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(6);
paint.setPathEffect(dash);

canvas->drawLine(40, 40, 260, 40, paint);
```

### Genuine Path Effect Creation: Rounded Corners

```cpp
#include "include/effects/SkCornerPathEffect.h"

sk_sp<SkPathEffect> roundedCorners = SkCornerPathEffect::Make(16);

SkPath path;
path.moveTo(40, 120);
path.lineTo(120, 40);
path.lineTo(200, 120);
path.lineTo(200, 200);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLUE);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(8);
paint.setPathEffect(roundedCorners);

canvas->drawPath(path, paint);
```

### Genuine Path Effect Creation: 1D Path Effect

```cpp
#include "include/effects/Sk1DPathEffect.h"

SkPath stamp;
stamp.moveTo(0, -6);
stamp.lineTo(6, 6);
stamp.lineTo(-6, 6);
stamp.close();

sk_sp<SkPathEffect> stamped = SkPath1DPathEffect::Make(
    stamp,
    24.0f,
    0.0f,
    SkPath1DPathEffect::kRotate_Style
);

SkPath guide;
guide.moveTo(40, 40);
guide.cubicTo(120, 0, 200, 120, 300, 60);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLACK);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(2);
paint.setPathEffect(stamped);

canvas->drawPath(guide, paint);
```

### Genuine Path Effect Creation: 2D Line Grid Effect

```cpp
#include "include/effects/Sk2DPathEffect.h"

SkMatrix matrix;
matrix.setScale(24.0f, 24.0f);

sk_sp<SkPathEffect> lineGrid = SkLine2DPathEffect::Make(1.5f, matrix);

SkPaint paint;
paint.setColor(SK_ColorBLUE);
paint.setPathEffect(lineGrid);

canvas->drawRect(SkRect::MakeXYWH(40, 40, 220, 140), paint);
```

### Genuine Path Effect Creation: 2D Path Tiling Effect

```cpp
#include "include/effects/Sk2DPathEffect.h"

SkPath tileShape;
tileShape.addCircle(0, 0, 4);

SkMatrix matrix;
matrix.setTranslate(20.0f, 20.0f);
matrix.preScale(18.0f, 18.0f);

sk_sp<SkPathEffect> tiled = SkPath2DPathEffect::Make(matrix, tileShape);

SkPaint paint;
paint.setColor(SK_ColorRED);
paint.setPathEffect(tiled);

canvas->drawRect(SkRect::MakeXYWH(40, 40, 220, 140), paint);
```

### Genuine Path Effect Creation: Trim Path Effect

```cpp
#include "include/effects/SkTrimPathEffect.h"

sk_sp<SkPathEffect> trim =
    SkTrimPathEffect::Make(0.25f, 0.75f, SkTrimPathEffect::Mode::kNormal);

SkPath path;
path.addCircle(140, 120, 70);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLACK);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(10);
paint.setPathEffect(trim);

canvas->drawPath(path, paint);
```

### Genuine Path Effect Creation: Discrete Path Effect

```cpp
#include "include/effects/SkDiscretePathEffect.h"

sk_sp<SkPathEffect> jagged = SkDiscretePathEffect::Make(12.0f, 4.0f, 1);

SkPath path;
path.moveTo(40, 80);
path.lineTo(120, 20);
path.lineTo(220, 100);
path.lineTo(320, 40);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLACK);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(6);
paint.setPathEffect(jagged);

canvas->drawPath(path, paint);
```

### Combining Path Effects: `MakeSum(...)`

Your local `SkPathEffect.h` defines:

- `SkPathEffect::MakeSum(first, second)`

Meaning:

- apply both effects to the original path
- add the results together

Real usage:

```cpp
SkScalar intervals[] = {10, 6};
sk_sp<SkPathEffect> dash = SkDashPathEffect::Make(intervals, 0);
sk_sp<SkPathEffect> corner = SkCornerPathEffect::Make(12);

sk_sp<SkPathEffect> sum = SkPathEffect::MakeSum(dash, corner);

SkPath path;
path.moveTo(40, 140);
path.lineTo(140, 40);
path.lineTo(240, 140);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLUE);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(8);
paint.setPathEffect(sum);

canvas->drawPath(path, paint);
```

### Combining Path Effects: `MakeCompose(...)`

Your local `SkPathEffect.h` also defines:

- `SkPathEffect::MakeCompose(outer, inner)`

Meaning:

- apply the inner effect first
- then apply the outer effect to that result

Real usage:

```cpp
SkScalar intervals[] = {10, 6};
sk_sp<SkPathEffect> dash = SkDashPathEffect::Make(intervals, 0);
sk_sp<SkPathEffect> corner = SkCornerPathEffect::Make(12);

sk_sp<SkPathEffect> composed = SkPathEffect::MakeCompose(dash, corner);

SkPath path;
path.moveTo(40, 280);
path.lineTo(140, 180);
path.lineTo(240, 280);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorRED);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(8);
paint.setPathEffect(composed);

canvas->drawPath(path, paint);
```

### `MakeSum(...)` vs `MakeCompose(...)`

Use this practical distinction:

- `MakeSum(a, b)`: both effects act on the original path, and the outputs are combined
- `MakeCompose(outer, inner)`: one effect transforms the result of the other

That means they are not interchangeable.

## 15. Mask Filter Attachment

Your local header exposes:

- `getMaskFilter()`
- `refMaskFilter()`
- `setMaskFilter(sk_sp<SkMaskFilter>)`

The header describes this as modifying the clipping mask generated from drawn geometry.

Real usage pattern:

```cpp
SkPaint paint;
paint.setColor(SK_ColorBLUE);
paint.setMaskFilter(maskFilter);

canvas->drawCircle(100, 100, 40, paint);
```

Inspection pattern:

```cpp
SkMaskFilter* rawMaskFilter = paint.getMaskFilter();
sk_sp<SkMaskFilter> ownedMaskFilter = paint.refMaskFilter();
```

### Genuine Mask Filter Creation: Blur

```cpp
#include "include/core/SkBlurTypes.h"
#include "include/core/SkMaskFilter.h"

sk_sp<SkMaskFilter> blur = SkMaskFilter::MakeBlur(kNormal_SkBlurStyle, 8.0f);

SkPaint paint;
paint.setColor(SK_ColorBLUE);
paint.setMaskFilter(blur);

canvas->drawCircle(120, 120, 40, paint);
```

### Blur With Stroke

```cpp
SkPaint stroke;
stroke.setAntiAlias(true);
stroke.setColor(SK_ColorRED);
stroke.setStyle(SkPaint::kStroke_Style);
stroke.setStrokeWidth(10);
stroke.setMaskFilter(blur);

canvas->drawRect(SkRect::MakeXYWH(200, 80, 120, 80), stroke);
```

## 16. Image Filter Attachment

Your local header exposes:

- `getImageFilter()`
- `refImageFilter()`
- `setImageFilter(sk_sp<SkImageFilter>)`

Real usage pattern:

```cpp
SkPaint paint;
paint.setImageFilter(imageFilter);

canvas->drawImage(image.get(), 40, 40, SkSamplingOptions(), &paint);
```

This is part of what makes `SkPaint` applicable not only to shapes and strokes, but also to images and more complex rendered content.

Inspection pattern:

```cpp
SkImageFilter* rawImageFilter = paint.getImageFilter();
sk_sp<SkImageFilter> ownedImageFilter = paint.refImageFilter();
```

### Genuine Image Filter Creation: Blur

```cpp
#include "include/effects/SkImageFilters.h"

sk_sp<SkImageFilter> blurFilter = SkImageFilters::Blur(6.0f, 6.0f, nullptr);

SkPaint paint;
paint.setImageFilter(blurFilter);

canvas->drawImage(image.get(), 40, 40, SkSamplingOptions(), &paint);
```

### Genuine Image Filter Creation: Drop Shadow

```cpp
#include "include/effects/SkImageFilters.h"

sk_sp<SkImageFilter> shadow =
    SkImageFilters::DropShadow(8, 8, 4, 4, SK_ColorBLACK, nullptr);

SkPaint paint;
paint.setImageFilter(shadow);

canvas->drawRect(SkRect::MakeXYWH(220, 40, 120, 80), paint);
```

### Image Filter Applied To Text

```cpp
SkFont font;
font.setSize(28);

SkPaint textPaint;
textPaint.setAntiAlias(true);
textPaint.setColor(SK_ColorBLACK);
textPaint.setImageFilter(blurFilter);

canvas->drawString("Blurred Text", 40, 220, font, textPaint);
```

### Image Filter Applied To A Saved Layer

```cpp
SkPaint layerPaint;
layerPaint.setImageFilter(shadow);

SkPaint contentPaint;
contentPaint.setColor(SK_ColorBLUE);

canvas->saveLayer(nullptr, &layerPaint);
canvas->drawRect(SkRect::MakeXYWH(40, 260, 100, 60), contentPaint);
canvas->drawCircle(180, 290, 30, contentPaint);
canvas->restore();
```

## 17. `nothingToDraw()`

Your local header exposes:

- `nothingToDraw()`

and describes it as returning true when the paint prevents all drawing.

That means:

- some combinations of paint state can effectively result in no visible output

Real usage:

```cpp
if (paint.nothingToDraw()) {
    return;
}
```

This is a useful guard in some rendering code paths.

## 18. Fast Bounds Queries

Your local header exposes:

- `canComputeFastBounds()`
- `computeFastBounds(...)`
- `computeFastStrokeBounds(...)`
- `doComputeFastBounds(...)`

The header notes that these are to-be-made-private style utilities, but they are present in the public surface of your tree and are relevant for comprehensive documentation.

### `canComputeFastBounds()`

This tells you whether the paint state allows fast computation of drawn bounds.

```cpp
if (paint.canComputeFastBounds()) {
    SkRect storage;
    const SkRect& bounds =
        paint.computeFastBounds(path.getBounds(), &storage);
    if (canvas->quickReject(bounds)) {
        return;
    }
}
```

The local header even gives this style of usage in its commentary.

Fuller pattern:

```cpp
SkRect rawBounds = SkRect::MakeXYWH(40, 40, 120, 80);
SkRect adjustedBounds;

if (paint.canComputeFastBounds()) {
    const SkRect& bounds = paint.computeFastBounds(rawBounds, &adjustedBounds);
    if (canvas->quickReject(bounds)) {
        return;
    }
}
```

### Why This Exists

Some paint features make bound computation expensive or ambiguous.

For example, the local header specifically notes:

- paint with `SkPathEffect` always returns false for fast-bounds eligibility

### `computeFastStrokeBounds(...)`

This is a stroke-oriented helper:

```cpp
SkRect storage;
const SkRect& strokeBounds =
    paint.computeFastStrokeBounds(rect, &storage);
```

### `doComputeFastBounds(...)`

This is the most override-oriented helper and is not something most application code should lead with.

For normal docs:

- mention it as part of the public surface
- avoid teaching it as a primary entry point

## 19. Paint Attachments Are Shared, Not Duplicated

Your local header makes this important:

- copied paints share attached ref-counted objects
- these objects are immutable once created and attached

That means patterns like this are normal:

```cpp
SkPaint base;
base.setShader(shader);
base.setColorFilter(colorFilter);

SkPaint a = base;
SkPaint b = base;

a.setAlpha(255);
b.setAlpha(120);
```

The alpha values diverge, but the shared attached shader/filter objects remain shared references.

## 20. What `SkPaint` Affects Depends On The Draw Call

This is one of the most important comprehensive ideas.

`SkPaint` is not interpreted identically by every draw call.

Examples:

- shape drawing cares strongly about fill/stroke/cap/join/path effect
- image drawing cares strongly about alpha, filters, blend/blender, and sometimes sampling interaction
- text drawing uses paint too, but text also has additional font-specific state outside paint

So when documenting paint comprehensively, the right mindset is:

- paint is a shared styling container
- not every field matters equally for every kind of draw call

## Real Multi-Feature Paint Example

This example intentionally exercises many paint features together:

```cpp
#include "include/core/SkBlendMode.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPath.h"
#include "include/core/SkRect.h"
#include "include/core/SkSurface.h"

void PaintComprehensiveDemo() {
    SkImageInfo info = SkImageInfo::MakeN32Premul(760, 420);
    sk_sp<SkSurface> surface = SkSurfaces::Raster(info);
    if (!surface) {
        return;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorWHITE);

    SkPaint fill;
    fill.setAntiAlias(true);
    fill.setColor(SK_ColorBLUE);
    fill.setStyle(SkPaint::kFill_Style);
    canvas->drawRect(SkRect::MakeXYWH(20, 20, 120, 80), fill);

    SkPaint stroke;
    stroke.setAntiAlias(true);
    stroke.setColor(SK_ColorRED);
    stroke.setStyle(SkPaint::kStroke_Style);
    stroke.setStrokeWidth(10);
    stroke.setStrokeCap(SkPaint::kRound_Cap);
    stroke.setStrokeJoin(SkPaint::kRound_Join);
    canvas->drawLine(180, 40, 320, 100, stroke);

    SkPath angle;
    angle.moveTo(380, 100);
    angle.lineTo(430, 20);
    angle.lineTo(490, 100);

    SkPaint miter;
    miter.setAntiAlias(true);
    miter.setColor(SK_ColorBLACK);
    miter.setStyle(SkPaint::kStroke_Style);
    miter.setStrokeWidth(14);
    miter.setStrokeJoin(SkPaint::kMiter_Join);
    miter.setStrokeMiter(6);
    canvas->drawPath(angle, miter);

    SkPaint translucent;
    translucent.setColor(SK_ColorBLUE);
    translucent.setAlpha(120);
    translucent.setBlendMode(SkBlendMode::kSrcOver);
    canvas->drawRect(SkRect::MakeXYWH(40, 160, 140, 100), translucent);

    SkPaint overlay;
    overlay.setColor(SK_ColorRED);
    overlay.setAlpha(120);
    canvas->drawRect(SkRect::MakeXYWH(100, 210, 140, 100), overlay);

    SkPaint dithered = fill;
    dithered.setDither(true);
    dithered.setARGB(255, 40, 160, 80);
    canvas->drawCircle(340, 240, 50, dithered);
}
```

This demonstrates:

- fill
- stroke
- antialiasing
- color
- alpha
- blend mode
- cap
- join
- miter
- dithering

## Common Mistakes

### Mistake 1: Expecting Stroke Width To Matter For Fill Style

It does not define an outline unless the style involves stroke behavior.

### Mistake 2: Forgetting That Attached Paint Effects Are Shared On Copy

Copying a paint does not deep-clone the attached shader/filter/path-effect objects.

### Mistake 3: Treating `setBlendMode(...)` And `setBlender(...)` As Unrelated

They are related APIs, with blend mode as the simpler enum-based entry point.

### Mistake 4: Forgetting That Some Paint State May Lead To No Drawing

`nothingToDraw()` exists for a reason.

### Mistake 5: Using Fast-Bounds Helpers Without Checking Eligibility

The local header explicitly says:

- call `computeFastBounds(...)` only if `canComputeFastBounds()` returned true

### Mistake 6: Assuming Every Paint Property Matters Equally For Every Draw Call

Paint interpretation depends on what is being drawn.

## Practical Organization Of Paint Knowledge

The easiest way to keep comprehensive paint knowledge manageable is:

1. core appearance state
2. stroke configuration
3. blending/compositing
4. attached effect/filter objects
5. utility/query helpers

That is also how this document is structured.

## What To Remember

- `SkPaint` is the style/control object for drawing behavior outside clip and matrix
- it includes both simple scalar state and attached ref-counted effect/filter objects
- copy semantics are shallow for attached effect/filter objects
- blend mode and blender are related APIs
- fast-bounds helpers exist, but they are specialized
- `nothingToDraw()` is part of the real paint surface area

## Next Step

The natural next document is `text-and-fonts`, because that is the next major area where paint interacts with other Skia object families in meaningful ways.
