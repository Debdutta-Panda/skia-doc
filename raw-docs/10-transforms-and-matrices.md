# Transforms and Matrices in Skia

This document covers the transformation system that Skia uses to move, scale, rotate, skew, and remap drawing. It focuses on real usage with `SkCanvas`, `SkMatrix`, and `SkM44`.

The goal is practical understanding:

- how canvas transforms affect drawing
- when to use `SkCanvas` transform calls directly
- when to build an `SkMatrix`
- when `SkM44` matters
- how to inspect, combine, and invert transforms
- how to map points and rectangles through matrices

This guide is grounded in the local Skia headers:

- `include/core/SkCanvas.h`
- `include/core/SkMatrix.h`
- `include/core/SkM44.h`

## 1. The core mental model

Skia drawing starts in local coordinates.

When you call:

```cpp
canvas->drawRect(SkRect::MakeXYWH(0, 0, 100, 40), paint);
```

the rectangle is defined in the current local coordinate system. The canvas transform decides where that rectangle ends up on the destination.

The current transform can:

- translate
- scale
- rotate
- skew
- apply a general matrix

The transform affects later draw calls until you change it again or restore an earlier canvas state.

## 2. Canvas transforms are stateful

`SkCanvas` stores transform state as part of its save/restore stack.

```cpp
void DrawThreeRects(SkCanvas* canvas) {
    SkPaint paint;
    paint.setColor(SK_ColorBlue);

    canvas->drawRect(SkRect::MakeXYWH(10, 10, 80, 40), paint);

    canvas->save();
    canvas->translate(120, 0);
    paint.setColor(SK_ColorRed);
    canvas->drawRect(SkRect::MakeXYWH(10, 10, 80, 40), paint);
    canvas->restore();

    canvas->save();
    canvas->translate(240, 0);
    canvas->scale(1.5f, 1.5f);
    paint.setColor(SK_ColorGreen);
    canvas->drawRect(SkRect::MakeXYWH(10, 10, 80, 40), paint);
    canvas->restore();
}
```

Key point:

- transforms modify later drawing
- `save()` captures the current transform
- `restore()` returns to the captured transform

## 3. `translate()`

Use `translate(dx, dy)` to move the local coordinate system.

```cpp
void DrawTranslatedCircle(SkCanvas* canvas) {
    SkPaint paint;
    paint.setColor(SK_ColorBlue);
    paint.setAntiAlias(true);

    canvas->save();
    canvas->translate(150, 80);
    canvas->drawCircle(0, 0, 30, paint);
    canvas->restore();
}
```

This is usually cleaner than manually adding offsets to every point.

Instead of:

```cpp
canvas->drawCircle(150, 80, 30, paint);
canvas->drawRect(SkRect::MakeXYWH(120, 100, 60, 20), paint);
```

you can write:

```cpp
canvas->save();
canvas->translate(150, 80);
canvas->drawCircle(0, 0, 30, paint);
canvas->drawRect(SkRect::MakeXYWH(-30, 20, 60, 20), paint);
canvas->restore();
```

That pattern is common when drawing a reusable object at multiple positions.

## 4. `scale()`

Use `scale(sx, sy)` to resize later drawing relative to the current origin.

```cpp
void DrawScaledShape(SkCanvas* canvas) {
    SkPaint paint;
    paint.setColor(SK_ColorMagenta);
    paint.setAntiAlias(true);

    SkPath star;
    star.moveTo(0, -30);
    star.lineTo(8, -8);
    star.lineTo(30, -8);
    star.lineTo(12, 6);
    star.lineTo(18, 28);
    star.lineTo(0, 14);
    star.lineTo(-18, 28);
    star.lineTo(-12, 6);
    star.lineTo(-30, -8);
    star.lineTo(-8, -8);
    star.close();

    canvas->save();
    canvas->translate(80, 80);
    canvas->drawPath(star, paint);
    canvas->restore();

    canvas->save();
    canvas->translate(220, 80);
    canvas->scale(2.0f, 2.0f);
    canvas->drawPath(star, paint);
    canvas->restore();
}
```

Important:

- scaling affects geometry
- scaling also affects stroke width because the whole draw is transformed

If you scale a stroked path by `2x`, the stroke appears doubled too.

## 5. `rotate()`

`SkCanvas` has:

- `rotate(degrees)`
- `rotate(degrees, px, py)`

### Rotate around the current origin

```cpp
void DrawRotatedRect(SkCanvas* canvas) {
    SkPaint paint;
    paint.setColor(SK_ColorCyan);
    paint.setAntiAlias(true);

    canvas->save();
    canvas->translate(150, 100);
    canvas->rotate(30);
    canvas->drawRect(SkRect::MakeXYWH(-50, -20, 100, 40), paint);
    canvas->restore();
}
```

### Rotate around a pivot in the current coordinate system

```cpp
void DrawPivotRotation(SkCanvas* canvas) {
    SkPaint rectPaint;
    rectPaint.setColor(SK_ColorBlue);
    rectPaint.setAntiAlias(true);

    SkPaint pivotPaint;
    pivotPaint.setColor(SK_ColorRed);
    pivotPaint.setAntiAlias(true);

    canvas->save();
    canvas->rotate(45, 160, 120);
    canvas->drawRect(SkRect::MakeXYWH(120, 100, 80, 40), rectPaint);
    canvas->restore();

    canvas->drawCircle(160, 120, 4, pivotPaint);
}
```

Use the pivot overload when the shape is already described in destination-like coordinates and you want rotation around a known point.

## 6. `skew()`

`skew(sx, sy)` slants later drawing.

```cpp
void DrawSkewedTextPanel(SkCanvas* canvas, const SkString& label) {
    SkPaint panelPaint;
    panelPaint.setColor(SkColorSetARGB(255, 240, 220, 80));
    panelPaint.setAntiAlias(true);

    SkPaint textPaint;
    textPaint.setColor(SK_ColorBlack);
    textPaint.setAntiAlias(true);

    SkFont font(nullptr, 24);

    canvas->save();
    canvas->translate(60, 80);
    canvas->skew(0.35f, 0.0f);
    canvas->drawRect(SkRect::MakeXYWH(0, 0, 180, 60), panelPaint);
    canvas->drawString(label.c_str(), 16, 38, font, textPaint);
    canvas->restore();
}
```

Skew is less common than translate/scale/rotate, but it is a real part of the matrix system and appears in italic-like or perspective-lite UI effects.

## 7. `concat()`, `setMatrix()`, and `resetMatrix()`

These three APIs are related but not interchangeable.

### `concat()`

`concat()` multiplies the current canvas transform by another matrix.

```cpp
void DrawWithConcat(SkCanvas* canvas) {
    SkPaint paint;
    paint.setColor(SK_ColorBlue);
    paint.setAntiAlias(true);

    SkMatrix m = SkMatrix::Translate(120, 80);
    m.preRotate(20);
    m.preScale(1.25f, 1.25f);

    canvas->save();
    canvas->concat(m);
    canvas->drawRRect(SkRRect::MakeRectXY(SkRect::MakeXYWH(-40, -20, 80, 40), 8, 8), paint);
    canvas->restore();
}
```

Use this when you already have a matrix object and want to combine it with the current canvas state.

### `setMatrix()`

`setMatrix()` replaces the current transform.

```cpp
void DrawWithSetMatrix(SkCanvas* canvas) {
    SkPaint paint;
    paint.setColor(SK_ColorGreen);
    paint.setAntiAlias(true);

    canvas->save();
    canvas->translate(50, 50);

    SkMatrix absolute = SkMatrix::Translate(220, 100);
    absolute.preRotate(-15);

    canvas->setMatrix(absolute);
    canvas->drawRect(SkRect::MakeXYWH(-50, -20, 100, 40), paint);
    canvas->restore();
}
```

Important:

- `concat()` keeps existing transform state and adds to it
- `setMatrix()` throws away the current transform and uses the one you provide

### `resetMatrix()`

`resetMatrix()` restores identity.

```cpp
void DrawOverlayIgnoringPreviousTransform(SkCanvas* canvas) {
    SkPaint worldPaint;
    worldPaint.setColor(SK_ColorBlue);

    SkPaint overlayPaint;
    overlayPaint.setColor(SK_ColorRed);
    overlayPaint.setStrokeWidth(2);
    overlayPaint.setStyle(SkPaint::kStroke_Style);

    canvas->save();
    canvas->translate(120, 80);
    canvas->scale(1.5f, 1.5f);
    canvas->drawRect(SkRect::MakeXYWH(0, 0, 80, 50), worldPaint);

    canvas->resetMatrix();
    canvas->drawRect(SkRect::MakeXYWH(0, 0, 320, 200), overlayPaint);
    canvas->restore();
}
```

This is useful when you want a screen-space overlay even though earlier drawing was transformed.

## 8. Build a reusable `SkMatrix`

`SkCanvas` transform calls are convenient for immediate drawing.

`SkMatrix` is better when you want to:

- reuse the transform
- inspect it
- invert it
- map points or rectangles
- pass it to another API

### Static builders

`SkMatrix.h` provides static factories:

- `SkMatrix::Translate(...)`
- `SkMatrix::Scale(...)`
- `SkMatrix::ScaleTranslate(...)`
- `SkMatrix::RotateDeg(...)`
- `SkMatrix::RotateRad(...)`
- `SkMatrix::Skew(...)`
- `SkMatrix::RectToRect(...)`
- `SkMatrix::MakeAll(...)`

```cpp
SkMatrix a = SkMatrix::Translate(20, 30);
SkMatrix b = SkMatrix::Scale(2.0f, 1.5f);
SkMatrix c = SkMatrix::RotateDeg(30);
SkMatrix d = SkMatrix::Skew(0.2f, 0.0f);
SkMatrix e = SkMatrix::ScaleTranslate(2.0f, 2.0f, 50.0f, 25.0f);
```

### `MakeAll(...)`

Use `MakeAll(...)` when you need explicit control of all 3x3 matrix entries.

```cpp
SkMatrix custom = SkMatrix::MakeAll(
    1.0f, 0.2f, 50.0f,
    0.0f, 1.0f, 20.0f,
    0.0f, 0.0f, 1.0f
);
```

This is advanced and easy to misuse. Prefer the named builders unless you truly need custom matrix values.

## 9. Set up `SkMatrix` by mutation

You can also create and change a matrix in steps.

```cpp
SkMatrix m;
m.setIdentity();
m.setTranslate(100, 60);
m.preRotate(30);
m.preScale(1.25f, 1.25f);
```

Common setup APIs:

- `setIdentity()`
- `setTranslate(...)`
- `setScale(...)`
- `setRotate(...)`
- `setSkew(...)`
- `setConcat(a, b)`
- `setRectToRect(...)`
- `setScaleTranslate(...)`

### Example: set scale about a pivot

```cpp
SkMatrix zoom;
zoom.setScale(2.0f, 2.0f, 160.0f, 120.0f);
```

### Example: set rotation about a pivot

```cpp
SkMatrix spin;
spin.setRotate(30.0f, 160.0f, 120.0f);
```

### Example: combine two matrices explicitly

```cpp
SkMatrix translate = SkMatrix::Translate(100, 80);
SkMatrix rotate = SkMatrix::RotateDeg(25);

SkMatrix combined;
combined.setConcat(translate, rotate);
```

`setConcat(a, b)` is useful when you want a named result matrix rather than mutating one through repeated pre/post operations.

## 10. `pre...` and `post...` operations

`SkMatrix` has:

- `preTranslate`, `preScale`, `preRotate`, `preSkew`
- `postTranslate`, `postScale`, `postRotate`, `postSkew`

These exist because transform order matters.

### Why order matters

Rotate then translate is not the same as translate then rotate.

```cpp
SkMatrix first;
first.setIdentity();
first.postTranslate(100, 0);
first.postRotate(45);

SkMatrix second;
second.setIdentity();
second.postRotate(45);
second.postTranslate(100, 0);
```

`first` and `second` describe different transforms.

### Practical rule

If you are unsure, do this:

- start with identity
- apply one operation at a time
- map a test point to verify the result

```cpp
SkMatrix m;
m.setIdentity();
m.postTranslate(100, 0);
m.postRotate(45);

SkPoint p = {10, 0};
m.mapPoints(&p, &p, 1);
```

That is often the fastest way to confirm that the transform order matches your intent.

## 11. Map points and rectangles

Transforms are not only for drawing. They are also for geometry conversion.

### Map points

```cpp
void MapWidgetPoints() {
    SkMatrix m = SkMatrix::Translate(100, 50);
    m.preScale(2.0f, 2.0f);

    SkPoint src[3] = {
        {0, 0},
        {10, 0},
        {10, 20},
    };
    SkPoint dst[3];

    m.mapPoints(dst, src, 3);
}
```

### Map a rectangle

```cpp
void MapBounds() {
    SkMatrix m = SkMatrix::RotateDeg(15);
    SkRect src = SkRect::MakeXYWH(0, 0, 100, 40);
    SkRect dst;

    bool staysRect = m.mapRect(&dst, src);
}
```

Important:

- `mapRect()` returns the bounds of the transformed rectangle
- if rotation or skew is involved, the result may be a bounding box, not the exact quadrilateral

### Fast path for scale+translate

```cpp
void MapRectScaleTranslateOnly() {
    SkMatrix m = SkMatrix::ScaleTranslate(2.0f, 2.0f, 40.0f, 30.0f);
    SkRect src = SkRect::MakeXYWH(10, 20, 80, 40);
    SkRect dst;

    m.mapRectScaleTranslate(&dst, src);
}
```

Use `mapRectScaleTranslate(...)` only when the matrix is known to be scale+translate.

## 12. `RectToRect(...)`

`RectToRect(...)` is one of the most useful transformation helpers in the API.

It builds a matrix that maps one rectangle into another.

```cpp
SkRect src = SkRect::MakeXYWH(0, 0, 640, 480);
SkRect dst = SkRect::MakeXYWH(50, 50, 300, 200);

SkMatrix fit = SkMatrix::RectToRect(src, dst, SkMatrix::kCenter_ScaleToFit);
```

This is excellent for:

- fitting content into a viewport
- letterboxing
- thumbnail placement
- mapping image space into draw space

### Example: fit a path into a panel

```cpp
void DrawPathFittedToPanel(SkCanvas* canvas, const SkPath& path) {
    SkRect src = path.getBounds();
    SkRect dst = SkRect::MakeXYWH(40, 40, 260, 180);

    SkMatrix fit = SkMatrix::RectToRect(src, dst, SkMatrix::kCenter_ScaleToFit);

    SkPaint border;
    border.setStyle(SkPaint::kStroke_Style);
    border.setColor(SK_ColorBlack);

    SkPaint fill;
    fill.setColor(SkColorSetARGB(255, 80, 160, 240));
    fill.setAntiAlias(true);

    canvas->drawRect(dst, border);

    canvas->save();
    canvas->concat(fit);
    canvas->drawPath(path, fill);
    canvas->restore();
}
```

## 13. Inspect matrix properties

`SkMatrix` can tell you what kind of transform it represents.

Useful query APIs from `SkMatrix.h`:

- `isIdentity()`
- `isTranslate()`
- `isScaleTranslate()`
- `hasPerspective()`
- `rectStaysRect()`
- `preservesAxisAlignment()`
- `isSimilarity()`
- `preservesRightAngles()`

```cpp
void InspectMatrix(const SkMatrix& m) {
    bool identity = m.isIdentity();
    bool translateOnly = m.isTranslate();
    bool scaleTranslate = m.isScaleTranslate();
    bool perspective = m.hasPerspective();
    bool axisAligned = m.rectStaysRect();
    bool similarity = m.isSimilarity();
    bool rightAngles = m.preservesRightAngles();

    SkScalar tx = m.getTranslateX();
    SkScalar ty = m.getTranslateY();
}
```

These queries matter when:

- choosing fast paths
- deciding whether bounds stay simple
- debugging unexpected output

## 14. Invert a matrix

Inversion is essential for hit testing and coordinate conversion.

Example use cases:

- convert device coordinates back to local coordinates
- map mouse/touch positions into object space
- undo a view transform

```cpp
bool MapScreenToLocal(const SkMatrix& localToDevice, SkPoint screenPt, SkPoint* localPt) {
    std::optional<SkMatrix> inverse = localToDevice.invert();
    if (!inverse) {
        return false;
    }

    inverse->mapPoints(localPt, &screenPt, 1);
    return true;
}
```

### Hit-testing example

```cpp
bool HitTestRotatedRect(const SkMatrix& localToDevice, SkPoint screenPt) {
    std::optional<SkMatrix> inverse = localToDevice.invert();
    if (!inverse) {
        return false;
    }

    SkPoint localPt = screenPt;
    inverse->mapPoints(&localPt, &localPt, 1);

    SkRect localRect = SkRect::MakeXYWH(-50, -20, 100, 40);
    return localRect.contains(localPt.x(), localPt.y());
}
```

If inversion fails, the matrix is singular and cannot be reversed cleanly.

## 15. Read the canvas transform back

`SkCanvas.h` exposes:

- `getLocalToDevice()`
- `getLocalToDeviceAs3x3()`
- `getTotalMatrix()`

### 4x4 local-to-device

```cpp
void InspectCanvasTransform(SkCanvas* canvas) {
    SkM44 localToDevice = canvas->getLocalToDevice();
    SkMatrix legacy3x3 = canvas->getLocalToDeviceAs3x3();
    SkMatrix total = canvas->getTotalMatrix();
}
```

General guidance:

- `getLocalToDevice()` is the modern transform view
- `getLocalToDeviceAs3x3()` gives a 3x3 version
- `getTotalMatrix()` is the legacy 3x3-style query

For classic 2D work, the 3x3 view is often enough. For APIs that may involve 4x4 transforms, use `getLocalToDevice()`.

## 16. Real pattern: draw a reusable object many times

This is one of the most common transform use cases.

```cpp
void DrawDial(SkCanvas* canvas) {
    SkPaint fill;
    fill.setColor(SkColorSetARGB(255, 230, 230, 240));
    fill.setAntiAlias(true);

    SkPaint stroke;
    stroke.setColor(SK_ColorBlack);
    stroke.setStyle(SkPaint::kStroke_Style);
    stroke.setStrokeWidth(2);
    stroke.setAntiAlias(true);

    canvas->drawCircle(0, 0, 30, fill);
    canvas->drawCircle(0, 0, 30, stroke);
    canvas->drawLine(0, 0, 0, -22, stroke);
}

void DrawDialGrid(SkCanvas* canvas) {
    for (int row = 0; row < 2; ++row) {
        for (int col = 0; col < 3; ++col) {
            canvas->save();
            canvas->translate(80 + col * 100.0f, 80 + row * 100.0f);
            canvas->rotate((row * 3 + col) * 15.0f);
            DrawDial(canvas);
            canvas->restore();
        }
    }
}
```

This is usually better than manually rebuilding every point in world coordinates.

## 17. Real pattern: separate view transform from object transform

Another useful pattern is to keep:

- one transform for the world or camera
- another transform for the object

```cpp
void DrawObjectInView(SkCanvas* canvas, const SkPath& objectPath) {
    SkMatrix view = SkMatrix::Translate(140, 100);
    view.preScale(1.5f, 1.5f);

    SkMatrix object = SkMatrix::RotateDeg(20);

    SkMatrix world;
    world.setConcat(view, object);

    SkPaint paint;
    paint.setColor(SK_ColorBlue);
    paint.setAntiAlias(true);

    canvas->save();
    canvas->concat(world);
    canvas->drawPath(objectPath, paint);
    canvas->restore();
}
```

This makes it easier to reason about scene-level and object-level transformations separately.

## 18. Shader local matrices

Transforms are not only for geometry. Shaders can also carry local matrices.

```cpp
sk_sp<SkShader> gradient = SkGradientShader::MakeLinear(
    {0, 0},
    {120, 0},
    std::array<SkColor, 2>{SK_ColorBlue, SK_ColorWhite}.data(),
    nullptr,
    2,
    SkTileMode::kClamp
);

SkMatrix shaderMatrix = SkMatrix::RotateDeg(30);
shaderMatrix.postTranslate(40, 20);

sk_sp<SkShader> transformedGradient = gradient->makeWithLocalMatrix(shaderMatrix);

SkPaint paint;
paint.setShader(transformedGradient);
```

This is different from transforming the canvas:

- canvas transform moves the geometry being drawn
- shader local matrix changes how the shader is sampled inside the geometry

That distinction matters a lot when debugging fills, gradients, and patterns.

## 19. `SkM44`: when 4x4 transforms matter

`SkM44` is Skia's 4x4 matrix type.

For ordinary 2D drawing, `SkMatrix` is usually the right default.

Use `SkM44` when you need:

- 4x4 transforms
- 3D-like transforms
- APIs that expose `SkM44`
- perspective-style camera/view logic

### Static builders

`SkM44.h` exposes:

- `SkM44::Translate(...)`
- `SkM44::Scale(...)`
- `SkM44::Rotate(...)`
- `SkM44::RectToRect(...)`
- `SkM44::LookAt(...)`
- `SkM44::Perspective(...)`

### Example: use an `SkM44` with canvas

```cpp
void DrawWithM44(SkCanvas* canvas) {
    SkPaint paint;
    paint.setColor(SK_ColorBlue);
    paint.setAntiAlias(true);

    SkM44 m = SkM44::Translate(180, 120, 0);
    m.preConcat(SkM44::Rotate({0, 0, 1}, SK_ScalarPI / 6));
    m.preConcat(SkM44::Scale(1.5f, 1.5f, 1.0f));

    canvas->save();
    canvas->concat(m);
    canvas->drawRect(SkRect::MakeXYWH(-40, -20, 80, 40), paint);
    canvas->restore();
}
```

### Example: build `SkM44` step by step

```cpp
SkM44 m;
m.setIdentity();
m.setTranslate(120, 80, 0);
m.preScale(2.0f, 2.0f, 1.0f);
```

### Example: invert `SkM44`

```cpp
bool InvertM44(const SkM44& m) {
    SkM44 inverse;
    return m.invert(&inverse);
}
```

## 20. `LookAt(...)` and `Perspective(...)`

These are advanced `SkM44` helpers.

```cpp
SkM44 view = SkM44::LookAt(
    {0.0f, 0.0f, 5.0f},
    {0.0f, 0.0f, 0.0f},
    {0.0f, 1.0f, 0.0f}
);

SkM44 projection = SkM44::Perspective(0.1f, 100.0f, SK_ScalarPI / 4);

SkM44 vp;
vp.setConcat(projection, view);
```

These are not everyday APIs for simple 2D apps, but they are part of the real transform system available in local `SkM44.h`.

## 21. Common mistakes

### Mistake: forgetting transform order

```cpp
SkMatrix m = SkMatrix::Translate(100, 0);
m.preRotate(45);
```

This does not mean the same thing as:

```cpp
SkMatrix m = SkMatrix::RotateDeg(45);
m.preTranslate(100, 0);
```

If the result looks wrong, inspect the order first.

### Mistake: forgetting `save()` / `restore()`

```cpp
canvas->translate(100, 0);
canvas->drawRect(a, paint);
canvas->drawRect(b, paint);
```

Both rectangles are translated. If only one should move, isolate it with `save()` / `restore()`.

### Mistake: using `setMatrix()` when you meant `concat()`

If previous transforms disappear, you likely replaced the matrix instead of combining with it.

### Mistake: assuming `mapRect()` preserves shape exactly

With rotation or skew, `mapRect()` gives transformed bounds, not the exact four-corner polygon.

### Mistake: forgetting inversion may fail

Never assume `invert()` succeeds. Singular matrices exist.

## 22. Practical rules of thumb

- Use `canvas->translate/scale/rotate/skew` for immediate drawing flow.
- Use `save()` / `restore()` aggressively around transformed sub-draws.
- Use `SkMatrix` when you need reuse, inversion, geometry mapping, or transform inspection.
- Use `RectToRect(...)` whenever you need to fit one rectangle into another.
- Use `setMatrix()` only when replacing the current transform is truly what you want.
- Use `SkM44` only when 4x4 or perspective-related work actually matters.
- When in doubt, map a known test point through the matrix and inspect the result.

## 23. Minimal reference summary

Most-used `SkCanvas` transform APIs:

- `translate(...)`
- `scale(...)`
- `rotate(...)`
- `skew(...)`
- `concat(...)`
- `setMatrix(...)`
- `resetMatrix()`
- `getLocalToDevice()`
- `getLocalToDeviceAs3x3()`
- `getTotalMatrix()`

Most-used `SkMatrix` APIs:

- `Translate(...)`
- `Scale(...)`
- `RotateDeg(...)`
- `Skew(...)`
- `RectToRect(...)`
- `setTranslate(...)`
- `setScale(...)`
- `setRotate(...)`
- `setConcat(...)`
- `pre...` and `post...`
- `invert()`
- `mapPoints(...)`
- `mapRect(...)`

Most-used `SkM44` APIs:

- `Translate(...)`
- `Scale(...)`
- `Rotate(...)`
- `setConcat(...)`
- `invert(...)`
- `LookAt(...)`
- `Perspective(...)`
