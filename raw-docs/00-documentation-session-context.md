# Skia Documentation Session Context

This document exists to preserve continuity for this documentation set.

It explains:

- what this documentation project is trying to do
- what has already been covered
- how the existing docs were written
- what standards were used
- what is still missing
- what should be done next to continue the work without losing context

## 1. Goal of this documentation set

The goal is to create a comprehensive Skia documentation set for the local minimal Skia tree, because the official documentation does not cover enough of the practical and source-grounded usage surface.

This doc set is intended to be:

- grounded in the local Skia source tree
- practical
- usage-heavy
- easy to hard in progression
- broad across important modules
- useful for real C++/Win32 development

At this stage, the project has focused on:

- Skia itself
- not backend internals
- not render-pipeline internals

That means the current scope has emphasized:

- core APIs
- object model
- drawing
- paint
- canvas
- geometry
- images
- text
- SVG
- PDF
- Skottie

And it has explicitly avoided deep internal coverage of:

- Ganesh internals
- Graphite internals
- GL backend internals
- Dawn backend internals
- Direct3D backend internals
- render pipeline internals

## 2. Source of truth used for the docs

The documentation is intended to be grounded in the local Skia tree:

- `F:\skiaCombined\skia`

The working rule for this documentation project is:

- overview docs may be high-level, but still aligned with the local tree
- technical docs should be derived from local `.h` and `.cpp` files

Primary local source areas used so far include:

- `include/core`
- `include/codec`
- `include/docs`
- `include/encode`
- `include/ports`
- `modules/svg`
- `modules/skresources`
- `modules/skshaper`
- `modules/skunicode`
- `modules/skparagraph`
- `modules/skottie`
- selected `src` implementations when header behavior needed clarification

## 3. Documentation standards used in this project

The standards that emerged during this session are important because they define how continuation work should be written.

### Content standard

Each substantial doc should try to cover:

- what the topic is
- why it exists
- when to use it
- when not to use it
- how it relates to nearby APIs
- ownership, lifetime, and mutability behavior
- real usage code
- multiple practical usage patterns
- common mistakes
- caveats
- practical rules of thumb

### Code-example standard

The user strongly preferred:

- genuine usage code
- real Skia APIs
- no vague pseudo-code if avoidable

That means new docs should prefer:

- real includes
- real types
- real factories
- real draw calls
- real object lifecycles

### Scope standard

The user repeatedly preferred:

- Skia API usage
- not deep render pipeline internals
- not backend architecture explanations right now

### Continuation standard

New docs should stay consistent with the existing set:

- practical first
- source grounded
- comprehensive where possible
- no major unexplained gaps inside a topic if the topic is declared “comprehensive”

## 4. What has already been covered

The current `raw-docs` set includes:

- `01-skia-overview.md`
- `02-core-object-model.md`
- `03-drawing-basics.md`
- `04-paint-basics.md`
- `05-geometry-paths-transforms-clipping.md`
- `06-images.md`
- `07-canvas-comprehensive.md`
- `08-paint-comprehensive.md`
- `09-color-and-gradients.md`
- `10-transforms-and-matrices.md`
- `11-fonts-fontmgr-typeface-style-windows.md`
- `12-text-unicode-paragraph-comprehensive.md`
- `13-image-io-codecs-and-encoding.md`
- `14-pdf-rendering-comprehensive.md`
- `15-svg-comprehensive.md`
- `16-skottie-comprehensive.md`

## 5. What each existing doc broadly covers

### `01-skia-overview.md`

Foundation overview:

- what Skia is
- what Skia is not
- the broad object families
- the high-level place of Skia in an app

### `02-core-object-model.md`

Core API mental model:

- `SkSurface`
- `SkCanvas`
- `SkPaint`
- `SkImage`
- `SkBitmap`
- `SkPixmap`
- `SkPath`
- `SkFont`
- `SkTypeface`
- `SkTextBlob`
- `SkDocument`
- ownership and relationship basics

### `03-drawing-basics.md`

Basic draw flow:

- obtain/create surface
- get canvas
- clear
- draw shapes, text, images
- save/restore
- transforms
- clip basics
- readback and snapshot basics

### `04-paint-basics.md`

Paint fundamentals:

- color
- alpha
- fill
- stroke
- antialiasing
- width, cap, join, miter
- basic blend mode

### `05-geometry-paths-transforms-clipping.md`

Spatial drawing basics:

- `SkRect`
- `SkRRect`
- `SkPoint`
- `SkPath`
- path contours
- transforms
- clipping

### `06-images.md`

Core image object usage:

- `SkImage`
- `SkBitmap`
- `SkPixmap`
- snapshots
- raster image creation paths
- drawing images
- reading pixels
- wrapping memory
- image-as-shader usage

### `07-canvas-comprehensive.md`

Large `SkCanvas` reference-style guide:

- canvas creation/association
- state stack
- transforms
- clipping
- primitive drawing
- images
- text
- pictures
- advanced draw families
- query/inspection helpers

Important note:

- this is broad and useful, but not guaranteed to be literally perfect API-by-API complete against `SkCanvas.h`

### `08-paint-comprehensive.md`

Large `SkPaint` reference-style guide:

- construction/reset/copy/move
- anti-aliasing
- dither
- style
- color/alpha
- stroke configuration
- shader
- color filter
- blender
- path effect
- mask filter
- image filter
- path-effect families and composition

Important note:

- it covers the practical paint surface well
- it may still not be 100% header-complete one-method-at-a-time

### `09-color-and-gradients.md`

Color and shader-color source basics:

- `SkColor`
- `SkColor4f`
- channel helpers
- color spaces at a basic level
- solid color shaders
- linear, radial, conical, sweep gradients
- interpolation and local matrices

### `10-transforms-and-matrices.md`

Matrix-focused doc:

- `translate`
- `scale`
- `rotate`
- `skew`
- `concat`
- `setMatrix`
- `resetMatrix`
- `SkMatrix`
- `SkM44`
- mapping and inversion
- shader local matrices

### `11-fonts-fontmgr-typeface-style-windows.md`

Windows font system integration for Skia:

- `SkFontMgr`
- `SkTypeface`
- `SkFontStyle`
- `SkFontStyleSet`
- `SkFont`
- DirectWrite-oriented usage
- file/data loading
- fallback
- glyph lookup

### `12-text-unicode-paragraph-comprehensive.md`

Unified text doc:

- Unicode handling
- shaping
- paragraph layout
- multilingual text
- text decoration and style
- foreground/background paint
- fallback and layout behavior

### `13-image-io-codecs-and-encoding.md`

Image input/output side:

- reading files/memory/streams
- `SkCodec`
- decode paths
- write/encode paths
- JPEG
- PNG
- WebP
- file and memory output patterns

### `14-pdf-rendering-comprehensive.md`

Skia PDF generation side:

- `SkDocument`
- `SkPDF::MakeDocument(...)`
- pages
- metadata
- PDF options
- structured PDF features
- close/abort lifecycle

Important note:

- this is PDF generation, not existing-PDF viewing/parsing

### `15-svg-comprehensive.md`

SVG DOM and rendering:

- `SkSVGDOM`
- builder
- root sizing
- `viewBox`
- `preserveAspectRatio`
- text setup
- resources
- targeted node rendering
- DOM mutation

### `16-skottie-comprehensive.md`

Skottie animation:

- `skottie::Animation`
- builder
- time domains
- rendering
- text/resources
- logger/markers/properties/slots
- full minimal Win32 app

## 6. How the current doc set has been organized

The organization has been mostly easy-to-hard and foundation-to-module:

1. overview
2. object model
3. drawing
4. paint basics
5. geometry
6. images
7. canvas
8. paint comprehensive
9. color and gradients
10. transforms and matrices
11. fonts
12. text/unicode/paragraph
13. image I/O
14. PDF
15. SVG
16. Skottie

This is a usable foundation, but the overall set is not finished yet.

## 7. What is still missing

The biggest remaining gaps for a broader “complete Skia API usage” doc set are:

- `SkSurface` comprehensive
- shader system comprehensive
- runtime effect / SkSL doc
- image filters comprehensive
- color filters comprehensive
- mask filters comprehensive
- blenders/compositing comprehensive
- `SkPicture` / `SkPictureRecorder`
- path ops / boolean operations
- sampling and resampling
- color management comprehensive
- streams/data/memory utilities as a unified doc
- troubleshooting/performance doc

There are also lower-priority or specialized gaps:

- `SkRegion`
- `SkRSXform`
- vertices / mesh / atlas / patch APIs
- `SkDrawable`
- annotation APIs
- some lower-level text blob / glyph-specific material as a separate dedicated doc

## 8. What has been intentionally deferred

These have not been the focus yet, by choice:

- Ganesh
- Graphite
- GL
- Dawn
- Direct3D
- backend integration layers
- render pipeline internals

Those are part of the larger Skia ecosystem, but they were intentionally not made the current priority.

## 9. What should be covered to make the set feel much more complete

If the goal is to make the current Skia usage docs feel substantially complete before moving into backends, the best next docs are:

1. `SkSurface` comprehensive
2. shader comprehensive
3. `SkRuntimeEffect` / SkSL
4. image filters comprehensive
5. color filters / mask filters / blenders
6. `SkPicture` / recording
7. path ops comprehensive
8. sampling and resampling
9. color management comprehensive
10. troubleshooting/performance

That group would close a large percentage of the most visible practical gaps.

## 10. What “comprehensive” should mean for continuation work

For this project, “comprehensive” should not mean only:

- long
- broad
- concept-heavy

It should mean:

- grounded in actual local APIs
- multiple real usage patterns
- important overloads and adjacent APIs covered
- common failure cases included
- code examples good enough to start implementation work

If a topic is declared comprehensive, continuation work should try to avoid obvious omissions inside that topic.

## 11. Continuation guidance for future work

If a future session continues this documentation set, the safest working process is:

1. inspect the relevant local headers in `F:\skiaCombined\skia`
2. inspect implementation files when header behavior is not enough
3. compare against existing `raw-docs` files to avoid duplicate coverage
4. prefer real code examples over conceptual pseudo-code
5. add missing examples to existing docs when the topic already has a natural home
6. create a new doc only when the topic is large enough to deserve one

## 12. Current recommended next-doc order

Recommended next-doc order from this point:

1. `17-surface-comprehensive.md`
2. `18-shaders-comprehensive.md`
3. `19-runtime-effect-and-sksl.md`
4. `20-image-filters-comprehensive.md`
5. `21-color-filters-mask-filters-and-blenders.md`
6. `22-picture-and-recording.md`
7. `23-path-ops-comprehensive.md`
8. `24-sampling-and-resampling.md`
9. `25-color-management-comprehensive.md`
10. `26-troubleshooting-and-performance.md`

That order keeps the flow practical and consistent with what has already been written.

## 13. Current known quality notes

These notes matter for future cleanup:

- `07-canvas-comprehensive.md` is broad, but may still miss some specialized or platform-specific APIs
- `08-paint-comprehensive.md` is strong practically, but may still not be 100% header-by-header exhaustive
- `06-images.md` and `13-image-io-codecs-and-encoding.md` split image usage and image I/O across two docs, which is good, but a future dedicated “image comprehensive” doc may still be useful

These are not failures, but they are useful continuation notes.

## 14. Short continuation summary

At this point, the documentation set has a strong practical foundation for:

- core Skia
- paint
- canvas
- images
- transforms
- text
- SVG
- PDF
- Skottie

The next phase should focus on the remaining core API surfaces that are still missing:

- surface
- shaders
- runtime effects
- filters
- recording
- path ops
- color management
- performance/troubleshooting

That work would move the set from “strong partial Skia docs” toward “broad, real-world Skia documentation coverage.”
