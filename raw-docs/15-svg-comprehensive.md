# SVG in Skia: Comprehensive DOM, Rendering, Text, Resources, and Usage

This document covers the SVG module in the local Skia tree.

It focuses on the real public SVG APIs exposed by this tree:

- `SkSVGDOM`
- `SkSVGDOM::Builder`
- `SkSVGSVG`
- `SkSVGNode`
- `SkSVGPresentationContext`
- `skresources::ResourceProvider`

This guide is grounded in the local sources:

- `modules/svg/include/SkSVGDOM.h`
- `modules/svg/include/SkSVGNode.h`
- `modules/svg/include/SkSVGSVG.h`
- `modules/svg/include/SkSVGRenderContext.h`
- `modules/skresources/include/SkResources.h`
- `modules/skshaper/include/SkShaper_factory.h`
- `modules/skshaper/utils/FactoryHelpers.h`
- `modules/svg/src/*`

## 1. The main idea

Skia SVG is a DOM-based SVG renderer.

The normal flow is:

1. create or open an `SkStream`
2. build an `SkSVGDOM`
3. optionally configure container size
4. optionally provide font and resource loading support
5. render the DOM into an `SkCanvas`

It is important to think of Skia SVG as:

- a parsed DOM that you can render
- a DOM that you can inspect by id
- a DOM whose node attributes can be changed

It is not a web browser engine.

## 2. The central objects

### `SkSVGDOM`

`SkSVGDOM` is the parsed SVG document.

It owns:

- the root SVG element
- the id mapper used for references
- the font manager used for text lookup
- the resource provider used for images and external resources
- the text shaping factory used for shaping `<text>`

Important public entry points:

- `SkSVGDOM::Builder`
- `SkSVGDOM::MakeFromStream(...)`
- `getRoot()`
- `setContainerSize(...)`
- `findNodeById(...)`
- `render(...)`
- `renderNode(...)`

### `SkSVGDOM::Builder`

The builder is the real configuration point before parsing.

It lets you attach:

- `setFontManager(...)`
- `setResourceProvider(...)`
- `setTextShapingFactory(...)`

Then you call:

- `make(SkStream&)`

### `SkSVGSVG`

`SkSVGSVG` is the root `<svg>` element.

It is where root sizing rules matter:

- `width`
- `height`
- `viewBox`
- `preserveAspectRatio`

It also exposes the intrinsic size query used by the DOM.

### `SkSVGNode`

`SkSVGNode` is the base class for parsed SVG nodes.

Important capabilities:

- render the node
- convert some nodes to paint or path
- inspect or mutate attributes
- access inherited and non-inherited presentation attributes

## 3. Minimal file-to-canvas example

This is the smallest real path you should keep in mind:

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkFontMgr.h"
#include "include/core/SkStream.h"
#include "modules/skshaper/utils/FactoryHelpers.h"
#include "modules/svg/include/SkSVGDOM.h"

sk_sp<SkSVGDOM> LoadSvgFromFile(const char* path) {
    std::unique_ptr<SkStreamAsset> stream = SkStream::MakeFromFile(path);
    if (!stream) {
        return nullptr;
    }

    SkSVGDOM::Builder builder;
    builder.setFontManager(SkFontMgr::RefDefault());
    builder.setTextShapingFactory(SkShapers::BestAvailable());

    return builder.make(*stream);
}

void DrawSvg(SkCanvas* canvas, const char* path, int width, int height) {
    sk_sp<SkSVGDOM> dom = LoadSvgFromFile(path);
    if (!dom) {
        return;
    }

    dom->setContainerSize(SkSize::Make(width, height));
    dom->render(canvas);
}
```

This already covers the essential SVG pipeline:

- file input
- builder setup
- font support
- text shaping support
- container sizing
- rendering

## 4. Parsing SVG from different input forms

### From a file path

This is the most common case.

```cpp
#include "include/core/SkStream.h"
#include "modules/svg/include/SkSVGDOM.h"

sk_sp<SkSVGDOM> LoadSvgDomFromFile(const char* path) {
    std::unique_ptr<SkStreamAsset> stream = SkStream::MakeFromFile(path);
    if (!stream) {
        return nullptr;
    }

    return SkSVGDOM::MakeFromStream(*stream);
}
```

`SkSVGDOM::MakeFromStream(...)` is the short path.

Use it when:

- you do not need builder customization
- you do not need external resource loading
- the SVG does not rely on text rendering that needs your chosen font manager/shaper setup

### From bytes already in memory

`SkSVGDOM` parses from `SkStream`, not directly from raw pointers or strings.

So if you already have bytes, wrap them in an `SkMemoryStream`.

```cpp
#include "include/core/SkData.h"
#include "include/core/SkStream.h"
#include "modules/svg/include/SkSVGDOM.h"

sk_sp<SkSVGDOM> LoadSvgDomFromMemory(sk_sp<SkData> bytes) {
    if (!bytes) {
        return nullptr;
    }

    SkMemoryStream stream(bytes);
    return SkSVGDOM::MakeFromStream(stream);
}
```

### From a customized builder

This is the recommended production path.

```cpp
#include "include/core/SkFontMgr.h"
#include "include/core/SkStream.h"
#include "modules/skshaper/utils/FactoryHelpers.h"
#include "modules/svg/include/SkSVGDOM.h"

sk_sp<SkSVGDOM> BuildSvgDom(SkStream& stream) {
    SkSVGDOM::Builder builder;
    builder.setFontManager(SkFontMgr::RefDefault());
    builder.setTextShapingFactory(SkShapers::BestAvailable());
    return builder.make(stream);
}
```

## 5. Why the builder matters

The builder is not optional in the practical sense.

You can skip it for trivial SVG content, but real SVG often needs at least one of:

- font loading
- text shaping
- external image loading
- external font loading

The local `SkSVGDOM.h` comments are explicit about one important rule:

- if a font manager is not set, and rendering requires a font, the text will not be displayed

That means a text-heavy SVG should usually be built with:

- `setFontManager(...)`
- `setTextShapingFactory(...)`

An image-heavy SVG should usually also be built with:

- `setResourceProvider(...)`

## 6. Fonts and text in SVG

### Why fonts matter

SVG text is not just painted geometry.

When an SVG contains `<text>`, Skia may need:

- font family resolution
- fallback lookup
- shaping
- bidi handling
- script run segmentation

So the safest builder setup for real text content is:

```cpp
#include "include/core/SkFontMgr.h"
#include "modules/skshaper/utils/FactoryHelpers.h"
#include "modules/svg/include/SkSVGDOM.h"

SkSVGDOM::Builder MakeTextReadySvgBuilder() {
    SkSVGDOM::Builder builder;
    builder.setFontManager(SkFontMgr::RefDefault());
    builder.setTextShapingFactory(SkShapers::BestAvailable());
    return builder;
}
```

### Basic text-capable SVG loading

```cpp
#include "include/core/SkStream.h"
#include "modules/skshaper/utils/FactoryHelpers.h"
#include "modules/svg/include/SkSVGDOM.h"

sk_sp<SkSVGDOM> LoadTextSvg(const char* path) {
    std::unique_ptr<SkStreamAsset> stream = SkStream::MakeFromFile(path);
    if (!stream) {
        return nullptr;
    }

    SkSVGDOM::Builder builder;
    builder.setFontManager(SkFontMgr::RefDefault());
    builder.setTextShapingFactory(SkShapers::BestAvailable());
    return builder.make(*stream);
}
```

### If you do not set a font manager

This is a real failure mode:

```cpp
#include "include/core/SkStream.h"
#include "modules/svg/include/SkSVGDOM.h"

sk_sp<SkSVGDOM> LoadSvgWithoutFonts(const char* path) {
    std::unique_ptr<SkStreamAsset> stream = SkStream::MakeFromFile(path);
    if (!stream) {
        return nullptr;
    }

    // This may parse successfully.
    // But if the SVG needs a font during rendering, text may not appear.
    return SkSVGDOM::MakeFromStream(*stream);
}
```

### Text shaping factory choices

The most practical choice is:

- `SkShapers::BestAvailable()`

Because it selects the best shaping path available in the local build.

```cpp
#include "modules/skshaper/utils/FactoryHelpers.h"

sk_sp<SkShapers::Factory> MakeSvgTextShaper() {
    return SkShapers::BestAvailable();
}
```

If your build has only the primitive path, `BestAvailable()` can still fall back to:

- `SkShapers::Primitive::Factory()`

## 7. External images and resources

### Why resource providers matter

The SVG module does not hardcode file loading for every external reference.

Instead, it relies on `skresources::ResourceProvider`.

That resource provider can be used for:

- external images
- external fonts
- nested resources
- data URI handling through a proxy

If you skip resource-provider setup:

- external images may not load
- external fonts may not load

### File-based resource provider

The standard file-backed helper is:

- `skresources::FileResourceProvider::Make(...)`

```cpp
#include "include/core/SkFontMgr.h"
#include "include/core/SkString.h"
#include "include/core/SkStream.h"
#include "modules/skresources/include/SkResources.h"
#include "modules/skshaper/utils/FactoryHelpers.h"
#include "modules/svg/include/SkSVGDOM.h"

sk_sp<SkSVGDOM> LoadSvgWithFileResources(const char* svgPath, const char* baseDir) {
    std::unique_ptr<SkStreamAsset> stream = SkStream::MakeFromFile(svgPath);
    if (!stream) {
        return nullptr;
    }

    auto fontMgr = SkFontMgr::RefDefault();
    auto fileResources = skresources::FileResourceProvider::Make(
        SkString(baseDir),
        skresources::ImageDecodeStrategy::kLazyDecode);

    SkSVGDOM::Builder builder;
    builder.setFontManager(fontMgr);
    builder.setTextShapingFactory(SkShapers::BestAvailable());
    builder.setResourceProvider(fileResources);

    return builder.make(*stream);
}
```

The local `SkResources.h` comments note an important requirement:

- to decode images, codecs must be registered before calling `FileResourceProvider::Make(...)`

That matters if your SVG includes external raster images.

### Cached resource provider

If you want repeated image references to reuse loaded assets, wrap the provider in:

- `skresources::CachingResourceProvider::Make(...)`

```cpp
#include "modules/skresources/include/SkResources.h"

sk_sp<skresources::ResourceProvider> MakeCachedFileResources(const char* baseDir) {
    auto fileProvider = skresources::FileResourceProvider::Make(
        SkString(baseDir),
        skresources::ImageDecodeStrategy::kLazyDecode);

    return skresources::CachingResourceProvider::Make(fileProvider);
}
```

### Data URI support

If the SVG contains embedded `data:` URLs for images or fonts, use:

- `skresources::DataURIResourceProviderProxy::Make(...)`

```cpp
#include "include/core/SkFontMgr.h"
#include "modules/skresources/include/SkResources.h"

sk_sp<skresources::ResourceProvider> MakeSvgResourceProviderWithDataUriSupport(
        const char* baseDir) {
    auto fontMgr = SkFontMgr::RefDefault();

    auto fileProvider = skresources::FileResourceProvider::Make(
        SkString(baseDir),
        skresources::ImageDecodeStrategy::kLazyDecode);

    auto cachedProvider = skresources::CachingResourceProvider::Make(fileProvider);

    return skresources::DataURIResourceProviderProxy::Make(
        cachedProvider,
        skresources::ImageDecodeStrategy::kLazyDecode,
        fontMgr);
}
```

This is the most practical “full” provider stack for SVGs that may use:

- external files
- repeated images
- embedded data URIs
- embedded font data

### Production-style builder for SVG with text and resources

```cpp
#include "include/core/SkFontMgr.h"
#include "include/core/SkStream.h"
#include "modules/skresources/include/SkResources.h"
#include "modules/skshaper/utils/FactoryHelpers.h"
#include "modules/svg/include/SkSVGDOM.h"

sk_sp<SkSVGDOM> LoadProductionSvg(const char* svgPath, const char* baseDir) {
    std::unique_ptr<SkStreamAsset> stream = SkStream::MakeFromFile(svgPath);
    if (!stream) {
        return nullptr;
    }

    auto fontMgr = SkFontMgr::RefDefault();
    auto fileProvider = skresources::FileResourceProvider::Make(
        SkString(baseDir),
        skresources::ImageDecodeStrategy::kLazyDecode);
    auto cachedProvider = skresources::CachingResourceProvider::Make(fileProvider);
    auto resourceProvider = skresources::DataURIResourceProviderProxy::Make(
        cachedProvider,
        skresources::ImageDecodeStrategy::kLazyDecode,
        fontMgr);

    SkSVGDOM::Builder builder;
    builder.setFontManager(fontMgr);
    builder.setTextShapingFactory(SkShapers::BestAvailable());
    builder.setResourceProvider(resourceProvider);

    return builder.make(*stream);
}
```

## 8. Rendering the whole SVG

The normal render call is:

- `dom->render(canvas)`

```cpp
#include "include/core/SkCanvas.h"
#include "modules/svg/include/SkSVGDOM.h"

void RenderWholeSvg(SkCanvas* canvas, SkSVGDOM* dom) {
    if (!canvas || !dom) {
        return;
    }

    dom->render(canvas);
}
```

This renders the root `<svg>` node and its descendants using the DOM's current:

- root size rules
- container size
- font manager
- resource provider
- text shaping factory

## 9. Root sizing, viewport, `viewBox`, and container size

This is one of the most important parts of SVG rendering in Skia.

### `setContainerSize(...)`

The local `SkSVGDOM.h` comment says:

- container size is used to resolve the initial viewport when root width and height are specified in relative units
- if root dimensions are absolute, container size has no effect

So:

- absolute `width` and `height` on the root make the initial viewport fixed
- percentage-based root sizes need a container size from the embedding app

### Common container-size usage

```cpp
#include "modules/svg/include/SkSVGDOM.h"

void RenderSvgIntoBox(SkCanvas* canvas, SkSVGDOM* dom, float width, float height) {
    if (!canvas || !dom) {
        return;
    }

    dom->setContainerSize(SkSize::Make(width, height));
    dom->render(canvas);
}
```

### Query intrinsic size

The local header says `containerSize()` is deprecated for querying intrinsic size.

Instead, use:

- `dom->getRoot()->intrinsicSize(...)`

```cpp
#include "modules/svg/include/SkSVGDOM.h"
#include "modules/svg/include/SkSVGRenderContext.h"

SkSize QueryIntrinsicSvgSize(SkSVGDOM* dom) {
    if (!dom || !dom->getRoot()) {
        return SkSize::Make(0, 0);
    }

    return dom->getRoot()->intrinsicSize(SkSVGLengthContext(SkSize::Make(0, 0)));
}
```

### Important percentage rule

The local `SkSVGSVG.cpp` source says:

- percentage `width` or `height` does not provide intrinsic size

So if the root SVG uses percentages:

- the intrinsic size may contain zeros
- you should provide a container size before rendering

### `viewBox` behavior

The local source also shows:

- an empty `viewBox` disables rendering
- a `viewBox` overrides the intrinsic viewport

That means `viewBox` is not cosmetic.

It actively changes:

- coordinate mapping
- scaling
- alignment
- visible output

## 10. `preserveAspectRatio`

The root `<svg>` and embedded image handling use `preserveAspectRatio`.

That affects how SVG content is mapped into the destination viewport.

In practice:

- it controls aspect preservation vs stretching
- it controls alignment inside the viewport

You usually do not set this from C++ unless you are editing the DOM.

Most of the time you let the SVG file define it.

## 11. Rendering a specific node by id

The DOM supports targeted rendering through:

- `renderNode(SkCanvas*, SkSVGPresentationContext&, const char* id)`

This renders the node as if it were the only child of the root.

```cpp
#include "include/core/SkCanvas.h"
#include "modules/svg/include/SkSVGDOM.h"
#include "modules/svg/include/SkSVGRenderContext.h"

void RenderSvgNodeById(SkCanvas* canvas, SkSVGDOM* dom, const char* id) {
    if (!canvas || !dom || !id) {
        return;
    }

    SkSVGPresentationContext pctx;
    dom->renderNode(canvas, pctx, id);
}
```

This is useful when:

- the SVG is a sprite sheet of icons
- you want to render only one named element
- you want targeted drawing without cloning the whole DOM

### Example: render one icon from a shared SVG file

```cpp
void DrawWarningIcon(SkCanvas* canvas, SkSVGDOM* dom) {
    if (!canvas || !dom) {
        return;
    }

    canvas->save();
    canvas->translate(16.0f, 16.0f);

    SkSVGPresentationContext pctx;
    dom->renderNode(canvas, pctx, "icon-warning");

    canvas->restore();
}
```

## 12. Finding nodes by id

The DOM exposes:

- `findNodeById(const char* id)`

The return type is:

- `sk_sp<SkSVGNode>*`

That means it gives you access to the stored node reference itself.

### Basic lookup

```cpp
#include "modules/svg/include/SkSVGDOM.h"
#include "modules/svg/include/SkSVGNode.h"

SkSVGNode* FindSvgNode(SkSVGDOM* dom, const char* id) {
    if (!dom || !id) {
        return nullptr;
    }

    sk_sp<SkSVGNode>* slot = dom->findNodeById(id);
    return slot ? slot->get() : nullptr;
}
```

### Mutate a node after lookup

You can change attributes on a node after finding it.

```cpp
#include "modules/svg/include/SkSVGDOM.h"
#include "modules/svg/include/SkSVGNode.h"

bool RecolorSvgNode(SkSVGDOM* dom, const char* id, const char* colorValue) {
    if (!dom || !id || !colorValue) {
        return false;
    }

    sk_sp<SkSVGNode>* slot = dom->findNodeById(id);
    if (!slot || !slot->get()) {
        return false;
    }

    return (*slot)->setAttribute("fill", colorValue);
}
```

Example usage:

```cpp
RecolorSvgNode(dom.get(), "badge", "#ff3b30");
```

### Change stroke width on a node

```cpp
bool SetSvgNodeStrokeWidth(SkSVGDOM* dom, const char* id, const char* widthValue) {
    if (!dom || !id || !widthValue) {
        return false;
    }

    sk_sp<SkSVGNode>* slot = dom->findNodeById(id);
    if (!slot || !slot->get()) {
        return false;
    }

    return (*slot)->setAttribute("stroke-width", widthValue);
}
```

### Hide a node

```cpp
bool HideSvgNode(SkSVGDOM* dom, const char* id) {
    if (!dom || !id) {
        return false;
    }

    sk_sp<SkSVGNode>* slot = dom->findNodeById(id);
    if (!slot || !slot->get()) {
        return false;
    }

    return (*slot)->setAttribute("display", "none");
}
```

## 13. Mutating presentation attributes

The local `SkSVGNode.h` surface includes many presentation attributes.

Examples include:

- `fill`
- `fill-rule`
- `fill-opacity`
- `stroke`
- `stroke-width`
- `stroke-opacity`
- `stroke-linecap`
- `stroke-linejoin`
- `stroke-dasharray`
- `stroke-dashoffset`
- `font-family`
- `font-size`
- `font-style`
- `font-weight`
- `text-anchor`
- `color`
- `visibility`
- `clip-path`
- `display`
- `mask`
- `filter`
- `opacity`

### Generic attribute-edit helper

```cpp
#include "modules/svg/include/SkSVGDOM.h"
#include "modules/svg/include/SkSVGNode.h"

bool SetSvgAttribute(SkSVGDOM* dom, const char* id,
                     const char* attributeName,
                     const char* attributeValue) {
    if (!dom || !id || !attributeName || !attributeValue) {
        return false;
    }

    sk_sp<SkSVGNode>* slot = dom->findNodeById(id);
    if (!slot || !slot->get()) {
        return false;
    }

    return (*slot)->setAttribute(attributeName, attributeValue);
}
```

### Real mutations

```cpp
SetSvgAttribute(dom.get(), "title", "font-size", "28");
SetSvgAttribute(dom.get(), "title", "font-weight", "700");
SetSvgAttribute(dom.get(), "title", "fill", "#202020");
SetSvgAttribute(dom.get(), "shape", "stroke", "#0047ff");
SetSvgAttribute(dom.get(), "shape", "stroke-width", "6");
SetSvgAttribute(dom.get(), "shape", "stroke-linejoin", "round");
SetSvgAttribute(dom.get(), "shape", "opacity", "0.85");
```

### Important note about mutation

Mutating node attributes changes the in-memory DOM.

It does not rewrite the original SVG file on disk.

## 14. Working with `<use>` and id references

The local sources show that several SVG features resolve references by id:

- `<use>`
- gradients that inherit from other gradients
- clip paths
- masks
- filters
- text paths

That means ids are structural, not just decorative.

If you change or remove referenced ids:

- linked content may stop working

If you use `renderNode(...)` with an id:

- the DOM resolves that reference through the same id mapping system

## 15. Supported node families visible in the public enum

The local `SkSVGTag` enum includes these major families:

- shapes
  - `circle`
  - `ellipse`
  - `line`
  - `path`
  - `polygon`
  - `polyline`
  - `rect`
- structure
  - `svg`
  - `g`
  - `defs`
  - `use`
- paint servers
  - `linearGradient`
  - `radialGradient`
  - `pattern`
  - `stop`
- clipping and masking
  - `clipPath`
  - `mask`
- raster embedding
  - `image`
- text
  - `text`
  - `textPath`
  - `tspan`
  - `text literal`
- filters
  - `filter`
  - `feBlend`
  - `feColorMatrix`
  - `feComponentTransfer`
  - `feComposite`
  - `feDiffuseLighting`
  - `feDisplacementMap`
  - `feFlood`
  - `feGaussianBlur`
  - `feImage`
  - `feMerge`
  - `feMorphology`
  - `feOffset`
  - `feSpecularLighting`
  - `feTurbulence`
  - light nodes and function nodes

That enum is a useful high-level map of what the local SVG module is built to represent.

## 16. Real render targets: raster surface example

This example loads an SVG, renders it into a raster surface, then snapshots the result.

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkFontMgr.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkStream.h"
#include "include/core/SkSurfaces.h"
#include "modules/skresources/include/SkResources.h"
#include "modules/skshaper/utils/FactoryHelpers.h"
#include "modules/svg/include/SkSVGDOM.h"

sk_sp<SkImage> RenderSvgToImage(const char* svgPath,
                                const char* baseDir,
                                int width,
                                int height) {
    auto surface = SkSurfaces::Raster(
        SkImageInfo::MakeN32Premul(width, height));
    if (!surface) {
        return nullptr;
    }

    auto fontMgr = SkFontMgr::RefDefault();
    auto fileProvider = skresources::FileResourceProvider::Make(
        SkString(baseDir),
        skresources::ImageDecodeStrategy::kLazyDecode);
    auto resourceProvider = skresources::DataURIResourceProviderProxy::Make(
        fileProvider,
        skresources::ImageDecodeStrategy::kLazyDecode,
        fontMgr);

    std::unique_ptr<SkStreamAsset> stream = SkStream::MakeFromFile(svgPath);
    if (!stream) {
        return nullptr;
    }

    SkSVGDOM::Builder builder;
    builder.setFontManager(fontMgr);
    builder.setResourceProvider(resourceProvider);
    builder.setTextShapingFactory(SkShapers::BestAvailable());

    sk_sp<SkSVGDOM> dom = builder.make(*stream);
    if (!dom) {
        return nullptr;
    }

    dom->setContainerSize(SkSize::Make(width, height));

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorTRANSPARENT);
    dom->render(canvas);

    return surface->makeImageSnapshot();
}
```

## 17. Node-specific render target example

This example renders one named node into a separate icon image.

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkSurfaces.h"
#include "modules/svg/include/SkSVGDOM.h"
#include "modules/svg/include/SkSVGRenderContext.h"

sk_sp<SkImage> RenderSvgIconById(SkSVGDOM* dom, const char* id, int size) {
    if (!dom || !id) {
        return nullptr;
    }

    auto surface = SkSurfaces::Raster(
        SkImageInfo::MakeN32Premul(size, size));
    if (!surface) {
        return nullptr;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorTRANSPARENT);

    dom->setContainerSize(SkSize::Make(size, size));

    SkSVGPresentationContext pctx;
    dom->renderNode(canvas, pctx, id);

    return surface->makeImageSnapshot();
}
```

## 18. Advanced resource-provider customization

If file loading is not enough, you can implement your own `ResourceProvider`.

This is useful when resources come from:

- a package file
- a virtual file system
- app resources
- an asset database
- memory blobs

### Custom provider skeleton

```cpp
#include "include/core/SkData.h"
#include "include/core/SkFontMgr.h"
#include "modules/skresources/include/SkResources.h"

class AppSvgResourceProvider final : public skresources::ResourceProvider {
public:
    explicit AppSvgResourceProvider(sk_sp<SkFontMgr> fontMgr)
        : fFontMgr(std::move(fontMgr)) {}

    sk_sp<SkData> load(const char resource_path[],
                       const char resource_name[]) const override {
        return nullptr;
    }

    sk_sp<skresources::ImageAsset> loadImageAsset(const char resource_path[],
                                                  const char resource_name[],
                                                  const char resource_id[]) const override {
        return nullptr;
    }

    sk_sp<SkTypeface> loadTypeface(const char name[],
                                   const char url[]) const override {
        return nullptr;
    }

private:
    sk_sp<SkFontMgr> fFontMgr;
};
```

Then use it in the builder:

```cpp
SkSVGDOM::Builder builder;
builder.setFontManager(SkFontMgr::RefDefault());
builder.setResourceProvider(sk_make_sp<AppSvgResourceProvider>(SkFontMgr::RefDefault()));
builder.setTextShapingFactory(SkShapers::BestAvailable());
```

## 19. What `render(...)` and `renderNode(...)` do not do

These APIs render into a destination canvas.

They do not:

- create a file for you
- create a surface for you
- choose an output image format for you
- save PNG or JPEG for you

The normal pattern is:

1. create a surface
2. render the SVG into its canvas
3. snapshot the surface
4. encode or save using image APIs

## 20. Common mistakes

### 1. Text does not appear

Likely cause:

- no `setFontManager(...)`

Practical fix:

- set a font manager
- also set `SkShapers::BestAvailable()` for better shaping

### 2. External images do not appear

Likely cause:

- no `setResourceProvider(...)`

Practical fix:

- provide `FileResourceProvider`
- optionally wrap it with `CachingResourceProvider`
- optionally wrap that with `DataURIResourceProviderProxy`

### 3. Percentage-sized root SVG renders at the wrong size

Likely cause:

- no `setContainerSize(...)`

Practical fix:

- call `dom->setContainerSize(...)` before rendering

### 4. `renderNode(...)` draws nothing

Likely cause:

- wrong id
- referenced node not found
- node depends on ids or context not set up as expected

Practical fix:

- verify with `findNodeById(...)`
- ensure DOM parsed successfully

### 5. Intrinsic size is zero

Likely cause:

- root width or height uses percentage units

Practical fix:

- treat intrinsic size as unresolved
- provide a real container size from the embedding layout

### 6. Data URI images or fonts do not work

Likely cause:

- plain file provider only

Practical fix:

- wrap with `DataURIResourceProviderProxy::Make(...)`

## 21. Practical rules of thumb

- Use `SkSVGDOM::Builder` for real applications, not just `MakeFromStream(...)`.
- Set a font manager whenever the SVG may contain text.
- Set a text shaping factory whenever text quality matters.
- Set a resource provider whenever the SVG may reference external images or fonts.
- If the root SVG uses percentage sizing, always set container size.
- Use `render(...)` for full-document rendering.
- Use `renderNode(...)` for icon sprites and targeted subtrees.
- Use `findNodeById(...)` plus `setAttribute(...)` for runtime recoloring and small DOM edits.

## 22. Recommended baseline setup

If you want one baseline setup that works for most non-trivial SVGs, use this:

```cpp
#include "include/core/SkFontMgr.h"
#include "include/core/SkStream.h"
#include "modules/skresources/include/SkResources.h"
#include "modules/skshaper/utils/FactoryHelpers.h"
#include "modules/svg/include/SkSVGDOM.h"

sk_sp<SkSVGDOM> LoadSvgRecommended(const char* svgPath,
                                   const char* baseDir,
                                   float width,
                                   float height) {
    std::unique_ptr<SkStreamAsset> stream = SkStream::MakeFromFile(svgPath);
    if (!stream) {
        return nullptr;
    }

    auto fontMgr = SkFontMgr::RefDefault();

    auto fileProvider = skresources::FileResourceProvider::Make(
        SkString(baseDir),
        skresources::ImageDecodeStrategy::kLazyDecode);

    auto cachedProvider = skresources::CachingResourceProvider::Make(fileProvider);

    auto resourceProvider = skresources::DataURIResourceProviderProxy::Make(
        cachedProvider,
        skresources::ImageDecodeStrategy::kLazyDecode,
        fontMgr);

    SkSVGDOM::Builder builder;
    builder.setFontManager(fontMgr);
    builder.setResourceProvider(resourceProvider);
    builder.setTextShapingFactory(SkShapers::BestAvailable());

    sk_sp<SkSVGDOM> dom = builder.make(*stream);
    if (!dom) {
        return nullptr;
    }

    dom->setContainerSize(SkSize::Make(width, height));
    return dom;
}
```

That setup handles the most common real-world SVG needs:

- root sizing
- text
- shaping
- external images
- data URIs
- reusable resource loading
