# PDF Rendering in Skia

This document covers PDF generation and PDF-backed rendering in the local Skia tree.

It focuses on the public PDF surface that Skia exposes for applications:

- creating a PDF document
- writing to a file or memory stream
- creating pages
- drawing page content with `SkCanvas`
- closing or aborting the document
- PDF metadata
- rasterization and fidelity controls
- image handling inside PDF
- text, vector, and paint behavior in PDF output
- structured PDF features

This guide is grounded in the local sources:

- `include/core/SkDocument.h`
- `include/docs/SkPDFDocument.h`
- `src/pdf/*`

## 1. The main idea

Skia PDF is document generation, not PDF viewing.

You do not render an existing PDF file with these APIs. Instead, you create a PDF-backed document, obtain a page canvas, and draw to it using normal Skia drawing calls.

The high-level flow is:

1. create a stream
2. create a PDF document
3. begin a page
4. draw on the returned `SkCanvas`
5. end the page
6. repeat for more pages
7. close the document

## 2. The two main public pieces

### `SkDocument`

`SkDocument` is the generic document-writing API.

It exposes:

- `beginPage(...)`
- `endPage()`
- `close()`
- `abort()`

### `SkPDF::MakeDocument(...)`

`SkPDF::MakeDocument(...)` is the PDF-specific factory that creates an `SkDocument` backed by PDF output.

## 3. PDF output units

PDF pages are sized in points.

Local `SkPDFDocument.h` states:

- `1 pt == 1/72 inch`

So:

- 72 pt = 1 inch
- 612 x 792 pt = 8.5 x 11 inch letter-sized page

## 4. The minimal PDF lifecycle

### Write a single-page PDF to a file

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkStream.h"
#include "include/docs/SkPDFDocument.h"

bool WriteSimplePdf(const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    sk_sp<SkDocument> doc = SkPDF::MakeDocument(&out);
    if (!doc) {
        return false;
    }

    SkCanvas* canvas = doc->beginPage(612.0f, 792.0f);

    SkPaint paint;
    paint.setColor(SK_ColorBLACK);
    paint.setAntiAlias(true);

    canvas->drawString("Hello PDF", 72.0f, 100.0f, SkFont(nullptr, 24.0f), paint);

    doc->endPage();
    doc->close();
    return true;
}
```

This is the core PDF rendering pattern in Skia.

## 5. Multi-page PDF

```cpp
bool WriteMultiPagePdf(const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    sk_sp<SkDocument> doc = SkPDF::MakeDocument(&out);
    if (!doc) {
        return false;
    }

    {
        SkCanvas* canvas = doc->beginPage(612.0f, 792.0f);
        SkPaint paint;
        paint.setColor(SK_ColorBLUE);
        canvas->drawRect(SkRect::MakeXYWH(72, 72, 200, 120), paint);
        doc->endPage();
    }

    {
        SkCanvas* canvas = doc->beginPage(612.0f, 792.0f);
        SkPaint paint;
        paint.setColor(SK_ColorRED);
        canvas->drawCircle(200, 200, 80, paint);
        doc->endPage();
    }

    doc->close();
    return true;
}
```

## 6. The page canvas is just an `SkCanvas`

The canvas returned by `beginPage(...)` is a real `SkCanvas`, so normal Skia drawing code works:

- paths
- text
- images
- shaders
- clipping
- save/restore
- transforms
- paint state

This means most of your existing drawing code can target PDF with little or no change.

### Typical page drawing

```cpp
void DrawReportPage(SkCanvas* canvas) {
    SkPaint fill;
    fill.setColor(SkColorSetARGB(255, 245, 245, 250));
    canvas->drawRect(SkRect::MakeWH(612, 792), fill);

    SkPaint titlePaint;
    titlePaint.setColor(SK_ColorBLACK);
    titlePaint.setAntiAlias(true);

    SkFont titleFont(nullptr, 28.0f);
    canvas->drawString("Monthly Report", 72, 90, titleFont, titlePaint);

    SkPaint rule;
    rule.setColor(SK_ColorBLACK);
    rule.setStrokeWidth(2);
    rule.setStyle(SkPaint::kStroke_Style);
    canvas->drawLine(72, 105, 540, 105, rule);
}
```

## 7. `beginPage(...)`, `endPage()`, `close()`, `abort()`

### `beginPage(width, height, content)`

Starts a page and returns the canvas.

```cpp
SkCanvas* canvas = doc->beginPage(612.0f, 792.0f);
```

There is also an optional content rectangle:

```cpp
SkRect content = SkRect::MakeLTRB(72, 72, 540, 720);
SkCanvas* canvas = doc->beginPage(612.0f, 792.0f, &content);
```

### `endPage()`

Finishes the current page.

```cpp
doc->endPage();
```

### `close()`

Finishes the document and finalizes stream output.

```cpp
doc->close();
```

### `abort()`

Stops document generation immediately. Output must then be treated as invalid.

```cpp
doc->abort();
```

## 8. Important page-lifecycle rules

### The page canvas does not outlive the page

The page canvas returned by `beginPage(...)` is owned by the document.

It becomes invalid after:

- `endPage()`
- `close()`
- document destruction

Do not store it and use it later.

### `beginPage(...)` will end an active page if needed

Local `SkDocument.h` states that `beginPage(...)` will call `endPage()` if a page is already active.

That means explicit page boundaries are still the best practice, but the API will protect against one common misuse.

## 9. Write PDF to memory instead of a file

Use `SkDynamicMemoryWStream`.

```cpp
#include "include/core/SkStream.h"

sk_sp<SkData> BuildPdfInMemory() {
    SkDynamicMemoryWStream stream;

    sk_sp<SkDocument> doc = SkPDF::MakeDocument(&stream);
    if (!doc) {
        return nullptr;
    }

    SkCanvas* canvas = doc->beginPage(300, 300);
    SkPaint paint;
    paint.setColor(SK_ColorBLACK);
    canvas->drawString("Memory PDF", 40, 80, SkFont(nullptr, 20), paint);
    doc->endPage();
    doc->close();

    return stream.detachAsData();
}
```

This is useful when:

- returning PDF bytes from an API
- storing PDF data elsewhere
- writing to network or custom storage later

## 10. PDF metadata

`SkPDF::Metadata` is the main PDF configuration structure.

It includes:

- title
- author
- subject
- keywords
- creator
- producer
- creation time
- modified time
- language
- raster DPI
- PDF/A mode
- encoding quality
- structure tree root
- outline mode
- executor
- compression level
- subsetter
- JPEG decoder/encoder callbacks
- `allowNoJpegs`

## 11. Basic metadata example

```cpp
sk_sp<SkDocument> MakePdfWithMetadata(SkWStream* stream) {
    SkPDF::Metadata metadata;
    metadata.fTitle = SkString("Project Report");
    metadata.fAuthor = SkString("Skia Doc");
    metadata.fSubject = SkString("PDF Rendering");
    metadata.fKeywords = SkString("skia,pdf,report");
    metadata.fCreator = SkString("My App");

    return SkPDF::MakeDocument(stream, metadata);
}
```

## 12. Producer and identity fields

By default, local `SkPDF::Metadata` sets:

- `fProducer = "Skia/PDF m<milestone>"`

You can replace it if your application wants its own producer identity.

```cpp
metadata.fProducer = SkString("My Product PDF Export");
```

## 13. Creation and modification timestamps

`SkPDF::DateTime` is used for metadata timestamps.

```cpp
SkPDF::DateTime MakeTimestamp() {
    SkPDF::DateTime dt = {};
    dt.fYear = 2026;
    dt.fMonth = 4;
    dt.fDay = 20;
    dt.fHour = 10;
    dt.fMinute = 30;
    dt.fSecond = 0;
    dt.fTimeZoneMinutes = 330;
    return dt;
}
```

### Apply timestamps

```cpp
SkPDF::Metadata metadata;
metadata.fCreation = MakeTimestamp();
metadata.fModified = MakeTimestamp();
```

## 14. Natural language metadata

`fLang` stores the natural language for the document.

```cpp
SkPDF::Metadata metadata;
metadata.fLang = SkString("en-US");
```

This becomes more relevant when using structure trees and semantic tagging.

## 15. Rasterization DPI

This is one of the most important PDF-specific quality controls.

Local `SkPDF::Metadata` exposes:

- `fRasterDPI`

Default:

- `SK_ScalarDefaultRasterDPI`
- which local `SkDocument.h` defines as `72.0f`

### What it means

Some drawing features do not have native PDF representations or cannot be preserved exactly in vector form.

Those features may be rasterized into images for PDF output.

`fRasterDPI` controls the rasterization resolution of those cases.

Higher DPI:

- better fidelity
- larger PDFs
- more memory during rendering
- slower processing

Lower DPI:

- smaller PDFs
- less fidelity

## 16. Raster DPI example

```cpp
sk_sp<SkDocument> MakeHighFidelityPdf(SkWStream* stream) {
    SkPDF::Metadata metadata;
    metadata.fRasterDPI = 300.0f;
    return SkPDF::MakeDocument(stream, metadata);
}
```

### Practical guidance

- `72`
  default baseline
- `144`
  decent for moderate quality exports
- `300`
  strong print-style fidelity
- `600`
  only when you really need it

## 17. Encoding quality for embedded images

Another major control is:

- `fEncodingQuality`

Local `SkPDF::Metadata` documents it like this:

- default `101` means lossless encoding
- values `<= 100` may allow opaque images to be JPEG-encoded with that quality

### Meaning

This is a size vs quality tradeoff for image content embedded into the PDF.

If you leave it at `101`:

- Skia aims for lossless image embedding

If you set it to something like `90`:

- Skia can JPEG-encode suitable opaque image content at that quality
- PDF size may drop significantly

## 18. Encoding quality example

```cpp
sk_sp<SkDocument> MakeCompactPdf(SkWStream* stream) {
    SkPDF::Metadata metadata;
    metadata.fEncodingQuality = 85;
    return SkPDF::MakeDocument(stream, metadata);
}
```

### Practical guidance

- `101`
  lossless/default
- `95`
  high-quality JPEG embedding where applicable
- `85`
  common compact-output tradeoff
- `70`
  aggressive image compression

## 19. PDF/A mode

`fPDFA` controls whether Skia includes extra metadata and output intent information needed for PDF/A-2b-style conformance support.

```cpp
SkPDF::Metadata metadata;
metadata.fPDFA = true;
```

Local comments state this adds:

- XMP metadata
- document UUID
- sRGB output intent information

It also makes output longer and non-reproducible.

## 20. Stream compression level

`SkPDF::Metadata` includes:

- `fCompressionLevel`

Options:

- `Default`
- `None`
- `LowButFast`
- `Average`
- `HighButSlow`

### Example

```cpp
SkPDF::Metadata metadata;
metadata.fCompressionLevel = SkPDF::Metadata::CompressionLevel::HighButSlow;
```

This affects PDF stream compression tradeoffs.

## 21. Threaded PDF work

`fExecutor` lets clients supply an executor for threaded work inside the PDF backend.

```cpp
SkPDF::Metadata metadata;
metadata.fExecutor = myExecutor;
```

Local comments mention this is currently used for parallel Deflate work and can make output non-reproducible in internal object order, while rendering the same.

## 22. JPEG callbacks in PDF generation

Local metadata exposes:

- `jpegDecoder`
- `jpegEncoder`
- `allowNoJpegs`

### Why these exist

Skia PDF can produce much more compact image-heavy PDFs if JPEG encode/decode support is available.

If you provide:

- a JPEG decoder callback
- a JPEG encoder callback

Skia may avoid some expensive or size-heavy fallback paths for embedded images.

### Example setup

```cpp
#include "include/codec/SkJpegDecoder.h"
#include "include/encode/SkJpegEncoder.h"

static std::unique_ptr<SkCodec> DecodeJpegForPdf(sk_sp<const SkData> data) {
    SkCodec::Result result;
    return SkJpegDecoder::Decode(std::move(data), &result);
}

static bool EncodeJpegForPdf(SkWStream* dst, const SkPixmap& src, int quality) {
    SkJpegEncoder::Options options;
    options.fQuality = quality;
    return SkJpegEncoder::Encode(dst, src, options);
}

sk_sp<SkDocument> MakePdfWithJpegSupport(SkWStream* stream) {
    SkPDF::Metadata metadata;
    metadata.jpegDecoder = DecodeJpegForPdf;
    metadata.jpegEncoder = EncodeJpegForPdf;
    return SkPDF::MakeDocument(stream, metadata);
}
```

## 23. `allowNoJpegs`

If clients intentionally do not provide JPEG support, local comments say PDF generation can still work, but image-heavy output may be larger than optimal.

```cpp
SkPDF::Metadata metadata;
metadata.allowNoJpegs = true;
```

Use this when:

- you knowingly do not want JPEG support linked in
- your PDFs are not image-heavy
- you want to avoid internal assertions related to missing JPEG hooks

## 24. What drawing code works in PDF

The page canvas accepts normal Skia drawing code:

- `drawRect`, `drawRRect`, `drawCircle`, `drawPath`
- `drawString`, `drawTextBlob`
- `drawImage`
- clipping
- transforms
- save/restore
- paints, shaders, and gradients

### Example mixed-content page

```cpp
void DrawInvoicePage(SkCanvas* canvas, const sk_sp<SkImage>& logo) {
    SkPaint textPaint;
    textPaint.setColor(SK_ColorBLACK);
    textPaint.setAntiAlias(true);

    SkFont titleFont(nullptr, 26.0f);
    SkFont bodyFont(nullptr, 12.0f);

    canvas->drawString("Invoice", 72, 90, titleFont, textPaint);
    canvas->drawString("Customer: Example Corp", 72, 130, bodyFont, textPaint);

    SkPaint rule;
    rule.setStyle(SkPaint::kStroke_Style);
    rule.setStrokeWidth(1.0f);
    rule.setColor(SK_ColorBLACK);
    canvas->drawLine(72, 145, 540, 145, rule);

    if (logo) {
        canvas->drawImage(logo, 420, 50);
    }
}
```

## 25. Vector behavior vs raster fallback

This is central to PDF rendering.

Skia tries to preserve content in PDF-friendly form when possible:

- text as text where possible
- paths as vector paths
- gradients and patterns through PDF mechanisms when possible

But some effects may be rasterized.

Local comments specifically call out examples like:

- images with perspective
- text with perspective

That is why `fRasterDPI` exists.

## 26. Text in PDF

Text drawn on a PDF page canvas is not just pixels by default. Skia’s PDF backend has substantial text handling support.

That means normal text drawing is appropriate:

```cpp
void DrawPdfText(SkCanvas* canvas) {
    SkPaint paint;
    paint.setColor(SK_ColorBLACK);
    paint.setAntiAlias(true);

    SkFont font(nullptr, 18.0f);
    canvas->drawString("PDF text output", 72, 100, font, paint);
}
```

The exact embedding/subsetting behavior is backend-driven, but from the application side you still draw using normal text APIs.

## 27. Images in PDF

Images can be drawn normally:

```cpp
void DrawPdfImage(SkCanvas* canvas, const sk_sp<SkImage>& image) {
    if (!image) {
        return;
    }
    canvas->drawImage(image, 72, 150);
}
```

Image-heavy PDFs are where:

- `fEncodingQuality`
- JPEG callbacks
- compression level

matter the most.

## 28. Gradients and shaders in PDF

The local PDF backend contains specialized gradient/shader handling in `src/pdf`, so gradients are not treated as a simple unsupported afterthought.

From the app side, use normal shaders:

```cpp
void DrawGradientBanner(SkCanvas* canvas) {
    SkPaint paint;

    SkPoint pts[2] = {{72, 72}, {540, 72}};
    SkColor colors[2] = {SK_ColorBLUE, SK_ColorCYAN};
    paint.setShader(SkGradientShader::MakeLinear(
        pts,
        colors,
        nullptr,
        2,
        SkTileMode::kClamp
    ));

    canvas->drawRect(SkRect::MakeXYWH(72, 72, 468, 40), paint);
}
```

## 29. Transforms and PDF

Normal canvas transforms work during PDF generation:

```cpp
void DrawRotatedStamp(SkCanvas* canvas) {
    SkPaint paint;
    paint.setColor(SK_ColorRED);
    paint.setAntiAlias(true);

    canvas->save();
    canvas->translate(300, 500);
    canvas->rotate(-20);
    canvas->drawString("PAID", -40, 0, SkFont(nullptr, 32), paint);
    canvas->restore();
}
```

Transforms that PDF can represent naturally stay vector/text-friendly more often. More complex cases can push content toward raster fallback.

## 30. The optional content rectangle

`beginPage(...)` optionally accepts a content rectangle.

```cpp
SkRect content = SkRect::MakeLTRB(72, 72, 540, 720);
SkCanvas* canvas = doc->beginPage(612, 792, &content);
```

This is useful when your page has:

- margins
- printable-area assumptions
- layout code that wants explicit content bounds

## 31. Page-size examples

### US Letter

```cpp
SkCanvas* letter = doc->beginPage(612, 792);
```

### A4 approximate in points

```cpp
SkCanvas* a4 = doc->beginPage(595, 842);
```

### Custom poster page

```cpp
SkCanvas* poster = doc->beginPage(1440, 2160);
```

## 32. Structured PDF content

The local PDF API includes structured content support.

Important pieces:

- `StructureElementNode`
- `AttributeList`
- `SetNodeId(...)`
- `fStructureElementTreeRoot`
- `fOutline`

This is for semantic structure, not visual styling.

## 33. Structure tree basics

`StructureElementNode` represents semantic nodes in a PDF structure tree.

Important fields include:

- `fTypeString`
- children
- `fNodeId`
- attributes
- alternate text
- language

### Example node tree

```cpp
auto root = std::make_unique<SkPDF::StructureElementNode>();
root->fTypeString = SkString("Document");
root->fNodeId = 1;

auto heading = std::make_unique<SkPDF::StructureElementNode>();
heading->fTypeString = SkString("H1");
heading->fNodeId = 2;

root->fChildVector.push_back(std::move(heading));
```

## 34. Associate drawn content with structure nodes

Use:

- `SkPDF::SetNodeId(canvas, nodeId)`

```cpp
void DrawTaggedHeading(SkCanvas* canvas) {
    SkPDF::SetNodeId(canvas, 2);

    SkPaint paint;
    paint.setColor(SK_ColorBLACK);
    paint.setAntiAlias(true);

    canvas->drawString("Section Title", 72, 90, SkFont(nullptr, 24), paint);

    SkPDF::SetNodeId(canvas, SkPDF::NodeID::Nothing);
}
```

This associates subsequent drawing commands with a semantic node.

## 35. Attribute lists

`SkPDF::AttributeList` can attach semantic attributes to structure nodes.

```cpp
SkPDF::AttributeList attrs;
attrs.appendInt("Layout", "RowSpan", 2);
attrs.appendFloat("Layout", "BBox", 10.0f);
attrs.appendName("Layout", "Placement", "Block");
attrs.appendTextString("Layout", "Alt", "Example alternative text");
```

These are advanced accessibility/semantic features, not typical first-step PDF rendering needs.

## 36. Outline control

Metadata exposes:

- `fOutline`

Options:

- `None`
- `StructureElementHeaders`
- `StructureElements`

### Example

```cpp
SkPDF::Metadata metadata;
metadata.fOutline = SkPDF::Metadata::Outline::StructureElementHeaders;
```

## 37. Reproducibility considerations

Some metadata/config choices make output non-reproducible:

- `fPDFA = true`
  because of UUID/XMP/output intent details
- threaded executor usage
  because internal object numbering/order may vary

If deterministic binary output matters, keep those tradeoffs in mind.

## 38. Aborting a failed export

If something goes wrong mid-generation and you no longer trust the output:

```cpp
void FailPdfExport(sk_sp<SkDocument> doc) {
    if (doc) {
        doc->abort();
    }
}
```

After `abort()`:

- output stream contents must be ignored
- document is not a valid finished PDF

## 39. Common mistakes

### Mistake: expecting PDF viewing/rendering of existing PDFs

These APIs generate PDFs. They do not render existing PDF files to a canvas.

### Mistake: keeping the page canvas after `endPage()`

It is invalid after the page ends.

### Mistake: forgetting `close()`

The document must be closed to finalize valid output.

### Mistake: using `abort()` and then trying to keep the bytes

Aborted output is not trustworthy.

### Mistake: assuming all canvas effects stay vector-perfect in PDF

Some content may be rasterized, which is exactly why `fRasterDPI` exists.

### Mistake: assuming image-heavy PDFs stay compact without JPEG support

They may become much larger if JPEG encode/decode hooks are missing.

### Mistake: expecting page canvases to support normal pixel readback

Local `SkCanvas.h` notes that canvases returned by `SkDocument::beginPage(...)` are not readable/writable like raster canvases.

## 40. Practical rules of thumb

- Use `SkPDF::MakeDocument(...)` to create PDF output.
- Use `SkFILEWStream` for file output and `SkDynamicMemoryWStream` for memory output.
- Treat the page canvas as short-lived and page-scoped.
- Always call `endPage()` and `close()` explicitly.
- Raise `fRasterDPI` when fidelity matters for complex effects.
- Lower `fEncodingQuality` below `101` when image-heavy PDFs need to be smaller.
- Provide JPEG callbacks if compact PDF output matters.
- Use structure nodes and `SetNodeId(...)` only when semantic PDF output is part of your goal.

## 41. Minimal high-quality PDF example

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkStream.h"
#include "include/docs/SkPDFDocument.h"

bool WriteHighQualityPdf(const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkPDF::Metadata metadata;
    metadata.fTitle = SkString("High Quality Export");
    metadata.fAuthor = SkString("My App");
    metadata.fRasterDPI = 300.0f;
    metadata.fEncodingQuality = 95;
    metadata.fCompressionLevel = SkPDF::Metadata::CompressionLevel::HighButSlow;

    sk_sp<SkDocument> doc = SkPDF::MakeDocument(&out, metadata);
    if (!doc) {
        return false;
    }

    SkCanvas* canvas = doc->beginPage(612, 792);

    SkPaint paint;
    paint.setAntiAlias(true);
    paint.setColor(SK_ColorBLACK);

    canvas->drawString("High Quality PDF Export", 72, 100, SkFont(nullptr, 24), paint);

    SkPaint box;
    box.setColor(SkColorSetARGB(255, 230, 240, 255));
    canvas->drawRect(SkRect::MakeXYWH(72, 130, 300, 120), box);

    doc->endPage();
    doc->close();
    return true;
}
```

## 42. Minimal compact PDF example

```cpp
bool WriteCompactPdf(const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkPDF::Metadata metadata;
    metadata.fRasterDPI = 144.0f;
    metadata.fEncodingQuality = 80;
    metadata.fCompressionLevel = SkPDF::Metadata::CompressionLevel::Average;
    metadata.allowNoJpegs = true;

    sk_sp<SkDocument> doc = SkPDF::MakeDocument(&out, metadata);
    if (!doc) {
        return false;
    }

    SkCanvas* canvas = doc->beginPage(612, 792);

    SkPaint paint;
    paint.setColor(SK_ColorBLACK);
    canvas->drawString("Compact PDF", 72, 100, SkFont(nullptr, 20), paint);

    doc->endPage();
    doc->close();
    return true;
}
```

## 43. Mental map

- `SkDocument`
  generic document lifecycle
- `SkPDF::MakeDocument(...)`
  PDF document factory
- page `SkCanvas`
  normal Skia drawing surface for one page
- `SkPDF::Metadata`
  PDF-specific export configuration
- `fRasterDPI`
  fidelity for rasterized fallback content
- `fEncodingQuality`
  embedded image size/quality tradeoff
- JPEG callbacks
  better image handling and more compact PDFs
- structure tree + node IDs
  semantic PDF tagging support
