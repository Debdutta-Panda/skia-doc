# Skia Overview

## What Skia Is

Skia is a 2D graphics library. It provides the drawing engine used to render shapes, text, images, effects, documents, and animation-related content across many kinds of applications and platforms.

At its core, Skia answers a practical question:

"How do we describe visual content in code, and then draw it reliably to a target output?"

That target output might be:

- an on-screen window
- an offscreen buffer
- an image
- an SVG-related workflow
- a PDF document
- an animation scene such as Skottie content

Skia gives you the API vocabulary to describe that content, and the implementation needed to rasterize or encode it into useful results.

## What Skia Is Not

Skia is not a complete application framework.

It does not try to be:

- a window toolkit
- a UI framework
- a layout engine for entire applications
- an animation editor
- a browser engine

Instead, Skia is the graphics layer that other systems can build on top of.

## Why Skia Matters

Skia is important because modern applications still need a clear separation between:

- application logic
- scene or content description
- drawing and visual output

Skia lives in that third area. It is the part that turns drawing commands and graphic assets into visible results.

This makes it useful for:

- custom UI rendering
- document generation
- image processing
- text rendering
- vector drawing
- embedded graphics
- browser and app rendering subsystems

## A Simple Mental Model

The easiest way to understand Skia is to think in terms of four layers:

1. Content you want to draw
2. Objects that describe that content
3. A drawing destination
4. Output produced from the draw calls

In practice, that often looks like this:

1. Create or receive a destination such as a surface
2. Get a canvas from that destination
3. Configure how drawing should look using paint and related objects
4. Draw shapes, text, paths, images, or other content
5. Save, present, snapshot, or encode the result

This is the core loop behind most Skia usage, even when the exact API objects vary by feature area.

## The Core Object Families

You do not need to know every class in Skia at the start. A much better approach is to understand the main object families and what role each one plays.

### Drawing Destination

These objects represent where drawing goes.

- `SkSurface`: a renderable destination you can draw into
- `SkDocument`: a document-style destination, such as PDF output

### Drawing Interface

These objects represent how drawing commands are issued.

- `SkCanvas`: the main drawing interface

If you are drawing with Skia directly, `SkCanvas` is one of the most important types you will learn.

### Style and Appearance

These objects represent how content should look.

- `SkPaint`: color, stroke, fill, antialiasing, blending, and attached effects
- shader, color filter, image filter, and path effect classes: specialized appearance control

### Geometry and Shapes

These objects represent what is being drawn.

- `SkRect`, `SkRRect`, `SkPoint`
- `SkPath`
- matrices and transform-related types

### Pixel and Image Data

These objects represent image content and pixel storage.

- `SkImage`
- `SkBitmap`
- `SkPixmap`
- image codecs and encoders

### Text

These objects represent text shaping and drawing inputs at the basic Skia level.

- `SkFont`
- `SkTypeface`
- `SkTextBlob`

### Feature Modules

These provide higher-level or specialized functionality on top of core Skia concepts.

- SVG support
- PDF generation
- Skottie animation playback

These topics belong to the same documentation set because they still build on the same Skia mental model: describe content, configure appearance, and produce output.

## How Drawing Usually Works

A typical Skia flow is conceptually simple:

1. Obtain a destination
2. Draw through a canvas
3. Use paints and content objects to control what gets rendered
4. Export or present the result

A minimal conceptual example looks like this:

```cpp
sk_sp<SkSurface> surface = ...;
SkCanvas* canvas = surface->getCanvas();

SkPaint paint;
paint.setAntiAlias(true);
paint.setColor(SK_ColorBLUE);

canvas->clear(SK_ColorWHITE);
canvas->drawRect(SkRect::MakeXYWH(20, 20, 120, 80), paint);
```

Even if later chapters introduce images, text, SVG, PDF, or Skottie, most of the work still follows this same pattern:

- create or obtain the right object
- configure it
- draw or render
- extract the result

## The Difference Between Core Skia and Feature Areas

It helps to separate "core Skia" from "Skia-related modules."

Core Skia usually means the common 2D drawing API:

- surfaces
- canvases
- paints
- paths
- images
- text
- transforms
- clipping
- effects

Feature areas extend that foundation:

- Image workflows: decoding, pixel access, image creation, encoding
- SVG workflows: parsing and rendering SVG content
- PDF workflows: generating document output
- Skottie workflows: loading and rendering Lottie-style animation content

You should think of these as connected layers rather than disconnected products.

## What This Documentation Set Covers

This documentation set is designed to move from easy to hard while staying centered on practical understanding.

Current scope:

- Skia fundamentals
- drawing model and object roles
- paint, geometry, transforms, clipping
- images
- SVG
- PDF
- Skottie
- common usage patterns
- common mistakes and debugging guidance

Current non-goals for this phase:

- render pipeline internals
- backend architecture deep dives
- low-level GPU execution flow

Those topics may matter later, but they are intentionally excluded here so the documentation stays focused on how to use and understand Skia first.

## How To Read The Rest Of The Docs

If you are new to Skia, read in this order:

1. Overview
2. Core object model
3. Drawing basics
4. Paint, geometry, transforms, and clipping
5. Images
6. SVG
7. PDF
8. Skottie

If you already know basic graphics concepts, you can use this page as a map and jump directly to the feature area you need.

## Common Beginner Mistakes

Many early Skia problems come from confusion about object roles.

Examples:

- treating `SkCanvas` as the storage object instead of the drawing interface
- mixing up `SkImage` and `SkBitmap`
- expecting `SkPaint` to be the thing being drawn instead of the style applied to drawing
- trying to understand advanced modules before the surface-canvas-paint model is clear

A strong mental model saves time later.

## A Practical Summary

If you remember only a few things from this page, remember these:

- Skia is a 2D graphics library, not a full app framework
- `SkCanvas` is where drawing commands are issued
- `SkSurface` is a common drawing destination
- `SkPaint` controls appearance
- shapes, text, paths, images, SVG, PDF, and Skottie all fit into the same broader graphics model
- understanding the object roles is more important than memorizing class names

## Next Step

The next document should explain the Skia object model in more detail:

- what each major object owns
- which objects describe content
- which objects store pixels
- which objects issue drawing commands
- how the main types relate to one another
