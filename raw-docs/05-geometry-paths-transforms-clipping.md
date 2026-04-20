# Geometry, Paths, Transforms, and Clipping

## What This Document Covers

This page focuses on the spatial side of Skia drawing.

By this point in the documentation set, we already know:

- what the main Skia objects are
- how basic drawing flow works
- how `SkPaint` changes appearance

Now we need the next layer:

- how shapes are described
- how coordinates work
- how paths are built
- how transforms change future drawing
- how clipping restricts where drawing can appear

This is where drawing starts to feel structured instead of just procedural.

## The Main Geometry Types

At the basics level, the most important geometry-related types are:

- `SkPoint`
- `SkRect`
- `SkRRect`
- `SkPath`
- `SkMatrix`

These do different jobs:

- `SkPoint` represents a position
- `SkRect` represents an axis-aligned rectangle
- `SkRRect` represents a rounded rectangle
- `SkPath` represents arbitrary vector geometry
- `SkMatrix` represents geometric transformation

## `SkRect`: Axis-Aligned Rectangle

Your local `SkRect.h` provides several helper factories for rectangle creation.

The most common one in day-to-day usage is:

```cpp
SkRect rect = SkRect::MakeXYWH(40, 30, 120, 80);
```

That means:

- x = `40`
- y = `30`
- width = `120`
- height = `80`

Real usage:

```cpp
#include "include/core/SkPaint.h"
#include "include/core/SkRect.h"

SkRect rect = SkRect::MakeXYWH(40, 30, 120, 80);

SkPaint paint;
paint.setColor(SK_ColorBLUE);

canvas->drawRect(rect, paint);
```

### Why `SkRect` Matters

You will use rectangles constantly in Skia:

- draw calls
- bounds
- clipping
- image destination areas
- layout-like positioning
- path construction helpers

Even when a final shape is more complex, rectangles are often the starting point.

## `SkRRect`: Rounded Rectangle

Your local `SkRRect.h` describes `SkRRect` as a rounded rectangle with bounds and corner radii.

It can represent:

- a plain rectangle
- a rounded rectangle
- an oval-like case
- more complex corner radius combinations

The most common basics API is:

```cpp
SkRRect rrect = SkRRect::MakeRectXY(
    SkRect::MakeXYWH(40, 30, 160, 100),
    16,
    16
);
```

Real usage:

```cpp
#include "include/core/SkPaint.h"
#include "include/core/SkRRect.h"

SkRRect rrect = SkRRect::MakeRectXY(
    SkRect::MakeXYWH(40, 30, 160, 100),
    16,
    16
);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorRED);

canvas->drawRRect(rrect, paint);
```

Rounded rectangles are very common in modern UI and document drawing, so `SkRRect` is worth learning early.

## `SkPoint`: Position In 2D Space

`SkPoint` is simple but important.

It is often used for:

- line endpoints
- path construction
- centers of circles
- transform-related logic

Real usage:

```cpp
SkPoint a = {40, 40};
SkPoint b = {180, 120};

SkPaint paint;
paint.setColor(SK_ColorBLACK);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(4);

canvas->drawLine(a, b, paint);
```

Points are usually the smallest building block in geometry-oriented code.

## The Easiest Geometry Draw Calls

Before jumping to paths, it helps to start with the most direct shape APIs in `SkCanvas`.

Your local `SkCanvas.h` exposes:

- `drawLine(...)`
- `drawRect(...)`
- `drawRRect(...)`
- `drawCircle(...)`
- `drawPath(...)`

### Lines

```cpp
SkPaint linePaint;
linePaint.setColor(SK_ColorBLACK);
linePaint.setStyle(SkPaint::kStroke_Style);
linePaint.setStrokeWidth(6);

canvas->drawLine(40, 40, 220, 120, linePaint);
```

### Rectangles

```cpp
SkPaint rectPaint;
rectPaint.setColor(SK_ColorBLUE);

canvas->drawRect(SkRect::MakeXYWH(40, 140, 120, 80), rectPaint);
```

### Rounded Rectangles

```cpp
SkPaint rrectPaint;
rrectPaint.setAntiAlias(true);
rrectPaint.setColor(SK_ColorRED);

SkRRect rr = SkRRect::MakeRectXY(SkRect::MakeXYWH(200, 140, 140, 80), 20, 20);
canvas->drawRRect(rr, rrectPaint);
```

### Circles

```cpp
SkPaint circlePaint;
circlePaint.setAntiAlias(true);
circlePaint.setColor(SK_ColorGREEN);

canvas->drawCircle(420, 180, 45, circlePaint);
```

These calls are the easiest way to build confidence with geometry before working with freeform paths.

## `SkPath`: Arbitrary Vector Geometry

Your local `SkPath.h` describes `SkPath` as geometry made from verbs.

It explains that a path:

- may be empty
- starts contours with a move
- can add lines and curves
- can be open or closed
- can contain multiple contours

This is the key idea:

- `SkRect` and `SkRRect` are specialized geometry helpers
- `SkPath` is the general vector shape container

## Path Verbs And Contours

The local header describes path construction in terms of verbs such as:

- move
- line
- quad
- conic
- cubic
- close

For basics, the most important ones are:

- `moveTo(...)`
- `lineTo(...)`
- `close()`

### A Simple Triangle

```cpp
SkPath triangle;
triangle.moveTo(80, 40);
triangle.lineTo(140, 160);
triangle.lineTo(20, 160);
triangle.close();

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLUE);

canvas->drawPath(triangle, paint);
```

This is one contour:

- it begins with `moveTo`
- adds two edges with `lineTo`
- closes into a closed shape with `close()`

### An Open Path

```cpp
SkPath open;
open.moveTo(220, 60);
open.lineTo(280, 140);
open.lineTo(340, 60);

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLACK);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(8);

canvas->drawPath(open, paint);
```

This path is not closed, so it behaves like an open stroked contour.

## Path Factory Helpers

Your local `SkPath.h` also provides static helpers such as:

- `SkPath::Rect(...)`
- `SkPath::Oval(...)`
- `SkPath::Circle(...)`
- `SkPath::RRect(...)`
- `SkPath::Polygon(...)`
- `SkPath::Line(...)`

These are useful when you want path semantics but already know the shape type.

Real usage:

```cpp
SkPath circlePath = SkPath::Circle(120, 120, 50);

SkPaint paint;
paint.setAntiAlias(true);
paint.setStyle(SkPaint::kStroke_Style);
paint.setStrokeWidth(6);
paint.setColor(SK_ColorRED);

canvas->drawPath(circlePath, paint);
```

## Fill Type At A Basic Level

Your local `SkPath.h` exposes `getFillType()` and related fill-type helpers.

At the basics level, the important idea is:

- a path does not only describe edges
- it also describes how “inside” is determined for fills

This matters most when:

- contours overlap
- contours nest inside each other
- inverse fill behavior is used

You do not need to master all fill rules yet, but you should know that path filling is not determined only by visible edges.

## A Real Path Example

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPath.h"
#include "include/core/SkSurface.h"

void DrawPathExample(SkCanvas* canvas) {
    SkPath house;
    house.moveTo(80, 200);
    house.lineTo(80, 120);
    house.lineTo(140, 70);
    house.lineTo(200, 120);
    house.lineTo(200, 200);
    house.close();

    SkPaint fill;
    fill.setAntiAlias(true);
    fill.setColor(SK_ColorBLUE);
    canvas->drawPath(house, fill);

    SkPaint outline;
    outline.setAntiAlias(true);
    outline.setColor(SK_ColorBLACK);
    outline.setStyle(SkPaint::kStroke_Style);
    outline.setStrokeWidth(4);
    canvas->drawPath(house, outline);
}
```

This shows a common pattern:

- use one paint to fill
- use another paint to stroke the outline

## Transforms Change Future Drawing

Your local `SkCanvas.h` exposes these commonly used transform methods:

- `translate(...)`
- `scale(...)`
- `rotate(...)`
- `concat(...)`

These change the canvas transformation state for future draw calls.

That word matters:

- future

Transforms do not rewrite what was already drawn.

## `translate(...)`

Translation moves the coordinate system.

Real usage:

```cpp
canvas->save();
canvas->translate(120, 60);

SkPaint paint;
paint.setColor(SK_ColorBLUE);

canvas->drawRect(SkRect::MakeXYWH(0, 0, 100, 60), paint);
canvas->restore();
```

The rectangle is drawn at the translated position, even though its local coordinates start at `(0, 0)`.

This is one of the cleanest ways to reuse shape logic in multiple positions.

## `scale(...)`

Scaling changes the size of future drawing in the current coordinate space.

Real usage:

```cpp
canvas->save();
canvas->translate(80, 80);
canvas->scale(1.5f, 1.5f);

SkPaint paint;
paint.setColor(SK_ColorRED);

canvas->drawCircle(0, 0, 30, paint);
canvas->restore();
```

This makes the later geometry appear larger.

## `rotate(...)`

Rotation rotates future drawing around the current origin, or around a specified pivot if you use the overload with pivot coordinates.

Real usage:

```cpp
canvas->save();
canvas->translate(240, 120);
canvas->rotate(25);

SkPaint paint;
paint.setColor(SK_ColorGREEN);

canvas->drawRect(SkRect::MakeXYWH(-40, -20, 80, 40), paint);
canvas->restore();
```

This is a common pattern:

- translate to a useful local origin
- rotate
- draw centered geometry

## `concat(...)`

`concat(...)` applies an explicit matrix to the canvas.

Real usage:

```cpp
#include "include/core/SkMatrix.h"

SkMatrix matrix;
matrix.setIdentity();
matrix.setTranslate(320, 80);

canvas->save();
canvas->concat(matrix);
canvas->drawRect(SkRect::MakeXYWH(0, 0, 100, 50), paint);
canvas->restore();
```

This becomes more important when you are composing transforms more deliberately.

For early usage, `translate`, `scale`, and `rotate` are often easier to read.

## Save And Restore Are Part Of Spatial Drawing

Your local `SkCanvas.h` is explicit that `save()` and `restore()` preserve and restore matrix and clip state.

That means they are central to geometry, transforms, and clipping.

Basic pattern:

```cpp
canvas->save();
canvas->translate(100, 50);
canvas->clipRect(SkRect::MakeXYWH(0, 0, 80, 80));
canvas->drawRect(SkRect::MakeXYWH(0, 0, 200, 200), paint);
canvas->restore();
```

Without `restore()`, later drawing would keep the changed transform and clip.

## Clipping Restricts Where Drawing Can Appear

Your local `SkCanvas.h` exposes:

- `clipRect(...)`
- `clipPath(...)`

Clipping does not create geometry by itself.

Instead, it limits the visible area for later drawing operations.

## `clipRect(...)`

This is the most common clipping entry point.

Real usage:

```cpp
canvas->save();
canvas->clipRect(SkRect::MakeXYWH(40, 40, 120, 120));

SkPaint paint;
paint.setColor(SK_ColorBLUE);

canvas->drawRect(SkRect::MakeXYWH(0, 0, 220, 220), paint);
canvas->restore();
```

Only the part inside the clip is visible.

### Anti-Aliased Clipping

Your local header also supports:

```cpp
canvas->clipRect(SkRect::MakeXYWH(40, 40, 120, 120), true);
```

This is useful when you want smoother clipped edges.

## `clipPath(...)`

This clips future drawing to an arbitrary path shape.

Real usage:

```cpp
SkPath clipShape;
clipShape.moveTo(120, 20);
clipShape.lineTo(220, 180);
clipShape.lineTo(20, 180);
clipShape.close();

canvas->save();
canvas->clipPath(clipShape, true);

SkPaint paint;
paint.setColor(SK_ColorRED);
canvas->drawRect(SkRect::MakeXYWH(0, 0, 240, 240), paint);

canvas->restore();
```

This is one of the easiest ways to see that clipping and geometry are related but not the same thing.

The path defines the clip shape.

The rectangle is still the thing being drawn.

## Clip Operations

Your local `SkCanvas.h` also exposes overloads taking `SkClipOp`.

At the basics level, the important default is:

- intersection

That means new clip shapes typically narrow the current clip rather than replacing it with an unrelated region.

You do not need a deep clip-operation taxonomy yet, but you should know clip changes are cumulative unless state is restored.

## A Real Example Combining Geometry, Path, Transform, and Clip

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPath.h"
#include "include/core/SkRRect.h"
#include "include/core/SkRect.h"

void DrawGeometryScene(SkCanvas* canvas) {
    canvas->clear(SK_ColorWHITE);

    SkPaint fill;
    fill.setAntiAlias(true);
    fill.setColor(SK_ColorBLUE);

    canvas->drawRect(SkRect::MakeXYWH(20, 20, 100, 60), fill);

    SkRRect rr = SkRRect::MakeRectXY(SkRect::MakeXYWH(140, 20, 120, 60), 16, 16);
    SkPaint rounded;
    rounded.setAntiAlias(true);
    rounded.setColor(SK_ColorRED);
    canvas->drawRRect(rr, rounded);

    SkPath triangle;
    triangle.moveTo(340, 20);
    triangle.lineTo(400, 100);
    triangle.lineTo(280, 100);
    triangle.close();

    SkPaint trianglePaint;
    trianglePaint.setAntiAlias(true);
    trianglePaint.setColor(SK_ColorGREEN);
    canvas->drawPath(triangle, trianglePaint);

    canvas->save();
    canvas->translate(80, 180);
    canvas->rotate(20);

    SkPaint stroke;
    stroke.setAntiAlias(true);
    stroke.setColor(SK_ColorBLACK);
    stroke.setStyle(SkPaint::kStroke_Style);
    stroke.setStrokeWidth(6);
    canvas->drawRect(SkRect::MakeXYWH(-40, -30, 80, 60), stroke);
    canvas->restore();

    SkPath clipShape = SkPath::Circle(500, 220, 50);
    canvas->save();
    canvas->clipPath(clipShape, true);

    SkPaint clipped;
    clipped.setColor(SK_ColorBLUE);
    canvas->drawRect(SkRect::MakeXYWH(440, 160, 140, 120), clipped);
    canvas->restore();
}
```

This one example shows:

- direct shape drawing
- rounded rectangles
- path geometry
- transform-based placement
- clipping with a path

## Common Beginner Mistakes

### Mistake 1: Forgetting That Transforms Affect Future Drawing

Transforms do not retroactively change already drawn content.

### Mistake 2: Forgetting `close()` On A Shape You Expected To Be Closed

An open contour and a closed contour can behave differently, especially with fill and stroke expectations.

### Mistake 3: Mixing Up Geometry And Clipping

Drawing a path is not the same as clipping to a path.

### Mistake 4: Leaving A Clip Active By Accident

If you clip and forget to restore, later drawing may disappear unexpectedly.

### Mistake 5: Using Paths When A Simpler Shape API Would Be Clearer

If you only need a rectangle or rounded rectangle, `drawRect()` or `drawRRect()` is often simpler and easier to read than building a path manually.

### Mistake 6: Expecting Stroke Width Or Paint To Change The Underlying Geometry Object

Paint affects rendering appearance. It does not rewrite the path or rectangle itself.

## Rules Of Thumb

- use `SkRect` for simple axis-aligned rectangles
- use `SkRRect` for rounded rectangles
- use `SkPath` when shape geometry is custom
- use `translate`, `scale`, and `rotate` for readable transform code
- wrap local transform and clip changes in `save()` / `restore()`
- use `clipRect()` first when a rectangle clip is enough
- use `clipPath()` only when you truly need an arbitrary clip shape

## What To Remember

- geometry objects describe shape, not appearance
- transforms change the coordinate system for future draw calls
- clipping limits visibility, not geometry construction
- `SkPath` is the general vector shape container
- `save()` / `restore()` are central to transforms and clipping, not just convenience helpers

## Next Step

The next document should focus on image-related Skia usage:

- `SkImage`
- `SkBitmap`
- `SkPixmap`
- snapshots
- pixel reads
- practical image drawing and image data handling
