# Drawing Basics

## What This Document Covers

This page explains the normal Skia drawing flow at the API level.

The goal is not to cover every draw function. The goal is to make the basic sequence feel natural:

1. create or obtain a destination
2. get an `SkCanvas`
3. configure `SkPaint`
4. issue draw calls
5. manage state with save and restore
6. extract or present results

This page stays focused on common drawing flow, not render pipeline internals.

## The Core Drawing Sequence

Most Skia drawing follows the same shape:

1. obtain an `SkSurface` or another canvas-producing destination
2. call `getCanvas()` or otherwise receive an `SkCanvas`
3. optionally clear the destination
4. prepare one or more `SkPaint` objects
5. draw shapes, paths, text, or images
6. use save and restore around temporary transforms or clips
7. snapshot, read, encode, or present the result

If you keep that sequence in mind, many Skia examples become much easier to read.

## Start With A Destination

Before you can draw, you need somewhere for the output to go.

For most basic Skia usage, that destination is an `SkSurface`.

Your local `SkSurface.h` shows the common raster creation APIs in `SkSurfaces`:

- `SkSurfaces::Raster(...)`
- `SkSurfaces::WrapPixels(...)`
- `SkSurfaces::Null(...)`

### `SkSurfaces::Raster`

This allocates a raster surface and its backing pixels.

Use it when:

- you want Skia to allocate and manage the destination memory
- you want a normal CPU-backed drawing target

Real usage:

```cpp
#include "include/core/SkImageInfo.h"
#include "include/core/SkSurface.h"

SkImageInfo info = SkImageInfo::MakeN32Premul(width, height);
sk_sp<SkSurface> surface = SkSurfaces::Raster(info);
if (!surface) {
    return;
}
```

### `SkSurfaces::WrapPixels`

This creates a surface that draws directly into caller-provided memory.

Use it when:

- you already own the pixel buffer
- Skia should render into that existing buffer

Real usage:

```cpp
#include <vector>

#include "include/core/SkImageInfo.h"
#include "include/core/SkSurface.h"

constexpr int width = 256;
constexpr int height = 256;
std::vector<uint32_t> pixels(width * height);

SkImageInfo info = SkImageInfo::MakeN32Premul(width, height);
size_t rowBytes = width * sizeof(uint32_t);
sk_sp<SkSurface> surface = SkSurfaces::WrapPixels(info, pixels.data(), rowBytes);
if (!surface) {
    return;
}
```

### `SkSurfaces::Null`

This creates a surface with no backing pixels. The local header is explicit that drawing has no effect and `makeImageSnapshot()` returns `nullptr`.

Use it only when that behavior is intentional.

## Get The Canvas

Once you have a surface, you usually draw through its canvas:

```cpp
SkCanvas* canvas = surface->getCanvas();
```

The local `SkSurface.h` makes two important points:

- repeated `getCanvas()` calls return the same canvas
- the canvas is owned by the surface

That means:

- do not delete the returned canvas
- treat it as a borrowed drawing interface

## Clear Before Drawing

A common early step is clearing the destination:

```cpp
canvas->clear(SK_ColorWHITE);
```

Why this matters:

- newly allocated or wrapped pixel memory may not contain the background you expect
- clearing establishes a known starting state

The local `SkCanvas.h` exposes `clear(SkColor)` and `clear(const SkColor4f&)`.

In practice, clearing is often the first visible draw step in a frame or output pass.

## Use `SkPaint` To Control Appearance

Most draw calls combine geometry or content with a paint object.

Example:

```cpp
SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLUE);
```

Then:

```cpp
canvas->drawRect(SkRect::MakeXYWH(20, 20, 120, 80), paint);
```

Remember the core division:

- `SkCanvas` is where the command goes
- the content object describes what to draw
- `SkPaint` describes how it should look

## The Simplest Real Drawing Example

Here is a minimal but real raster flow:

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkRect.h"
#include "include/core/SkSurface.h"

void DrawBlueRect() {
    SkImageInfo info = SkImageInfo::MakeN32Premul(640, 480);
    sk_sp<SkSurface> surface = SkSurfaces::Raster(info);
    if (!surface) {
        return;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorWHITE);

    SkPaint paint;
    paint.setAntiAlias(true);
    paint.setColor(SK_ColorBLUE);

    canvas->drawRect(SkRect::MakeXYWH(40, 40, 160, 100), paint);
}
```

This example already shows the essential pattern:

- destination
- canvas
- clear
- paint
- draw call

## Basic Shape Drawing

The local `SkCanvas.h` exposes many drawing methods, but a few are enough to learn the pattern.

### Rectangles

```cpp
SkPaint fill;
fill.setAntiAlias(true);
fill.setColor(SK_ColorBLUE);

canvas->drawRect(SkRect::MakeXYWH(20, 20, 120, 80), fill);
```

This is usually the easiest way to understand fill, stroke, and color.

### Paths

```cpp
SkPath path;
path.moveTo(20, 20);
path.lineTo(140, 20);
path.lineTo(80, 120);
path.close();

canvas->drawPath(path, paint);
```

This introduces vector geometry and works well once you already understand `SkPaint`.

## Basic Text Drawing

The local `SkCanvas.h` includes several text entry points, including:

- `drawSimpleText(...)`
- `drawString(...)`
- `drawTextBlob(...)`

For basic documentation, `drawString(...)` is the easiest place to start:

```cpp
#include "include/core/SkFont.h"

SkFont font;
font.setSize(24);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLACK);

canvas->drawString("Hello Skia", 40, 80, font, paint);
```

Important practical note:

- simple text helpers are convenient, but they are not the same thing as full text shaping or layout

That matters later, but for drawing basics, this is enough.

## Basic Image Drawing

Once you have an `SkImage`, the local `SkCanvas.h` provides `drawImage(...)` overloads.

One real usage pattern is to draw an image produced from another surface snapshot:

```cpp
sk_sp<SkImage> image = sourceSurface->makeImageSnapshot();
if (image) {
    canvas->drawImage(image.get(), 100, 100);
}
```

Or with explicit sampling and optional paint:

```cpp
canvas->drawImage(image.get(), 100, 100, SkSamplingOptions(), &paint);
```

At the basics level, the important thing is the role split:

- `SkImage` is the source content
- `SkCanvas` is the destination interface
- sampling and paint affect how the image is drawn

## Save And Restore State

This is one of the most important habits in Skia drawing.

The local `SkCanvas.h` explains that `save()` captures matrix and clip state, and `restore()` brings them back.

That means you can make temporary changes safely:

```cpp
canvas->save();
canvas->translate(100, 50);
canvas->clipRect(SkRect::MakeWH(120, 120));
canvas->drawRect(SkRect::MakeXYWH(0, 0, 200, 200), paint);
canvas->restore();
```

After `restore()`, the earlier transform and clip are no longer active.

### Why This Matters

Without save and restore, temporary transforms and clips can leak into later drawing.

That produces bugs like:

- later content appearing in the wrong position
- unexpected clipping
- hard-to-debug state interactions

### Basic Rule

If a transform or clip is meant to affect only a local region of drawing, wrap it in:

```cpp
save();
...
restore();
```

## Transforms Change Geometry

The local `SkCanvas.h` documents these common transform methods:

- `translate(...)`
- `scale(...)`
- `rotate(...)`
- `concat(...)`

These affect how future drawing commands are positioned or transformed.

### Translate

Moves the coordinate system:

```cpp
canvas->translate(50, 30);
```

After that, later draw calls are offset.

### Scale

Scales future drawing:

```cpp
canvas->scale(2.0f, 2.0f);
```

### Rotate

Rotates future drawing:

```cpp
canvas->rotate(45);
```

### Concat

Applies a matrix explicitly:

```cpp
canvas->concat(matrix);
```

### Important Mental Model

In normal Skia drawing, transforms affect subsequent draw calls. They do not retroactively change what has already been drawn.

## Clipping Restricts Future Drawing

The local `SkCanvas.h` shows common clipping APIs such as:

- `clipRect(...)`
- `clipPath(...)`

Clipping affects where future drawing is allowed to appear.

Example:

```cpp
canvas->save();
canvas->clipRect(SkRect::MakeXYWH(20, 20, 100, 100));
canvas->drawRect(SkRect::MakeXYWH(0, 0, 200, 200), paint);
canvas->restore();
```

The large rectangle is restricted by the clip.

Important detail from the local header:

- the canvas clip is part of the save and restore state stack

That is why clipping and `save()` / `restore()` are so closely linked in practice.

## Draw Order Matters

Skia is immediate-mode drawing.

That means:

- drawing happens in the order your commands are issued
- later draw calls can cover earlier draw calls

Example:

1. clear to white
2. draw a blue rectangle
3. draw black text on top

If you reverse the last two operations, the result can look different.

This sounds basic, but it is one of the most important habits when reading or designing Skia drawing code.

## Reading Or Capturing The Result

After drawing, you often want one of two things:

- a readable pixel result
- an image snapshot

### `makeImageSnapshot()`

The local `SkSurface.h` provides:

- `makeImageSnapshot()`
- `makeImageSnapshot(bounds)`

This captures the current surface contents into an `SkImage`.

Conceptually:

```cpp
sk_sp<SkImage> snapshot = surface->makeImageSnapshot();
```

This is a natural choice when you want:

- an immutable image result
- a drawable image object for later use

### `peekPixels()` And `readPixels()`

Both `SkSurface` and `SkCanvas` expose ways to inspect or copy pixels.

The local headers show:

- `peekPixels(...)`
- `readPixels(...)`

Use them when:

- you need CPU-readable pixel access
- you want to copy the result into caller-provided memory, a pixmap, or a bitmap

Important practical detail from the local headers:

- not every canvas is readable this way
- document-based canvases are not readable with `readPixels()`
- picture-recording canvases are also not readable this way

That distinction matters a lot once you move beyond raster surfaces.

## A Real End-To-End Example

This example ties together the normal drawing flow with real APIs:

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkFont.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPath.h"
#include "include/core/SkRect.h"
#include "include/core/SkSurface.h"

sk_sp<SkImage> DrawScene() {
    SkImageInfo info = SkImageInfo::MakeN32Premul(800, 600);
    sk_sp<SkSurface> surface = SkSurfaces::Raster(info);
    if (!surface) {
        return nullptr;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorWHITE);

    SkPaint rectPaint;
    rectPaint.setAntiAlias(true);
    rectPaint.setColor(SK_ColorBLUE);
    canvas->drawRect(SkRect::MakeXYWH(50, 50, 200, 120), rectPaint);

    SkPath triangle;
    triangle.moveTo(300, 80);
    triangle.lineTo(380, 220);
    triangle.lineTo(220, 220);
    triangle.close();

    SkPaint pathPaint;
    pathPaint.setAntiAlias(true);
    pathPaint.setColor(SK_ColorRED);
    canvas->drawPath(triangle, pathPaint);

    canvas->save();
    canvas->translate(520, 150);
    canvas->rotate(20);
    canvas->drawRect(SkRect::MakeXYWH(-40, -40, 80, 80), rectPaint);
    canvas->restore();

    SkFont font;
    font.setSize(28);

    SkPaint textPaint;
    textPaint.setAntiAlias(true);
    textPaint.setColor(SK_ColorBLACK);
    canvas->drawString("Skia Basics", 40, 280, font, textPaint);

    return surface->makeImageSnapshot();
}
```

Even as the content becomes more advanced, this basic shape stays familiar.

## Reading Pixels Into Caller Memory

If you need CPU-side access to the rendered result, `readPixels(...)` copies pixels into memory you provide.

Real usage:

```cpp
#include <vector>

#include "include/core/SkImageInfo.h"

SkImageInfo dstInfo = SkImageInfo::MakeN32Premul(800, 600);
std::vector<uint32_t> dstPixels(dstInfo.width() * dstInfo.height());

bool ok = surface->readPixels(
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

This is useful when the destination is readable. As the local headers note, document-based canvases are not readable this way.

## A Practical Way To Think About State

Skia drawing state is mostly about:

- current matrix
- current clip
- per-draw paint configuration

The canvas owns matrix and clip state.

The draw call provides the content.

The paint provides appearance.

That division is one of the most useful mental models in all of Skia.

## Common Beginner Mistakes

### Mistake 1: Treating `SkCanvas` As The Stored Result

The canvas is the interface for drawing. The surface or destination is what actually holds the result.

### Mistake 2: Forgetting To Clear

If you assume the destination starts with a known background when it does not, your output may look random or stale.

### Mistake 3: Forgetting `save()` / `restore()`

Temporary transforms and clips often accidentally affect later drawing when restore is omitted.

### Mistake 4: Confusing Geometry With Style

`SkPath` and rectangles describe what to draw. `SkPaint` describes how to draw it.

### Mistake 5: Expecting All Canvases To Support Pixel Reads

The local headers explicitly note that document-based and picture-recording canvases are not readable with `readPixels()`.

### Mistake 6: Forgetting Draw Order

Later operations can visually replace or cover earlier ones.

## Rules Of Thumb

- start with a surface unless you have a specific reason not to
- get the canvas from the surface and treat it as borrowed
- clear early to establish a known background
- use `SkPaint` per visual style
- isolate local transforms and clips with `save()` / `restore()`
- snapshot or read results from the destination that actually owns them

## What To Remember

If you remember only a few things from this page, remember these:

- most Skia drawing is destination -> canvas -> paint -> draw calls -> result extraction
- `save()` and `restore()` are foundational, not optional decoration
- transforms and clips affect future drawing, not past drawing
- draw order matters
- raster surfaces are the easiest place to learn the API flow

## Next Step

The next document should focus on `SkPaint` in more detail:

- fill versus stroke
- color
- antialiasing
- stroke width
- blend behavior
- how paint affects different types of content
