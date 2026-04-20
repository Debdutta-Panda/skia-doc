# Paint Basics

## What `SkPaint` Does

`SkPaint` controls how drawing happens.

Your local `SkPaint.h` defines it this way:

- it controls options applied when drawing
- it collects options outside of the `SkCanvas` clip and matrix
- it applies to strokes, fills, and images

At the basics level, the most important parts of `SkPaint` are:

- style
- color
- alpha
- antialiasing
- stroke width
- stroke cap
- stroke join
- blend mode

This document focuses only on those basics.

Advanced paint attachments such as shaders, path effects, color filters, image filters, and mask filters should live in a later document.

## The Default Mental Model

When you call a draw function, three things usually come together:

- the canvas decides where the command goes
- the geometry or content decides what is being drawn
- the paint decides how it should look

Example:

```cpp
SkPaint paint;
paint.setColor(SK_ColorBLUE);

canvas->drawRect(SkRect::MakeXYWH(20, 20, 120, 80), paint);
```

The rectangle is the content.

The `SkPaint` is the styling.

## A Minimal Real Example

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkRect.h"
#include "include/core/SkSurface.h"

void DrawWithPaintBasics() {
    SkImageInfo info = SkImageInfo::MakeN32Premul(400, 240);
    sk_sp<SkSurface> surface = SkSurfaces::Raster(info);
    if (!surface) {
        return;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorWHITE);

    SkPaint paint;
    paint.setAntiAlias(true);
    paint.setColor(SK_ColorBLUE);

    canvas->drawRect(SkRect::MakeXYWH(40, 40, 140, 100), paint);
}
```

This already uses three very common paint settings:

- antialiasing
- color
- default fill style

## Fill vs Stroke

One of the first things to understand is `SkPaint::Style`.

Your local `SkPaint.h` defines three styles:

- `kFill_Style`
- `kStroke_Style`
- `kStrokeAndFill_Style`

### Fill

Fill is the default style.

```cpp
SkPaint fillPaint;
fillPaint.setColor(SK_ColorBLUE);
fillPaint.setStyle(SkPaint::kFill_Style);

canvas->drawCircle(80, 80, 50, fillPaint);
```

This paints the inside of the shape.

### Stroke

Stroke draws the outline of the shape.

```cpp
SkPaint strokePaint;
strokePaint.setAntiAlias(true);
strokePaint.setColor(SK_ColorRED);
strokePaint.setStyle(SkPaint::kStroke_Style);
strokePaint.setStrokeWidth(8);

canvas->drawCircle(220, 80, 50, strokePaint);
```

This paints only the border.

### Stroke And Fill

This does both in one draw.

```cpp
SkPaint bothPaint;
bothPaint.setAntiAlias(true);
bothPaint.setColor(SK_ColorBLACK);
bothPaint.setStyle(SkPaint::kStrokeAndFill_Style);
bothPaint.setStrokeWidth(6);

canvas->drawCircle(340, 80, 40, bothPaint);
```

Your local header notes that `kStrokeAndFill_Style` helps avoid hitting the same pixels twice with separate stroke and fill draws.

## Stroke Width

Stroke width matters only for stroke-based drawing styles.

Your local `SkPaint.h` notes:

- zero means hairline
- greater than zero means pen thickness
- negative values are invalid and have no effect

### Real Usage

```cpp
SkPaint linePaint;
linePaint.setColor(SK_ColorBLACK);
linePaint.setStyle(SkPaint::kStroke_Style);
linePaint.setStrokeWidth(12);

canvas->drawLine(40, 160, 220, 160, linePaint);
```

### Hairline Stroke

```cpp
SkPaint hairline;
hairline.setColor(SK_ColorBLACK);
hairline.setStyle(SkPaint::kStroke_Style);
hairline.setStrokeWidth(0);

canvas->drawLine(40, 190, 220, 190, hairline);
```

The local header says hairlines are always exactly one device pixel wide, even if the canvas is scaled.

That is an important behavior difference from non-zero stroke widths.

## Antialiasing

Antialiasing smooths edges by allowing partial transparency at edge pixels.

The local `SkPaint.h` exposes:

- `isAntiAlias()`
- `setAntiAlias(bool)`

### Without Antialiasing

```cpp
SkPaint noAA;
noAA.setColor(SK_ColorBLUE);
noAA.setAntiAlias(false);

canvas->drawCircle(80, 80, 35, noAA);
```

### With Antialiasing

```cpp
SkPaint withAA;
withAA.setColor(SK_ColorBLUE);
withAA.setAntiAlias(true);

canvas->drawCircle(180, 80, 35, withAA);
```

In practice:

- antialiasing is usually a good default for shapes and text
- turning it off may make edges look more jagged

## Color

At the basics level, the most common color API is:

- `setColor(SkColor)`

Your local header also exposes:

- `setARGB(...)`
- `setColor(const SkColor4f&, SkColorSpace*)`

For foundational docs, `setColor(...)` and `setARGB(...)` are enough to start with.

### Real Usage

```cpp
SkPaint blue;
blue.setColor(SK_ColorBLUE);

SkPaint green;
green.setColor(SK_ColorGREEN);

canvas->drawRect(SkRect::MakeXYWH(20, 20, 100, 60), blue);
canvas->drawRect(SkRect::MakeXYWH(140, 20, 100, 60), green);
```

### Explicit ARGB

```cpp
SkPaint custom;
custom.setARGB(255, 240, 120, 40);

canvas->drawRect(SkRect::MakeXYWH(260, 20, 100, 60), custom);
```

## Alpha

Alpha controls transparency.

Your local header exposes:

- `getAlphaf()`
- `getAlpha()`
- `setAlphaf(float)`
- `setAlpha(U8CPU)`

### Real Usage

```cpp
SkPaint solid;
solid.setColor(SK_ColorBLUE);
solid.setAlpha(255);

SkPaint translucent;
translucent.setColor(SK_ColorBLUE);
translucent.setAlpha(96);

canvas->drawRect(SkRect::MakeXYWH(40, 40, 120, 80), solid);
canvas->drawRect(SkRect::MakeXYWH(100, 80, 120, 80), translucent);
```

This is one of the simplest ways to show overlapping transparency.

### Important Point

Changing alpha does not change the geometry.

It only changes how transparent the result is when drawn.

## Stroke Cap

Stroke cap affects the beginning and end of open stroked contours.

Your local `SkPaint.h` defines:

- `kButt_Cap`
- `kRound_Cap`
- `kSquare_Cap`

### Real Usage

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

Practical effect:

- butt cap ends exactly at the endpoint
- round cap adds a rounded end
- square cap extends with a square end

Cap matters most for open stroked lines and open path contours.

## Stroke Join

Stroke join affects how corners are drawn when a shape is stroked.

Your local `SkPaint.h` defines:

- `kMiter_Join`
- `kRound_Join`
- `kBevel_Join`

### Real Usage

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

SkPaint round = miter;
round.setStrokeJoin(SkPaint::kRound_Join);

SkPaint bevel = miter;
bevel.setStrokeJoin(SkPaint::kBevel_Join);
```

Then draw the same path with each paint in different positions.

Practical effect:

- miter keeps a sharp corner
- round rounds the corner
- bevel cuts the corner off

## Miter Limit

The local `SkPaint.h` also exposes:

- `getStrokeMiter()`
- `setStrokeMiter(...)`

This matters when using miter joins on sharp corners. If the corner becomes too sharp relative to the miter limit, it falls back toward a bevel-like result.

For a basics document, the important takeaway is:

- if sharp stroked corners look cut off, check the join type and miter limit

You do not need to master the geometry math yet.

## Blend Mode Basics

The local `SkPaint.h` exposes:

- `setBlendMode(SkBlendMode mode)`

At the basics level, the important idea is simple:

- blend mode affects how newly drawn pixels combine with pixels already in the destination

If you do not set a blender explicitly, the usual default behavior is `SrcOver`.

### Basic Example

```cpp
#include "include/core/SkBlendMode.h"

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

For paint basics, `SrcOver` is the only blend mode you really need to understand first.

Later, advanced paint docs can cover the wider blending model.

## Reusing Paint Objects

`SkPaint` is commonly reused.

That is often better than re-creating every setting from scratch on every draw call.

### Real Usage

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

This is a practical way to build a small set of related styles.

Your local header also notes that copying `SkPaint` is shallow for attached ref-counted objects such as shaders and filters.

That matters more in advanced paint usage, but it is good to know early.

## A Compact Demo Scene

This example puts several paint basics together:

```cpp
#include "include/core/SkBlendMode.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPath.h"
#include "include/core/SkRect.h"
#include "include/core/SkSurface.h"

void PaintBasicsDemo() {
    SkImageInfo info = SkImageInfo::MakeN32Premul(640, 360);
    sk_sp<SkSurface> surface = SkSurfaces::Raster(info);
    if (!surface) {
        return;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorWHITE);

    SkPaint fillPaint;
    fillPaint.setAntiAlias(true);
    fillPaint.setColor(SK_ColorBLUE);
    fillPaint.setStyle(SkPaint::kFill_Style);
    canvas->drawCircle(80, 80, 40, fillPaint);

    SkPaint strokePaint;
    strokePaint.setAntiAlias(true);
    strokePaint.setColor(SK_ColorRED);
    strokePaint.setStyle(SkPaint::kStroke_Style);
    strokePaint.setStrokeWidth(10);
    strokePaint.setStrokeCap(SkPaint::kRound_Cap);
    canvas->drawLine(160, 40, 280, 120, strokePaint);

    SkPath path;
    path.moveTo(340, 120);
    path.lineTo(390, 40);
    path.lineTo(450, 120);

    SkPaint joinPaint;
    joinPaint.setAntiAlias(true);
    joinPaint.setColor(SK_ColorBLACK);
    joinPaint.setStyle(SkPaint::kStroke_Style);
    joinPaint.setStrokeWidth(14);
    joinPaint.setStrokeJoin(SkPaint::kMiter_Join);
    canvas->drawPath(path, joinPaint);

    SkPaint translucent;
    translucent.setColor(SK_ColorBLUE);
    translucent.setAlpha(120);
    canvas->drawRect(SkRect::MakeXYWH(60, 180, 120, 100), translucent);

    SkPaint overlay;
    overlay.setColor(SK_ColorRED);
    overlay.setAlpha(120);
    overlay.setBlendMode(SkBlendMode::kSrcOver);
    canvas->drawRect(SkRect::MakeXYWH(120, 220, 120, 100), overlay);
}
```

This is still only the basics, but it shows:

- fill
- stroke
- stroke width
- cap
- join
- alpha
- blending in normal overlap usage

## Common Beginner Mistakes

### Mistake 1: Expecting Stroke Width To Affect Fill

It does not.

If style is fill-only, stroke width does not control an outline.

### Mistake 2: Forgetting To Set Stroke Style

If you want an outline, set:

```cpp
paint.setStyle(SkPaint::kStroke_Style);
```

Otherwise you may just get a filled shape.

### Mistake 3: Using Transparent Paint And Thinking Nothing Drew

Low alpha values can make content look faint or invisible.

### Mistake 4: Not Enabling Antialiasing For Curves

This can make circles, diagonal lines, and paths look rougher than expected.

### Mistake 5: Expecting Cap And Join To Affect Filled Shapes

Cap and join primarily matter for strokes.

### Mistake 6: Using Negative Stroke Width

Your local `SkPaint.h` says negative stroke widths are invalid and have no effect.

## Rules Of Thumb

- use fill for solid shapes
- use stroke for outlines
- set a non-zero stroke width when you want visible outline thickness
- enable antialiasing for most non-pixel-art drawing
- use alpha to control transparency
- use cap and join when stroke appearance matters
- keep blend mode simple at first

## What To Remember

- `SkPaint` controls how a draw call looks
- fill and stroke are different styles, not just different widths
- stroke width only matters for stroked drawing
- cap and join shape the ends and corners of strokes
- alpha controls transparency
- antialiasing smooths edges
- basics first, advanced paint attachments later

## Next Step

The next document should move from paint styling into geometric drawing structure:

- rectangles and rounded rectangles
- points and lines
- paths
- transforms
- clipping
