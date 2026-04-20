# Images

## What This Document Covers

This page explains the main image and pixel-data objects in Skia:

- `SkImage`
- `SkBitmap`
- `SkPixmap`

It also covers:

- creating images from surfaces and pixel data
- drawing images
- reading pixels
- wrapping existing memory
- the most common ownership and mutability mistakes

This is one of the most important practical parts of Skia, because image-related code shows up everywhere.

## The Three Core Image-Related Types

The most useful first distinction is this:

- `SkImage` is an immutable drawable image
- `SkBitmap` is a mutable raster pixel container
- `SkPixmap` is a lightweight non-owning pixel view

If you remember only that, you will already avoid many common mistakes.

## `SkImage`: Immutable Image Content

Your local `SkImage.h` says:

- `SkImage` describes a two-dimensional array of pixels to draw
- it cannot be modified after creation
- it may be backed by raster data, encoded data, pictures, compressed data, or GPU texture data

Practical meaning:

- `SkImage` is for image content you want to draw, reuse, cache, or pass around as read-only content
- it is often the right choice once the image data should stop changing

### A Common Real Source: Surface Snapshot

One of the easiest ways to produce an `SkImage` is from an `SkSurface`:

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkRect.h"
#include "include/core/SkSurface.h"

sk_sp<SkImage> MakeImageFromSurface() {
    SkImageInfo info = SkImageInfo::MakeN32Premul(320, 200);
    sk_sp<SkSurface> surface = SkSurfaces::Raster(info);
    if (!surface) {
        return nullptr;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorWHITE);

    SkPaint paint;
    paint.setColor(SK_ColorBLUE);
    canvas->drawRect(SkRect::MakeXYWH(40, 40, 120, 80), paint);

    return surface->makeImageSnapshot();
}
```

Your local `SkSurface.h` exposes:

- `makeImageSnapshot()`
- `makeImageSnapshot(const SkIRect& bounds)`
- `makeTemporaryImage()`

For documentation and normal usage, `makeImageSnapshot()` is the safest default to teach first.

## `SkBitmap`: Mutable Raster Pixel Container

Your local `SkBitmap.h` describes `SkBitmap` as a two-dimensional raster pixel array built on `SkImageInfo` and `SkPixelRef`.

It also gives an extremely important rule:

- if pixel data is primarily read-only, use `SkImage`
- if pixel data is primarily written to, use `SkSurface`

Practical meaning:

- `SkBitmap` is useful when you need direct raster pixel storage semantics
- it can be drawn
- it can share pixel storage
- it is not the same thing as an immutable image object

The same header also says:

- `SkBitmap` is not thread safe
- copying a bitmap can share underlying pixels

That is a big behavioral difference from `SkImage`.

## `SkPixmap`: Lightweight Pixel View

Your local `SkPixmap.h` describes it as a utility pairing:

- `SkImageInfo`
- pixel address
- row bytes

It also explicitly says:

- `SkCanvas` cannot draw `SkPixmap`
- `SkPixmap` is not a direct drawing destination
- `SkPixmap` does not manage pixel lifetime

Practical meaning:

- `SkPixmap` is a view over raw pixel memory
- it is useful for low-level access and interoperability
- it is not an owning image object

This is the shortest safe way to think about the three types:

- `SkImage` is the immutable image object
- `SkBitmap` is the mutable pixel container
- `SkPixmap` is the low-level view

## How To Choose Between Them

### Use `SkImage` When

- the content should be immutable
- you want to draw or reuse image content
- you want to snapshot from a surface
- you want a clean image result object

### Use `SkBitmap` When

- you need mutable raster storage semantics
- you need bitmap-style pixel ownership behavior
- you are working with raster buffers and bitmap APIs directly

### Use `SkPixmap` When

- you need a low-level description of existing pixels
- you need to pass around `info + pointer + rowBytes`
- you need to read from or wrap raw memory without full ownership semantics

## Drawing An `SkImage`

Your local `SkCanvas.h` exposes `drawImage(...)` overloads.

### Basic Usage

```cpp
sk_sp<SkImage> image = MakeImageFromSurface();
if (image) {
    canvas->drawImage(image.get(), 100, 60);
}
```

### With Sampling And Optional Paint

```cpp
#include "include/core/SkSamplingOptions.h"

SkSamplingOptions sampling;

SkPaint paint;
paint.setAlpha(200);

if (image) {
    canvas->drawImage(image.get(), 100, 60, sampling, &paint);
}
```

At the basics level, the important relationship is:

- `SkImage` is the source content
- the destination canvas receives the draw call
- sampling and optional paint affect how the image is drawn

## Using An `SkImage` As Paint Input

An `SkImage` is not limited to `drawImage(...)`.

You can also use image content as the source for paint color through an image shader.

That is the right tool when you want things like:

- a stroked rectangle whose stroke is filled with image content
- a path filled with a repeated texture
- a circle whose fill comes from an image instead of a flat color

The practical rule is:

- solid color source: `paint.setColor(...)`
- image-based source: `paint.setShader(image->makeShader(...))`

### Use An Image In A Stroke-Only Rectangle

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkImage.h"
#include "include/core/SkPaint.h"
#include "include/core/SkRect.h"
#include "include/core/SkSamplingOptions.h"
#include "include/core/SkTileMode.h"

void DrawImageStrokeRect(SkCanvas* canvas, sk_sp<SkImage> image) {
    if (!canvas || !image) {
        return;
    }

    SkPaint paint;
    paint.setStyle(SkPaint::kStroke_Style);
    paint.setStrokeWidth(12.0f);
    paint.setAntiAlias(true);

    paint.setShader(image->makeShader(
        SkTileMode::kRepeat,
        SkTileMode::kRepeat,
        SkSamplingOptions()
    ));

    canvas->drawRect(SkRect::MakeXYWH(40, 40, 240, 140), paint);
}
```

What is happening here:

- the geometry is still the rectangle stroke
- the color source is no longer `setColor(...)`
- the stroke samples from the image shader instead

### Scale Or Reposition The Image Inside The Stroke

If the image is too large or too dense, apply a local matrix to the shader.

```cpp
#include "include/core/SkMatrix.h"

void DrawScaledImageStrokeRect(SkCanvas* canvas, sk_sp<SkImage> image) {
    if (!canvas || !image) {
        return;
    }

    SkMatrix localMatrix = SkMatrix::Scale(0.25f, 0.25f);

    SkPaint paint;
    paint.setStyle(SkPaint::kStroke_Style);
    paint.setStrokeWidth(16.0f);
    paint.setAntiAlias(true);

    paint.setShader(image->makeShader(
        SkTileMode::kRepeat,
        SkTileMode::kRepeat,
        SkSamplingOptions(),
        &localMatrix
    ));

    canvas->drawRect(SkRect::MakeXYWH(50, 50, 300, 180), paint);
}
```

This changes how the image is sampled inside the stroke without changing the rectangle geometry.

### The Same Pattern Works For Other Geometry

You can use the same image-shader pattern with:

- `drawPath(...)`
- `drawCircle(...)`
- `drawRRect(...)`
- `drawLine(...)`

Example with a stroked path:

```cpp
#include "include/core/SkPath.h"

void DrawImageStrokePath(SkCanvas* canvas, sk_sp<SkImage> image) {
    if (!canvas || !image) {
        return;
    }

    SkPath path;
    path.moveTo(60, 180);
    path.cubicTo(140, 40, 260, 320, 360, 140);

    SkPaint paint;
    paint.setStyle(SkPaint::kStroke_Style);
    paint.setStrokeWidth(18.0f);
    paint.setStrokeCap(SkPaint::kRound_Cap);
    paint.setStrokeJoin(SkPaint::kRound_Join);
    paint.setAntiAlias(true);
    paint.setShader(image->makeShader(
        SkTileMode::kRepeat,
        SkTileMode::kRepeat,
        SkSamplingOptions()
    ));

    canvas->drawPath(path, paint);
}
```

## Creating An `SkImage` From A `SkBitmap`

Your local `SkImage.h` exposes:

- `SkImages::RasterFromBitmap(const SkBitmap&)`

This is a practical bridge from mutable bitmap-style data to immutable image-style data.

Real usage:

```cpp
#include "include/core/SkBitmap.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"

sk_sp<SkImage> MakeImageFromBitmap(const SkBitmap& bitmap) {
    return SkImages::RasterFromBitmap(bitmap);
}
```

The header notes that this may share or copy bitmap pixels depending on bitmap validity, immutability, and whether sharing is possible.

That is one reason `SkImage` and `SkBitmap` should not be treated as identical types.

## Creating An `SkImage` From A `SkPixmap`

Your local `SkImage.h` exposes two important paths:

- `SkImages::RasterFromPixmapCopy(...)`
- `SkImages::RasterFromPixmap(...)`

These are not the same.

### Copying The Pixel Data

```cpp
sk_sp<SkImage> image = SkImages::RasterFromPixmapCopy(pixmap);
```

This copies the pixels.

That means the original pixel memory can later change or disappear without affecting the image.

### Sharing The Pixel Data

```cpp
sk_sp<SkImage> image = SkImages::RasterFromPixmap(
    pixmap,
    nullptr,
    nullptr
);
```

This shares the original pixels.

Your local header is very explicit:

- the pixel memory must remain valid and unchanged until the release callback says it is safe

That means this is a power tool, not the safest default.

For documentation and beginner usage:

- teach the copy version first
- use the sharing version only when lifetime control is clear

## Creating An `SkImage` From Raw Pixel Data

Your local `SkImage.h` also exposes:

- `SkImages::RasterFromData(...)`

This creates an image from supplied pixel storage without copying the data.

Real usage:

```cpp
#include "include/core/SkData.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"

sk_sp<SkImage> MakeImageFromRawData(sk_sp<SkData> pixels) {
    SkImageInfo info = SkImageInfo::MakeN32Premul(128, 128);
    return SkImages::RasterFromData(info, pixels, info.minRowBytes());
}
```

Again, this is about shared backing storage rather than automatic copying.

## Wrapping Existing Pixel Memory In A Surface

Sometimes the real goal is not “make an image object,” but “draw into memory I already own.”

That is where `SkSurfaces::WrapPixels(...)` comes in.

Your local `SkSurface.h` exposes:

- `SkSurfaces::WrapPixels(const SkImageInfo&, void*, size_t, ...)`
- `SkSurfaces::WrapPixels(const SkPixmap&, ...)`

Real usage:

```cpp
#include <vector>

#include "include/core/SkCanvas.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkRect.h"
#include "include/core/SkSurface.h"

void DrawIntoCallerPixels() {
    constexpr int width = 256;
    constexpr int height = 256;
    std::vector<uint32_t> pixels(width * height);

    SkImageInfo info = SkImageInfo::MakeN32Premul(width, height);
    size_t rowBytes = width * sizeof(uint32_t);

    sk_sp<SkSurface> surface = SkSurfaces::WrapPixels(info, pixels.data(), rowBytes);
    if (!surface) {
        return;
    }

    SkCanvas* canvas = surface->getCanvas();

    SkPaint paint;
    paint.setColor(SK_ColorBLUE);
    canvas->drawRect(SkRect::MakeXYWH(20, 20, 100, 100), paint);
}
```

This is not the same as creating an `SkImage`.

It is about creating a drawing destination that writes into existing memory.

## Reading Pixels From A Surface

Your local `SkSurface.h` exposes:

- `peekPixels(...)`
- `readPixels(...)`

These solve different problems.

### `peekPixels(...)`

This gives you direct readable access if possible.

Real usage:

```cpp
#include "include/core/SkPixmap.h"

SkPixmap pixmap;
bool ok = surface->peekPixels(&pixmap);
if (!ok) {
    return;
}

SkColor c = pixmap.getColor(0, 0);
```

This is useful when:

- direct access is available
- you want to inspect pixels without copying them first

### `readPixels(...)`

This copies pixels into your destination memory.

Real usage:

```cpp
#include <vector>

#include "include/core/SkImageInfo.h"

SkImageInfo dstInfo = SkImageInfo::MakeN32Premul(surface->width(), surface->height());
std::vector<uint32_t> pixels(dstInfo.width() * dstInfo.height());

bool ok = surface->readPixels(
    dstInfo,
    pixels.data(),
    dstInfo.minRowBytes(),
    0,
    0
);

if (!ok) {
    return;
}
```

This is useful when:

- you need a copied pixel buffer
- you want to export, inspect, or process pixels on the CPU side

## Reading Pixels Into A `SkBitmap`

Your local `SkSurface.h` and `SkCanvas.h` also provide overloads for reading into `SkBitmap`.

Conceptually:

```cpp
SkBitmap bitmap;
bitmap.allocN32Pixels(width, height);

bool ok = surface->readPixels(bitmap, 0, 0);
if (!ok) {
    return;
}
```

This can be convenient when you want the destination in bitmap form instead of a raw memory buffer.

## Reading Pixels From An `SkImage`

Your local `SkImage.h` also exposes:

- `peekPixels(...)`
- `readPixels(...)`

That means image content can often be read back too, depending on how it is backed and which API path is used.

Conceptually:

```cpp
SkImageInfo dstInfo = SkImageInfo::MakeN32Premul(image->width(), image->height());
std::vector<uint32_t> pixels(dstInfo.width() * dstInfo.height());

bool ok = image->readPixels(dstInfo, pixels.data(), dstInfo.minRowBytes(), 0, 0);
```

This is useful when the image is the object you already have and you want CPU-readable pixels from it.

## `makeImageSnapshot()` vs `makeTemporaryImage()`

Your local `SkSurface.h` exposes both:

- `makeImageSnapshot()`
- `makeTemporaryImage()`

The safe teaching distinction is:

- `makeImageSnapshot()` gives you a stable image snapshot of current contents
- `makeTemporaryImage()` can be more performant, but the returned image is only valid while no further writes happen to the original surface

The local header is explicit that if the surface is written again, the temporary image contents become undefined.

So for general documentation:

- prefer `makeImageSnapshot()` as the default recommendation
- explain `makeTemporaryImage()` as a specialized optimization tool

## Real End-To-End Example

This example ties together surface drawing, image snapshotting, image drawing, and pixel readback:

```cpp
#include <vector>

#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkRect.h"
#include "include/core/SkSamplingOptions.h"
#include "include/core/SkSurface.h"

void ImageWorkflowDemo() {
    SkImageInfo srcInfo = SkImageInfo::MakeN32Premul(200, 200);
    sk_sp<SkSurface> srcSurface = SkSurfaces::Raster(srcInfo);
    if (!srcSurface) {
        return;
    }

    SkCanvas* srcCanvas = srcSurface->getCanvas();
    srcCanvas->clear(SK_ColorWHITE);

    SkPaint blue;
    blue.setColor(SK_ColorBLUE);
    srcCanvas->drawRect(SkRect::MakeXYWH(30, 30, 100, 100), blue);

    sk_sp<SkImage> image = srcSurface->makeImageSnapshot();
    if (!image) {
        return;
    }

    SkImageInfo dstInfo = SkImageInfo::MakeN32Premul(500, 260);
    sk_sp<SkSurface> dstSurface = SkSurfaces::Raster(dstInfo);
    if (!dstSurface) {
        return;
    }

    SkCanvas* dstCanvas = dstSurface->getCanvas();
    dstCanvas->clear(SK_ColorWHITE);

    dstCanvas->drawImage(image.get(), 40, 30);

    SkPaint faded;
    faded.setAlpha(160);
    dstCanvas->drawImage(image.get(), 180, 60, SkSamplingOptions(), &faded);

    std::vector<uint32_t> pixels(dstInfo.width() * dstInfo.height());
    bool ok = dstSurface->readPixels(
        dstInfo,
        pixels.data(),
        dstInfo.minRowBytes(),
        0,
        0
    );

    if (!ok) {
        return;
    }
}
```

This shows a common real workflow:

1. draw into a surface
2. snapshot it as an image
3. draw that image somewhere else
4. read the final pixels back to CPU memory

## Common Beginner Mistakes

### Mistake 1: Treating `SkImage` And `SkBitmap` As Interchangeable

They are related, but they are not the same abstraction.

- `SkImage` is immutable image content
- `SkBitmap` is mutable raster storage

### Mistake 2: Expecting `SkPixmap` To Be Drawable

Your local `SkPixmap.h` explicitly says `SkCanvas` cannot draw `SkPixmap`.

### Mistake 3: Sharing Pixel Memory Without Managing Lifetime

APIs like `RasterFromPixmap(...)` and `RasterFromData(...)` can share backing storage. That is useful, but dangerous if the memory goes away too soon.

### Mistake 4: Using `makeTemporaryImage()` Like A Normal Snapshot

It is not a normal stable snapshot. It has a stricter lifetime and mutation contract.

### Mistake 5: Assuming Pixel Reads Are Always Zero-Copy

`peekPixels()` and `readPixels()` solve different problems. `readPixels()` is a copy operation into your destination memory.

## Rules Of Thumb

- use `SkImage` for immutable image content
- use `SkBitmap` for mutable raster container semantics
- use `SkPixmap` for low-level pixel views
- use `makeImageSnapshot()` as the default way to turn surface contents into an image
- prefer copy-based image creation when lifetime ownership is not obvious
- use `WrapPixels(...)` when the real goal is drawing into caller-owned memory

## What To Remember

- `SkImage`, `SkBitmap`, and `SkPixmap` solve different problems
- images are not just “pictures”; they also involve ownership, mutability, and memory layout choices
- surface snapshots are one of the most practical ways to create images in Skia
- pixel access APIs are powerful, but you should know when they copy and when they borrow

## Next Step

The next document should focus on text and fonts:

- `SkFont`
- `SkTypeface`
- `SkTextBlob`
- basic text drawing
- what Skia text does and does not handle at the core API level
