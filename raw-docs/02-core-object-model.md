# Core Object Model

## Why The Object Model Matters

Skia becomes much easier to use once the major object types are grouped by role.

A lot of beginner confusion comes from questions like:

- Which object actually stores pixels?
- Which object do I draw with?
- Which object only describes style?
- Which object owns memory?
- Which object is mutable, and which one is not?

This document answers those questions using the local Skia sources as the reference point.

## The Short Version

If you want the fastest mental model first, use this:

- `SkSurface` is a drawing destination
- `SkCanvas` is the drawing interface
- `SkPaint` describes appearance
- `SkPath` describes geometry
- `SkImage` is an immutable image object
- `SkBitmap` is a mutable raster pixel container
- `SkPixmap` is a lightweight view of pixels
- `SkFont` describes how text should be measured and drawn
- `SkTypeface` is the underlying font face data and intrinsic style
- `SkTextBlob` is an immutable container for positioned glyph runs
- `SkDocument` is a document-oriented output target, such as a PDF workflow
- `sk_sp<T>` is the smart pointer used for many ref-counted Skia objects

That is the high-level map. The rest of this page explains what each one means in practice.

## A Role-Based View

The core Skia object model makes more sense if we group objects into categories instead of reading them as a flat list of classes.

### 1. Destinations

These represent where drawing goes.

- `SkSurface`
- `SkDocument`

### 2. Drawing Interface

This is how drawing commands are issued.

- `SkCanvas`

### 3. Appearance

These describe how content should look.

- `SkPaint`
- attached effect objects such as shaders, filters, and related classes

### 4. Geometry And Content Description

These describe what is being drawn.

- `SkPath`
- rectangles, rounded rectangles, points, matrices

### 5. Pixel And Image Objects

These describe or store image data.

- `SkImage`
- `SkBitmap`
- `SkPixmap`

### 6. Text Objects

These describe font data and text drawing inputs.

- `SkFont`
- `SkTypeface`
- `SkTextBlob`

### 7. Lifetime And Sharing Helpers

These support ownership and sharing.

- `SkRefCnt`
- `sk_sp<T>`

## `SkSurface`: A Drawing Destination

`SkSurface` is one of the most important Skia types.

From the header comments in your local tree, `SkSurface` is responsible for managing the pixels that a canvas draws into. It creates and owns the `SkCanvas` that draws into that surface.

Practical meaning:

- a surface is a render target
- drawing commands usually happen through the canvas obtained from the surface
- the surface owns the canvas returned by `getCanvas()`
- the surface may be backed by CPU memory or by GPU-backed storage depending on how it is created

Common things to remember:

- `SkSurface` is not the same thing as `SkCanvas`
- `SkSurface` is about the destination and backing storage
- `SkCanvas` is the command interface layered on top of that destination

Typical usage:

1. Create or obtain a surface
2. Call `surface->getCanvas()`
3. Draw using the returned canvas
4. Extract results if needed, such as with image snapshots or pixel reads

Common confusion:

- People sometimes think `SkCanvas` owns the drawing result. In most common flows, the surface is the destination and the canvas is just the way you issue commands into it.

## `SkCanvas`: The Drawing Interface

`SkCanvas` is the main drawing API surface.

The local header describes it as providing an interface for drawing, including clipping and transformation. It maintains a stack of matrix and clip values.

Practical meaning:

- `SkCanvas` is where draw calls happen
- it does not usually represent long-term pixel ownership by itself
- it applies transforms, clipping, and drawing state during draw calls

A canvas is responsible for actions like:

- clearing
- drawing rectangles, paths, text, images, and vertices
- saving and restoring matrix and clip state
- applying transforms such as translate, scale, rotate, and concat
- clipping future drawing operations

What `SkCanvas` owns depends on how it was created, but in common `SkSurface` usage:

- the surface owns the canvas
- you borrow the pointer and draw through it

Common confusion:

- `SkCanvas` is not just a bag of pixels
- `SkCanvas` is not the style object
- `SkCanvas` is not the image object you later save

Think of it as the active drawing context.

## `SkPaint`: How Drawing Looks

`SkPaint` describes drawing state such as:

- color
- antialiasing
- stroke versus fill
- stroke width
- blend mode
- attached effects such as shaders, color filters, image filters, and path effects

`SkPaint` is not content by itself. It does not mean "draw a thing." It only affects how a thing is drawn.

That distinction matters:

- `SkPath` describes geometry
- `SkPaint` describes how that geometry should be rendered

Common confusion:

- beginners often think `SkPaint` is the main object being rendered
- in reality, it is styling and rendering configuration attached to draw calls

## `SkPath`: Geometry, Not Pixels

`SkPath` represents geometry.

The local header describes it as containing one or more verbs that outline figures: moves, lines, quads, conics, cubics, and close operations. It can contain multiple contours and it also tracks fill behavior.

Practical meaning:

- `SkPath` is a vector geometry object
- it does not store raster pixels
- it can describe open or closed contours
- it is used for both fill and stroke operations

Important details from the local header:

- paths are copied by value at the API level
- the underlying data is shared until modified
- bounds and some metrics are computed lazily

Common confusion:

- `SkPath` is not the same thing as an SVG file
- `SkPath` is not an image
- `SkPath` is a geometry description that the canvas can draw

## `SkImage`: Immutable Image Content

`SkImage` represents image content that can be drawn, but not modified after creation.

The local header is explicit about this: `SkImage` cannot be modified after it is created. It may be backed by raster data, encoded data, picture data, compressed data, or GPU textures depending on how it was created.

Practical meaning:

- `SkImage` is the read-only image object
- it is usually the right choice when image content is primarily consumed, drawn, cached, or shared
- it may defer decoding or materialization until needed

Important creation patterns exposed in the local headers:

- from `SkBitmap`
- from `SkPixmap`
- from encoded data
- from generators
- from pictures

Common confusion:

- `SkImage` is not for mutating pixels in place
- `SkImage` may refer to content that is not immediately decoded
- `SkImage` is often a better fit than `SkBitmap` when the content is read-only

The `SkBitmap` header reinforces this point directly:

- if the pixel array is primarily read-only, use `SkImage`
- if the pixel array is primarily written to, use `SkSurface`

That guideline is worth remembering.

## `SkBitmap`: Mutable Raster Pixel Container

`SkBitmap` describes a raster pixel array.

The local header says it is built on `SkImageInfo` and points to a `SkPixelRef`, which describes the physical array of pixels. It is a flexible pixel container that can be drawn with `SkCanvas`.

Practical meaning:

- `SkBitmap` is for raster pixel storage and access
- it is more mutable and flexible than `SkImage`
- it can share pixel storage with copies
- it is not thread safe as an object wrapper

Important details from the local header:

- copying a bitmap can share the underlying pixels
- a `const SkBitmap` does not make the pixel memory itself immutable
- `SkBitmap` is not thread safe, though the underlying pixel array may be shared carefully

Common confusion:

- `SkBitmap` is not just "another name for image"
- it is a raster pixel container with mutability and storage-oriented behavior
- it is usually not the best semantic choice when you want immutable image content

A useful rule:

- choose `SkBitmap` when you need raster pixel storage semantics
- choose `SkImage` when you need an immutable drawable image object

## `SkPixmap`: A Lightweight Pixel View

`SkPixmap` is a lightweight pairing of:

- `SkImageInfo`
- a pixel address
- row bytes

The local header calls it a low-level utility class and explicitly says:

- `SkCanvas` cannot draw `SkPixmap`
- `SkPixmap` does not provide a direct drawing destination
- `SkPixmap` does not manage pixel lifetime

That makes its role very different from both `SkBitmap` and `SkSurface`.

Practical meaning:

- `SkPixmap` is a view over pixels
- it is useful for describing or accessing existing memory
- it is not an owning high-level drawable object

Common confusion:

- `SkPixmap` is not a destination like `SkSurface`
- `SkPixmap` is not an image object like `SkImage`
- `SkPixmap` is not a full storage container like `SkBitmap`

The simplest way to think about it:

- `SkPixmap` is a low-level pixel descriptor
- `SkBitmap` is a higher-level raster container
- `SkImage` is an immutable drawable image abstraction

## `SkFont`: Text Drawing Configuration

`SkFont` controls options applied when drawing and measuring text.

The local header keeps this definition short, but the methods show the intended role clearly:

- typeface
- size
- scale and skew
- edging
- hinting
- subpixel behavior
- embolden and metric options

Practical meaning:

- `SkFont` configures how glyphs are measured and rendered
- it is not the actual font data store
- it wraps a `SkTypeface` plus rendering and measurement options

Common confusion:

- `SkFont` is not the same thing as the typeface itself
- `SkFont` answers "how should this typeface be used here?"
- `SkTypeface` answers "which underlying font face is this?"

## `SkTypeface`: The Font Face

`SkTypeface` represents the underlying typeface and intrinsic style.

The local header describes it as immutable and shareable across threads. It exposes intrinsic style information like bold, italic, fixed pitch, variation data, table access, glyph mapping, and serialization behavior.

Practical meaning:

- `SkTypeface` is the font face object
- it is not the full text draw configuration
- it can be reused across many `SkFont` instances

Relationship to `SkFont`:

- `SkTypeface` identifies the font face
- `SkFont` adds size and rendering preferences for a specific use

Common confusion:

- users often overload "font" to mean both concepts
- in Skia, separating `SkTypeface` from `SkFont` is important

## `SkTextBlob`: Immutable Glyph Run Container

`SkTextBlob` combines multiple text runs into an immutable container.

The local header explains that each run contains glyphs, paint-related text settings, and positions. It also notes an important limitation of the simpler creation helpers:

- default character-to-glyph mapping is used
- no typeface fallback is performed
- no complex shaping or kerning is performed automatically in those helpers

Practical meaning:

- `SkTextBlob` is useful when text has already been prepared as glyph runs
- it is an efficient immutable container for drawing positioned text content
- it is not a full text layout engine

Common confusion:

- `SkTextBlob` does not replace shaping systems such as paragraph/layout tooling
- it is a container for prepared text runs, not the entire typography solution

## `SkDocument`: Document-Oriented Output

`SkDocument` is the high-level API for document-style output.

The local `SkDocument.h` describes the basic flow clearly:

1. create a document with a stream
2. begin a page
3. draw to the page canvas
4. end the page
5. close the document

Practical meaning:

- `SkDocument` is a destination for paged or document-style output
- it owns the page canvas returned by `beginPage()`
- that canvas goes out of scope after `endPage()`, `close()`, or document destruction

For your broader docs later:

- PDF support builds on this document model
- document output is still part of the same Skia object model, just with page semantics instead of a simple raster surface

## `SkRefCnt` And `sk_sp<T>`: Ownership And Lifetime

Many important Skia objects are ref-counted.

The local `SkRefCnt.h` shows the underlying ownership model:

- objects start with a reference count of 1
- `ref()` increments ownership
- `unref()` decrements ownership
- destruction happens when the count reaches zero

On top of that, Skia uses `sk_sp<T>` as the main smart pointer wrapper for ref-counted objects.

Practical meaning:

- many Skia objects should be passed around as `sk_sp<T>`
- you usually should not manually manage `ref()` and `unref()` unless you are working at lower-level boundaries
- ownership in Skia often becomes much clearer once you notice which objects are returned as `sk_sp<T>`

Common confusion:

- not every Skia type is ref-counted
- `SkCanvas` is often borrowed from another owner rather than held in `sk_sp`
- value types like `SkPath`, `SkFont`, `SkBitmap`, and `SkPixmap` behave differently from ref-counted heap objects

## Value Types Versus Ref-Counted Objects

This distinction is one of the most useful in everyday Skia work.

### Common Value-Like Types

These are usually passed around directly by value or reference:

- `SkPaint`
- `SkPath`
- `SkFont`
- `SkBitmap`
- `SkPixmap`
- simple geometry types like `SkRect` and `SkMatrix`

### Common Ref-Counted Types

These are often held in `sk_sp<T>`:

- `SkSurface`
- `SkImage`
- `SkTypeface`
- `SkDocument`

### Why This Matters

If you mix up value-like objects and ref-counted shared objects, you will misunderstand:

- who owns the data
- what can be safely shared
- what is cheap to copy
- what stays alive after a function returns

## Relationship Map

Here is the practical relationship map you should keep in mind:

- `SkSurface` owns or manages a drawing destination
- `SkSurface` commonly provides an `SkCanvas`
- `SkCanvas` receives draw commands
- draw commands often use `SkPaint`
- geometry may be described with `SkPath` and related types
- image content may come from `SkImage`, `SkBitmap`, or pixel views such as `SkPixmap`
- text drawing often uses `SkFont`, `SkTypeface`, and sometimes `SkTextBlob`
- document output uses `SkDocument`, which also provides a page canvas

If you understand that map, many APIs become much easier to place.

## Common Confusion Matrix

### `SkSurface` vs `SkCanvas`

- `SkSurface` is the destination
- `SkCanvas` is the drawing interface into that destination

### `SkImage` vs `SkBitmap`

- `SkImage` is immutable drawable image content
- `SkBitmap` is a mutable raster pixel container

### `SkBitmap` vs `SkPixmap`

- `SkBitmap` is a higher-level container with pixel-storage semantics
- `SkPixmap` is a lightweight non-owning pixel view

### `SkTypeface` vs `SkFont`

- `SkTypeface` is the underlying font face
- `SkFont` is the configured usage of that face for drawing and measuring

### `SkTextBlob` vs Text Layout

- `SkTextBlob` is a prepared glyph-run container
- it is not the entire shaping or layout system

## Practical Rules Of Thumb

When you are unsure which object you need, these rules help:

- if you need a place to draw, think `SkSurface`
- if you need to issue draw calls, think `SkCanvas`
- if you need styling, think `SkPaint`
- if you need vector geometry, think `SkPath`
- if you need immutable image content, think `SkImage`
- if you need mutable raster pixels, think `SkBitmap`
- if you need a low-level view of raw pixels, think `SkPixmap`
- if you need a font face, think `SkTypeface`
- if you need text rendering configuration, think `SkFont`
- if you need a reusable immutable text run container, think `SkTextBlob`
- if you need paged document output, think `SkDocument`

## What To Remember

If you only keep a few things from this page, keep these:

- `SkSurface` and `SkCanvas` are related, but not interchangeable
- `SkPaint` controls appearance, not content ownership
- `SkImage`, `SkBitmap`, and `SkPixmap` solve different pixel problems
- `SkTypeface` and `SkFont` are different layers of text state
- `SkTextBlob` is a prepared immutable text container, not a full layout engine
- ref-counted objects and value-like objects behave differently in Skia

## Next Step

The next document should move from object roles into actual drawing flow:

- creating a destination
- getting a canvas
- clearing
- drawing shapes
- saving and restoring state
- reading or exporting results
