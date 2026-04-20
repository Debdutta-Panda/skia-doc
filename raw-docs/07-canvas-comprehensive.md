# SkCanvas Comprehensive Guide

## What This Document Is

This is the comprehensive `SkCanvas` guide for the current documentation set.

It is centered on one question:

"What can we actually do with `SkCanvas`, and what does real usage look like?"

Your local `SkCanvas.h` is the source of truth for this page.

This document covers the main capability areas of `SkCanvas`:

- creating canvases
- understanding what a canvas is attached to
- reading and writing pixels
- saving and restoring state
- transforming drawing
- clipping drawing
- clearing and painting the whole destination
- drawing geometry
- drawing images
- drawing text
- drawing recorded content
- drawing mesh-like and atlas content
- drawing drawables and annotations
- querying canvas state

It does not try to teach every topic from zero again. Instead, it puts the full canvas surface area into one practical map.

## What `SkCanvas` Is

Your local `SkCanvas.h` describes `SkCanvas` as:

- an interface for drawing
- an object that tracks clip and transform state
- the place where draw calls are issued into a destination

That means:

- `SkCanvas` is not primarily the pixel owner
- `SkCanvas` is the command interface layered over a destination
- the current matrix and clip affect future drawing

In most real usage:

- you get a canvas from an `SkSurface`
- you draw into it
- the surface or document is what actually owns the output

## 1. Creating Or Obtaining A Canvas

There are several ways to get an `SkCanvas`.

### From `SkSurface`

This is the most common pattern:

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkSurface.h"

SkImageInfo info = SkImageInfo::MakeN32Premul(640, 480);
sk_sp<SkSurface> surface = SkSurfaces::Raster(info);
if (!surface) {
    return;
}

SkCanvas* canvas = surface->getCanvas();
```

This is the default starting point for most real Skia drawing.

### Direct Raster Canvas With Caller Pixels

Your local header exposes:

- `SkCanvas::MakeRasterDirect(...)`
- `SkCanvas::MakeRasterDirectN32(...)`

Real usage:

```cpp
#include <vector>

#include "include/core/SkCanvas.h"
#include "include/core/SkImageInfo.h"

constexpr int width = 256;
constexpr int height = 256;
std::vector<uint32_t> pixels(width * height);

SkImageInfo info = SkImageInfo::MakeN32Premul(width, height);
size_t rowBytes = width * sizeof(uint32_t);

std::unique_ptr<SkCanvas> canvas =
    SkCanvas::MakeRasterDirect(info, pixels.data(), rowBytes);

if (!canvas) {
    return;
}
```

This is useful when:

- you already own the pixel memory
- you want direct raster drawing without first creating a surface

### Canvas That Draws Into A Bitmap

Your local header also supports construction from `SkBitmap`.

Real usage:

```cpp
#include "include/core/SkBitmap.h"
#include "include/core/SkCanvas.h"

SkBitmap bitmap;
bitmap.allocN32Pixels(320, 240);

SkCanvas canvas(bitmap);
```

The local header notes this approach may be deprecated in the future, so for general documentation:

- surface-based usage should be taught first
- bitmap-backed canvas construction should be treated as secondary

## 2. Learning What Canvas You Have

`SkCanvas` provides inspection helpers that tell you about its destination.

### `imageInfo()`

```cpp
SkImageInfo info = canvas->imageInfo();
```

This tells you the size and format information available for the canvas.

### `getSurface()`

If the canvas is owned by a surface:

```cpp
SkSurface* surface = canvas->getSurface();
```

This may be `nullptr` if the canvas was not created by a surface.

### `makeSurface(...)`

Your local header exposes:

```cpp
sk_sp<SkSurface> other = canvas->makeSurface(
    SkImageInfo::MakeN32Premul(200, 200)
);
```

This asks the canvas for a compatible surface.

### Base Layer Size And Props

Your local header also provides:

- `getBaseLayerSize()`
- `getBaseProps()`
- `getTopProps()`

These matter more in advanced usage, but they are available when you need canvas/device properties.

## 3. Pixel Access And Pixel I/O

`SkCanvas` can sometimes expose or copy pixels directly.

Your local header includes:

- `accessTopLayerPixels(...)`
- `peekPixels(...)`
- `readPixels(...)`
- `writePixels(...)`

These are extremely useful, but they do not apply to every canvas.

The local header explicitly says pixel reads are not available for some canvas types, such as:

- document-based canvases
- picture-recording canvases
- some utility canvases

### `peekPixels(...)`

This gives direct readable access if possible.

```cpp
#include "include/core/SkPixmap.h"

SkPixmap pixmap;
bool ok = canvas->peekPixels(&pixmap);
if (!ok) {
    return;
}

SkColor c = pixmap.getColor(0, 0);
```

### `readPixels(...)`

This copies pixels into caller-owned memory.

```cpp
#include <vector>

#include "include/core/SkImageInfo.h"

SkImageInfo dstInfo = SkImageInfo::MakeN32Premul(640, 480);
std::vector<uint32_t> dstPixels(dstInfo.width() * dstInfo.height());

bool ok = canvas->readPixels(
    dstInfo,
    dstPixels.data(),
    dstInfo.minRowBytes(),
    0,
    0
);

if (!ok) {
    return;
}
```

There are also overloads for:

- `SkPixmap`
- `SkBitmap`

### `writePixels(...)`

This copies caller-provided pixels into the canvas.

```cpp
bool ok = canvas->writePixels(
    dstInfo,
    dstPixels.data(),
    dstInfo.minRowBytes(),
    0,
    0
);

if (!ok) {
    return;
}
```

There is also a bitmap overload:

```cpp
bool ok = canvas->writePixels(bitmap, 0, 0);
```

### `accessTopLayerPixels(...)`

This is a lower-level direct access helper:

```cpp
SkImageInfo info;
size_t rowBytes = 0;
SkIPoint origin;

void* addr = canvas->accessTopLayerPixels(&info, &rowBytes, &origin);
if (!addr) {
    return;
}
```

This is useful when direct writable access exists, but the local header warns that the result is only valid while the canvas remains unchanged.

## 4. State Stack: `save()`, `saveLayer()`, `restore()`

The canvas state stack is one of the most important parts of `SkCanvas`.

Your local header makes this explicit:

- `save()` preserves matrix and clip state
- `restore()` brings them back
- `saveLayer()` creates an intermediate layer and restores it later

### `save()` And `restore()`

```cpp
canvas->save();
canvas->translate(100, 50);
canvas->clipRect(SkRect::MakeXYWH(0, 0, 80, 80));
canvas->drawRect(SkRect::MakeXYWH(0, 0, 160, 160), paint);
canvas->restore();
```

This is the basic local-state pattern.

### `saveCount` And `restoreToCount(...)`

Your local header also exposes:

- `getSaveCount()`
- `restoreToCount(...)`

Real usage:

```cpp
int base = canvas->getSaveCount();

canvas->save();
canvas->translate(40, 40);
canvas->save();
canvas->clipRect(SkRect::MakeXYWH(0, 0, 100, 100));

canvas->restoreToCount(base);
```

This is useful when nested code needs a reliable rollback point.

### `saveLayer(...)`

Your local header exposes several `saveLayer(...)` forms.

Basic usage:

```cpp
SkRect bounds = SkRect::MakeXYWH(40, 40, 180, 120);
SkPaint layerPaint;
layerPaint.setAlpha(180);

canvas->saveLayer(&bounds, &layerPaint);
canvas->drawRect(SkRect::MakeXYWH(40, 40, 180, 120), paintA);
canvas->drawCircle(160, 100, 50, paintB);
canvas->restore();
```

This is useful when:

- you want a group of drawing commands composited together
- you want to apply paint alpha/filtering to the group

There is also:

- `saveLayer(const SaveLayerRec&)`

for more advanced control.

## 5. Matrix And Transform Operations

Your local header exposes:

- `translate(...)`
- `scale(...)`
- `rotate(...)`
- `skew(...)`
- `concat(...)`
- `setMatrix(...)`
- `resetMatrix()`

These affect future drawing.

### `translate(...)`

```cpp
canvas->save();
canvas->translate(120, 80);
canvas->drawRect(SkRect::MakeXYWH(0, 0, 100, 60), paint);
canvas->restore();
```

### `scale(...)`

```cpp
canvas->save();
canvas->translate(80, 80);
canvas->scale(1.5f, 1.5f);
canvas->drawCircle(0, 0, 30, paint);
canvas->restore();
```

### `rotate(...)`

```cpp
canvas->save();
canvas->translate(220, 120);
canvas->rotate(25);
canvas->drawRect(SkRect::MakeXYWH(-40, -20, 80, 40), paint);
canvas->restore();
```

### `rotate(...)` Around A Pivot

```cpp
canvas->rotate(45, 200, 120);
```

### `skew(...)`

```cpp
canvas->save();
canvas->skew(0.3f, 0.0f);
canvas->drawRect(SkRect::MakeXYWH(60, 60, 120, 60), paint);
canvas->restore();
```

### `concat(...)`

```cpp
#include "include/core/SkMatrix.h"

SkMatrix matrix;
matrix.setIdentity();
matrix.setTranslate(320, 60);

canvas->save();
canvas->concat(matrix);
canvas->drawRect(SkRect::MakeXYWH(0, 0, 100, 50), paint);
canvas->restore();
```

### `setMatrix(...)` And `resetMatrix()`

`setMatrix(...)` replaces prior matrix state instead of appending to it.

```cpp
SkMatrix matrix;
matrix.setIdentity();
matrix.setScaleTranslate(2.0f, 2.0f, 40.0f, 30.0f);
canvas->setMatrix(matrix);

canvas->drawRect(SkRect::MakeXYWH(0, 0, 40, 30), paint);
canvas->resetMatrix();
```

### Querying The Current Transform

Your local header also provides:

- `getLocalToDevice()`
- `getLocalToDeviceAs3x3()`
- `getTotalMatrix()` legacy

## 6. Clipping

The main clip APIs in your local header are:

- `clipRect(...)`
- `clipRRect(...)`
- `clipPath(...)`
- `clipRegion(...)`

These limit future drawing.

### `clipRect(...)`

```cpp
canvas->save();
canvas->clipRect(SkRect::MakeXYWH(40, 40, 120, 120));
canvas->drawRect(SkRect::MakeXYWH(0, 0, 240, 240), paint);
canvas->restore();
```

### `clipRRect(...)`

```cpp
SkRRect rr = SkRRect::MakeRectXY(SkRect::MakeXYWH(40, 40, 140, 100), 20, 20);

canvas->save();
canvas->clipRRect(rr, true);
canvas->drawRect(SkRect::MakeXYWH(0, 0, 240, 200), paint);
canvas->restore();
```

### `clipPath(...)`

```cpp
SkPath clipShape = SkPath::Circle(140, 100, 60);

canvas->save();
canvas->clipPath(clipShape, true);
canvas->drawRect(SkRect::MakeXYWH(60, 20, 180, 160), paint);
canvas->restore();
```

### Clip State Queries

Your local header includes:

- `isClipEmpty()`
- `isClipRect()`

These are useful for inspection and optimization decisions.

## 7. Whole-Canvas Paint Operations

Some canvas operations are about affecting the whole current destination area rather than a single geometry object.

### `clear(...)`

```cpp
canvas->clear(SK_ColorWHITE);
```

or:

```cpp
canvas->clear(SkColor4f::FromColor(SK_ColorWHITE));
```

### `drawPaint(...)`

This applies paint across the current canvas area.

```cpp
SkPaint paint;
paint.setColor(SK_ColorBLUE);
paint.setAlpha(80);

canvas->drawPaint(paint);
```

This is useful when:

- filling the current destination with paint semantics
- applying effects or blending across the full current clip

## 8. Drawing Primitive Geometry

Your local header exposes a large set of geometry draw calls.

### `drawPoints(...)`

```cpp
SkPoint pts[] = {{40, 40}, {80, 60}, {120, 100}};

SkPaint pointPaint;
pointPaint.setColor(SK_ColorBLACK);
pointPaint.setStrokeWidth(8);
pointPaint.setStyle(SkPaint::kStroke_Style);

canvas->drawPoints(SkCanvas::kPoints_PointMode, pts, pointPaint);
```

### `drawLine(...)`

```cpp
canvas->drawLine(40, 40, 220, 120, strokePaint);
```

### `drawRect(...)`

```cpp
canvas->drawRect(SkRect::MakeXYWH(40, 140, 120, 80), fillPaint);
```

### `drawRegion(...)`

This exists in your local header, though it is a more specialized API.

```cpp
canvas->drawRegion(region, paint);
```

### `drawOval(...)`

```cpp
canvas->drawOval(SkRect::MakeXYWH(200, 40, 120, 80), fillPaint);
```

### `drawRRect(...)`

```cpp
SkRRect rrect = SkRRect::MakeRectXY(SkRect::MakeXYWH(340, 40, 140, 80), 18, 18);
canvas->drawRRect(rrect, fillPaint);
```

### `drawDRRect(...)`

This draws the area between an outer and inner rounded rectangle.

```cpp
SkRRect outer = SkRRect::MakeRectXY(SkRect::MakeXYWH(40, 240, 180, 120), 20, 20);
SkRRect inner = SkRRect::MakeRectXY(SkRect::MakeXYWH(80, 270, 100, 60), 12, 12);

canvas->drawDRRect(outer, inner, fillPaint);
```

### `drawCircle(...)`

```cpp
canvas->drawCircle(300, 300, 50, fillPaint);
```

### `drawArc(...)`

```cpp
SkRect oval = SkRect::MakeXYWH(380, 240, 120, 100);
canvas->drawArc(oval, 30, 240, true, fillPaint);
```

### `drawRoundRect(...)`

```cpp
canvas->drawRoundRect(
    SkRect::MakeXYWH(520, 240, 140, 100),
    16,
    16,
    fillPaint
);
```

### `drawPath(...)`

```cpp
SkPath triangle;
triangle.moveTo(520, 40);
triangle.lineTo(600, 140);
triangle.lineTo(440, 140);
triangle.close();

canvas->drawPath(triangle, fillPaint);
```

## 9. Drawing Images

Your local header includes:

- `drawImage(...)`
- `drawImageRect(...)`

### `drawImage(...)`

```cpp
sk_sp<SkImage> image = sourceSurface->makeImageSnapshot();
if (image) {
    canvas->drawImage(image.get(), 40, 40);
}
```

### `drawImage(...)` With Sampling And Paint

```cpp
SkSamplingOptions sampling;
SkPaint faded;
faded.setAlpha(160);

canvas->drawImage(image.get(), 180, 60, sampling, &faded);
```

### `drawImageRect(...)`

This is used when drawing a source subset into a destination rectangle.

```cpp
SkRect src = SkRect::MakeXYWH(20, 20, 80, 80);
SkRect dst = SkRect::MakeXYWH(320, 40, 160, 120);

canvas->drawImageRect(image.get(), src, dst, sampling, nullptr);
```

There is also a simpler destination-rect form:

```cpp
canvas->drawImageRect(image.get(), dst, sampling, nullptr);
```

## 10. Drawing Text

Your local header includes several text-related entry points:

- `drawSimpleText(...)`
- `drawString(...)`
- `drawGlyphs(...)`
- `drawGlyphsRSXform(...)`
- `drawTextBlob(...)`

### `drawString(...)`

```cpp
#include "include/core/SkFont.h"

SkFont font;
font.setSize(28);

SkPaint textPaint;
textPaint.setAntiAlias(true);
textPaint.setColor(SK_ColorBLACK);

canvas->drawString("Hello Skia", 40, 80, font, textPaint);
```

### `drawSimpleText(...)`

```cpp
const char text[] = "Simple text";
canvas->drawSimpleText(
    text,
    strlen(text),
    SkTextEncoding::kUTF8,
    40,
    130,
    font,
    textPaint
);
```

### `drawTextBlob(...)`

```cpp
sk_sp<SkTextBlob> blob = SkTextBlob::MakeFromString("Blob text", font);
if (blob) {
    canvas->drawTextBlob(blob, 40, 180, textPaint);
}
```

### `drawGlyphs(...)`

This is lower-level and useful when you already have glyph IDs and positions.

```cpp
SkGlyphID glyphs[] = {1, 2, 3};
SkPoint positions[] = {{0, 0}, {20, 0}, {40, 0}};

canvas->drawGlyphs(glyphs, positions, SkPoint{60, 240}, font, textPaint);
```

## 11. Drawing Recorded Content

Your local header exposes:

- `drawPicture(...)`

and your local `SkPictureRecorder.h` exposes:

- `beginRecording(...)`
- `finishRecordingAsPicture()`

### Recording And Drawing A Picture

```cpp
#include "include/core/SkPictureRecorder.h"

SkPictureRecorder recorder;
SkCanvas* recordingCanvas = recorder.beginRecording(SkRect::MakeWH(200, 200));

SkPaint paint;
paint.setColor(SK_ColorBLUE);
recordingCanvas->drawRect(SkRect::MakeXYWH(20, 20, 80, 80), paint);

sk_sp<SkPicture> picture = recorder.finishRecordingAsPicture();
if (picture) {
    canvas->drawPicture(picture);
}
```

### `drawPicture(...)` With Matrix And Paint

```cpp
SkMatrix matrix;
matrix.setTranslate(240, 40);

SkPaint picturePaint;
picturePaint.setAlpha(180);

canvas->drawPicture(picture.get(), &matrix, &picturePaint);
```

Your local header notes that if a paint is provided, the picture is drawn through a temporary layer.

## 12. Drawing Vertex And Mesh-Like Content

Your local header exposes:

- `drawVertices(...)`
- `drawMesh(...)`
- `drawPatch(...)`
- `drawAtlas(...)`

These are more advanced, but they are part of what canvas can do.

### `drawVertices(...)`

```cpp
canvas->drawVertices(vertices.get(), SkBlendMode::kModulate, paint);
```

This is for triangle-mesh style drawing with `SkVertices`.

### `drawMesh(...)`

Your local header labels this experimental.

```cpp
canvas->drawMesh(mesh, nullptr, paint);
```

### `drawPatch(...)`

This draws a Coons patch.

```cpp
canvas->drawPatch(cubics, colors, texCoords, SkBlendMode::kModulate, paint);
```

### `drawAtlas(...)`

This is for sprite-atlas style drawing from an image atlas.

```cpp
canvas->drawAtlas(
    atlas.get(),
    xforms,
    texRects,
    colors,
    SkBlendMode::kModulate,
    SkSamplingOptions(),
    nullptr,
    nullptr
);
```

These APIs are not beginner-first, but they absolutely belong in a comprehensive canvas map.

## 13. Drawing Drawables And Annotations

Your local header also includes:

- `drawDrawable(...)`
- `drawAnnotation(...)`

### `drawDrawable(...)`

```cpp
canvas->drawDrawable(drawable);
canvas->drawDrawable(drawable, 40, 60);
canvas->drawDrawable(drawable, &matrix);
```

This is for custom drawable content wrapped in `SkDrawable`.

### `drawAnnotation(...)`

```cpp
canvas->drawAnnotation(
    SkRect::MakeXYWH(40, 40, 100, 40),
    "my-key",
    data.get()
);
```

Your local header notes that annotations are mainly used by some canvas implementations such as:

- picture recording
- PDF/document output

## 14. Canvas Queries And Helpers

Your local header also provides a set of inspection helpers.

### Save Count

```cpp
int count = canvas->getSaveCount();
```

### Clip Queries

```cpp
bool empty = canvas->isClipEmpty();
bool rectClip = canvas->isClipRect();
```

### Transform Queries

```cpp
SkM44 localToDevice = canvas->getLocalToDevice();
SkMatrix localToDevice3x3 = canvas->getLocalToDeviceAs3x3();
```

### Context Queries

Your local header includes:

- `recordingContext()`
- `recorder()`
- `baseRecorder()`

These are useful when code needs to know more about the underlying recording/rendering context.

## A Real Multi-Feature Canvas Example

This example combines several of the most common canvas capabilities in one place:

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkFont.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPath.h"
#include "include/core/SkPictureRecorder.h"
#include "include/core/SkRRect.h"
#include "include/core/SkRect.h"
#include "include/core/SkSurface.h"

void CanvasFeatureDemo() {
    SkImageInfo info = SkImageInfo::MakeN32Premul(900, 520);
    sk_sp<SkSurface> surface = SkSurfaces::Raster(info);
    if (!surface) {
        return;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorWHITE);

    SkPaint fill;
    fill.setAntiAlias(true);
    fill.setColor(SK_ColorBLUE);
    canvas->drawRect(SkRect::MakeXYWH(20, 20, 120, 80), fill);

    SkRRect rr = SkRRect::MakeRectXY(SkRect::MakeXYWH(160, 20, 140, 80), 18, 18);
    SkPaint red;
    red.setAntiAlias(true);
    red.setColor(SK_ColorRED);
    canvas->drawRRect(rr, red);

    SkPath triangle;
    triangle.moveTo(380, 20);
    triangle.lineTo(440, 100);
    triangle.lineTo(320, 100);
    triangle.close();
    canvas->drawPath(triangle, fill);

    canvas->save();
    canvas->translate(540, 70);
    canvas->rotate(20);

    SkPaint stroke;
    stroke.setAntiAlias(true);
    stroke.setColor(SK_ColorBLACK);
    stroke.setStyle(SkPaint::kStroke_Style);
    stroke.setStrokeWidth(6);
    canvas->drawRect(SkRect::MakeXYWH(-40, -20, 80, 40), stroke);
    canvas->restore();

    canvas->save();
    canvas->clipPath(SkPath::Circle(760, 70, 45), true);
    canvas->drawRect(SkRect::MakeXYWH(700, 20, 120, 100), red);
    canvas->restore();

    SkFont font;
    font.setSize(28);

    SkPaint textPaint;
    textPaint.setAntiAlias(true);
    textPaint.setColor(SK_ColorBLACK);
    canvas->drawString("Canvas Demo", 20, 170, font, textPaint);

    SkPictureRecorder recorder;
    SkCanvas* rc = recorder.beginRecording(SkRect::MakeWH(120, 120));
    rc->clear(SK_ColorWHITE);
    rc->drawCircle(60, 60, 36, fill);
    sk_sp<SkPicture> picture = recorder.finishRecordingAsPicture();
    if (picture) {
        canvas->drawPicture(picture);
    }

    sk_sp<SkImage> image = surface->makeImageSnapshot();
    if (image) {
        canvas->drawImage(image.get(), 20, 220);
    }
}
```

This one sample demonstrates:

- clear
- shape drawing
- path drawing
- save/restore
- transform
- clipping
- text drawing
- picture recording and playback
- image drawing

## Common Mistakes

### Mistake 1: Treating `SkCanvas` As The Output Owner

Usually the surface or document owns the output, not the canvas itself.

### Mistake 2: Forgetting That Matrix And Clip Are Part Of Canvas State

If you do not restore after temporary changes, later drawing can be wrong.

### Mistake 3: Expecting All Canvases To Support Pixel Reads

Your local header explicitly says some canvas types are not readable with the pixel APIs.

### Mistake 4: Overusing `setMatrix(...)`

`setMatrix(...)` replaces prior matrix state. In many cases, `translate`, `scale`, or `rotate` are easier and safer.

### Mistake 5: Treating `saveLayer(...)` Like A Free Operation

It is powerful, but it creates intermediate compositing work. Use it when you need grouped drawing behavior, not by default.

### Mistake 6: Using The Most Advanced Draw API First

For many tasks, `drawRect`, `drawPath`, `drawImage`, and `drawString` are the right tools. `drawVertices`, `drawPatch`, and `drawAtlas` are specialized.

## The Practical Canvas Map

If you want the shortest possible operational summary:

- create or obtain a canvas
- inspect it if needed
- manage state with save/restore
- transform and clip future drawing
- draw geometry, images, text, or recorded content
- read or write pixels if the canvas supports it

That is the heart of `SkCanvas`.

## Next Step

The next document can go one of two ways:

1. `raw-docs/08-text-and-fonts.md`
2. `raw-docs/08-svg.md`

If we keep the core-learning flow, `text-and-fonts` is the better next step.
