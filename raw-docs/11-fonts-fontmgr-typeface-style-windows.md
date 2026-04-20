# Fonts on Windows in Skia

This document explains how the Skia font ecosystem works on Windows.

It covers these pieces together because they are tightly connected:

- `SkFont`
- `SkTypeface`
- `SkFontStyle`
- `SkFontMgr`
- `SkFontStyleSet`
- Windows-specific font manager entry points

This guide is Windows-only on purpose.

It is based on the local Skia sources:

- `include/core/SkFont.h`
- `include/core/SkTypeface.h`
- `include/core/SkFontStyle.h`
- `include/core/SkFontMgr.h`
- `include/ports/SkTypeface_win.h`
- `src/ports/SkFontMgr_win_dw.cpp`
- `src/ports/SkTypeface_win_dw.h`
- `src/utils/win/SkDWrite.h`

## 1. The main idea

In Skia, text is not just "use `SkFont()` and draw".

The real font stack looks like this:

- `SkFontMgr`
  Finds fonts, enumerates families, matches style requests, loads fonts from files/data, and performs fallback.
- `SkTypeface`
  Represents a specific font face.
- `SkFontStyle`
  Describes the requested weight, width, and slant.
- `SkFont`
  Wraps a typeface plus drawing and measurement options such as size, edging, hinting, embolden, subpixel, and skew/scale.

Short version:

- `SkFontMgr` answers "which typeface should I use?"
- `SkTypeface` is the chosen font face
- `SkFontStyle` describes the kind of face you want
- `SkFont` describes how to use that face when drawing text

## 2. Why `SkFont()` alone is not the full story

`SkFont` has a default constructor:

```cpp
SkFont font;
```

That is valid, but it does not explain how your application chooses:

- which installed Windows font to use
- which weight or italic variant to use
- how to load a custom file
- how to fall back when a character is missing

For real applications, the common flow is:

1. create or obtain an `SkFontMgr`
2. ask it for an `SkTypeface`
3. build an `SkFont` from that typeface
4. use that `SkFont` for drawing and measuring

## 3. Windows font manager choices

From local `include/ports/SkTypeface_win.h`, Windows exposes:

- `SkFontMgr_New_GDI()`
- `SkFontMgr_New_DirectWrite(...)`

### Recommended Windows path: DirectWrite

For modern Windows code, the main path is:

```cpp
#include "include/core/SkFontMgr.h"
#include "include/ports/SkTypeface_win.h"

sk_sp<SkFontMgr> fontMgr = SkFontMgr_New_DirectWrite();
```

There are overloads that accept:

- `IDWriteFactory*`
- `IDWriteFontCollection*`
- `IDWriteFontFallback*`

So you can either:

- let Skia create/use the default DirectWrite factory path
- pass your own DirectWrite objects if your app already owns that layer

### GDI path

Skia also exposes:

```cpp
sk_sp<SkFontMgr> gdiMgr = SkFontMgr_New_GDI();
```

That exists, but for Windows-only modern applications, DirectWrite is the main path to document and prefer.

## 4. The Windows object relationship

On Windows with DirectWrite, the practical chain is:

```cpp
SkFontMgr_New_DirectWrite()
    -> SkFontMgr
    -> matchFamilyStyle(...) / matchFamilyStyleCharacter(...) / makeFromFile(...)
    -> SkTypeface
    -> SkFont(typeface, size)
    -> draw / measure text
```

That is the real ecosystem. `SkFont` is near the end of the chain, not the start of font discovery.

## 5. `SkFontStyle`: what style means in Skia

`SkFontStyle` describes three things:

- weight
- width
- slant

From local `SkFontStyle.h`:

- weights include values like `kNormal_Weight` and `kBold_Weight`
- widths include values like `kNormal_Width`, `kCondensed_Width`, `kExpanded_Width`
- slants include:
  - `kUpright_Slant`
  - `kItalic_Slant`
  - `kOblique_Slant`

### Construct a style explicitly

```cpp
SkFontStyle style(
    SkFontStyle::kBold_Weight,
    SkFontStyle::kNormal_Width,
    SkFontStyle::kItalic_Slant
);
```

### Use convenience factories

```cpp
SkFontStyle normal = SkFontStyle::Normal();
SkFontStyle bold = SkFontStyle::Bold();
SkFontStyle italic = SkFontStyle::Italic();
SkFontStyle boldItalic = SkFontStyle::BoldItalic();
```

### Inspect a style

```cpp
void InspectStyle(const SkFontStyle& style) {
    int weight = style.weight();
    int width = style.width();
    SkFontStyle::Slant slant = style.slant();
}
```

## 6. `SkTypeface`: the actual font face

An `SkTypeface` is the actual font face object you end up using.

It is not the same thing as `SkFont`.

`SkTypeface` answers questions like:

- what family is this face from
- what intrinsic style does it have
- how many glyphs does it contain
- what tables does it expose
- can it map Unicode characters to glyphs
- can it open its underlying font stream

### Real typeface acquisition from the Windows font manager

```cpp
#include "include/core/SkFontMgr.h"
#include "include/core/SkTypeface.h"
#include "include/ports/SkTypeface_win.h"

sk_sp<SkTypeface> MakeSegoeUI() {
    sk_sp<SkFontMgr> fontMgr = SkFontMgr_New_DirectWrite();
    if (!fontMgr) {
        return nullptr;
    }

    return fontMgr->matchFamilyStyle(
        "Segoe UI",
        SkFontStyle::Normal()
    );
}
```

### Real typeface acquisition with explicit style

```cpp
sk_sp<SkTypeface> MakeConsolasBoldItalic(sk_sp<SkFontMgr> fontMgr) {
    if (!fontMgr) {
        return nullptr;
    }

    SkFontStyle style(
        SkFontStyle::kBold_Weight,
        SkFontStyle::kNormal_Width,
        SkFontStyle::kItalic_Slant
    );

    return fontMgr->matchFamilyStyle("Consolas", style);
}
```

## 7. `SkFontMgr`: discovery, matching, loading, fallback

`SkFontMgr` is the entry point for real font work.

From local `SkFontMgr.h`, its practical responsibilities are:

- enumerate families
- enumerate styles in a family
- match a family plus style
- choose a fallback typeface for a missing character
- load fonts from data, streams, or files

## 8. Create the Windows DirectWrite font manager

### Minimal DirectWrite manager

```cpp
#include "include/core/SkFontMgr.h"
#include "include/ports/SkTypeface_win.h"

sk_sp<SkFontMgr> CreateWindowsFontMgr() {
    return SkFontMgr_New_DirectWrite();
}
```

### DirectWrite manager with your own factory and collection

```cpp
#include <dwrite.h>

sk_sp<SkFontMgr> CreateWindowsFontMgrWithCollection(
    IDWriteFactory* factory,
    IDWriteFontCollection* collection
) {
    return SkFontMgr_New_DirectWrite(factory, collection);
}
```

### DirectWrite manager with explicit fallback object

```cpp
#include <dwrite.h>

sk_sp<SkFontMgr> CreateWindowsFontMgrWithFallback(
    IDWriteFactory* factory,
    IDWriteFontCollection* collection,
    IDWriteFontFallback* fallback
) {
    return SkFontMgr_New_DirectWrite(factory, collection, fallback);
}
```

That is useful when your application already has a DirectWrite integration layer and wants Skia to participate in the same setup.

## 9. Enumerate installed font families

```cpp
void ListSomeWindowsFamilies(sk_sp<SkFontMgr> fontMgr) {
    if (!fontMgr) {
        return;
    }

    int familyCount = fontMgr->countFamilies();
    for (int i = 0; i < familyCount; ++i) {
        SkString familyName;
        fontMgr->getFamilyName(i, &familyName);

        // Use or log familyName.c_str()
    }
}
```

This is useful for:

- diagnostics
- font pickers
- validating that a machine actually has a target family installed

## 10. Enumerate styles inside a family

`SkFontStyleSet` represents the styles available for one family.

```cpp
void ListFamilyStyles(sk_sp<SkFontMgr> fontMgr, const char* family) {
    if (!fontMgr) {
        return;
    }

    sk_sp<SkFontStyleSet> styleSet = fontMgr->matchFamily(family);
    if (!styleSet) {
        return;
    }

    int count = styleSet->count();
    for (int i = 0; i < count; ++i) {
        SkFontStyle style;
        SkString styleName;
        styleSet->getStyle(i, &style, &styleName);

        int weight = style.weight();
        int width = style.width();
        auto slant = style.slant();

        // Use or log styleName.c_str(), weight, width, slant
    }
}
```

This is the right way to inspect what Windows and DirectWrite are actually offering for a family.

## 11. Match a family by style

This is the most common font-manager operation.

```cpp
sk_sp<SkTypeface> MatchFamilyStyle(
    sk_sp<SkFontMgr> fontMgr,
    const char* family,
    const SkFontStyle& style
) {
    if (!fontMgr) {
        return nullptr;
    }

    return fontMgr->matchFamilyStyle(family, style);
}
```

### Real usage

```cpp
sk_sp<SkTypeface> MakeEditorTypeface(sk_sp<SkFontMgr> fontMgr) {
    return fontMgr->matchFamilyStyle(
        "Consolas",
        SkFontStyle(
            SkFontStyle::kNormal_Weight,
            SkFontStyle::kNormal_Width,
            SkFontStyle::kUpright_Slant
        )
    );
}
```

This pattern also appears in your local Skia sources in the plaintext editor sample, where a Windows build uses `SkFontMgr_New_DirectWrite()` and then selects families through `matchFamilyStyle(...)`.

## 12. Match a fallback face for a specific character

This is one of the most important parts of the font ecosystem.

If your chosen family does not contain a character, `matchFamilyStyle(...)` alone is not enough.

Use:

- `matchFamilyStyleCharacter(...)`

This asks the system fallback layer to find a font that can render a particular Unicode character.

### Real fallback example

```cpp
sk_sp<SkTypeface> MatchFallbackForCharacter(
    sk_sp<SkFontMgr> fontMgr,
    const char* preferredFamily,
    SkUnichar character
) {
    if (!fontMgr) {
        return nullptr;
    }

    const char* bcp47[] = { "en" };

    return fontMgr->matchFamilyStyleCharacter(
        preferredFamily,
        SkFontStyle::Normal(),
        bcp47,
        1,
        character
    );
}
```

### Example: ask for a face that can draw an emoji or CJK code point

```cpp
sk_sp<SkTypeface> MatchTypefaceForCodepoint(
    sk_sp<SkFontMgr> fontMgr,
    SkUnichar codepoint
) {
    const char* locales[] = { "en", "ja" };

    return fontMgr->matchFamilyStyleCharacter(
        "Segoe UI",
        SkFontStyle::Normal(),
        locales,
        2,
        codepoint
    );
}
```

This is the correct mental model:

- family/style chooses your preferred design
- fallback chooses a typeface that actually contains the missing glyph

## 13. Load a typeface from a file

Not all fonts come from the installed system collection.

`SkFontMgr` can load custom fonts from files:

```cpp
sk_sp<SkTypeface> LoadTypefaceFromFile(
    sk_sp<SkFontMgr> fontMgr,
    const char* path
) {
    if (!fontMgr) {
        return nullptr;
    }

    return fontMgr->makeFromFile(path);
}
```

### Real Windows example

```cpp
sk_sp<SkTypeface> LoadCustomWindowsFont(sk_sp<SkFontMgr> fontMgr) {
    return fontMgr->makeFromFile("C:\\\\Fonts\\\\MyFont.ttf");
}
```

Use this when:

- shipping a bundled font with your app
- testing a local font file
- not relying on installed Windows fonts

## 14. Load a typeface from memory

You can also load font bytes directly:

```cpp
#include "include/core/SkData.h"

sk_sp<SkTypeface> LoadTypefaceFromData(
    sk_sp<SkFontMgr> fontMgr,
    sk_sp<SkData> fontData
) {
    if (!fontMgr || !fontData) {
        return nullptr;
    }

    return fontMgr->makeFromData(std::move(fontData));
}
```

This is useful when:

- the font is embedded in your application assets
- the bytes come from a resource package
- you do not want to depend on a filesystem path at draw time

## 15. `SkTypeface` inspection

Once you have a typeface, you can inspect it.

### Family name and style

```cpp
void InspectTypefaceBasics(sk_sp<SkTypeface> typeface) {
    if (!typeface) {
        return;
    }

    SkString familyName;
    typeface->getFamilyName(&familyName);

    SkFontStyle style = typeface->fontStyle();
    bool bold = typeface->isBold();
    bool italic = typeface->isItalic();
    bool fixedPitch = typeface->isFixedPitch();
}
```

### PostScript name and resource name

```cpp
void InspectTypefaceNames(sk_sp<SkTypeface> typeface) {
    if (!typeface) {
        return;
    }

    SkString postScriptName;
    bool hasPS = typeface->getPostScriptName(&postScriptName);

    SkString resourceName;
    int resourceCount = typeface->getResourceName(&resourceName);
}
```

On Windows, the resource name is often useful as a user-facing hint about which underlying font resource was chosen.

### Units per em and glyph count

```cpp
void InspectTypefaceMetrics(sk_sp<SkTypeface> typeface) {
    if (!typeface) {
        return;
    }

    int upem = typeface->getUnitsPerEm();
    int glyphCount = typeface->countGlyphs();
}
```

## 16. `SkTypeface` as a glyph source

`SkTypeface` is where character-to-glyph mapping ultimately lives.

### One code point to one glyph

```cpp
SkGlyphID LookupGlyph(sk_sp<SkTypeface> typeface, SkUnichar ch) {
    if (!typeface) {
        return 0;
    }

    return typeface->unicharToGlyph(ch);
}
```

### Multiple code points to glyphs

```cpp
void LookupGlyphs(sk_sp<SkTypeface> typeface) {
    if (!typeface) {
        return;
    }

    SkUnichar chars[] = { 'A', 'B', 0x4E2D };
    SkGlyphID glyphs[3] = {};

    typeface->unicharsToGlyphs(chars, glyphs);
}
```

### Text bytes to glyphs

```cpp
void Utf8ToGlyphs(sk_sp<SkTypeface> typeface) {
    if (!typeface) {
        return;
    }

    const char* text = "Hello";
    SkGlyphID glyphs[16] = {};

    size_t count = typeface->textToGlyphs(
        text,
        strlen(text),
        SkTextEncoding::kUTF8,
        glyphs
    );
}
```

## 17. Open the underlying font data

`SkTypeface` can expose its backing data as a stream.

```cpp
void ReadTypefaceStream(sk_sp<SkTypeface> typeface) {
    if (!typeface) {
        return;
    }

    int ttcIndex = 0;
    std::unique_ptr<SkStreamAsset> stream = typeface->openStream(&ttcIndex);
    if (!stream) {
        return;
    }

    size_t length = stream->getLength();
}
```

If a stream already exists and you only want an opportunistic path, use:

```cpp
void ReadExistingTypefaceStream(sk_sp<SkTypeface> typeface) {
    int ttcIndex = 0;
    std::unique_ptr<SkStreamAsset> stream = typeface->openExistingStream(&ttcIndex);
}
```

## 18. Read font tables

`SkTypeface` also provides OpenType/TrueType table access.

### Count and list tables

```cpp
void InspectFontTables(sk_sp<SkTypeface> typeface) {
    if (!typeface) {
        return;
    }

    int tableCount = typeface->countTables();
    std::vector<SkFontTableTag> tags(tableCount);

    int actual = typeface->readTableTags(tags);
}
```

### Copy one table

```cpp
sk_sp<SkData> CopyNameTable(sk_sp<SkTypeface> typeface) {
    if (!typeface) {
        return nullptr;
    }

    return typeface->copyTableData(SkSetFourByteTag('n', 'a', 'm', 'e'));
}
```

### Read a table by size and bytes

```cpp
std::vector<uint8_t> ReadHeadTable(sk_sp<SkTypeface> typeface) {
    std::vector<uint8_t> bytes;
    if (!typeface) {
        return bytes;
    }

    SkFontTableTag tag = SkSetFourByteTag('h', 'e', 'a', 'd');
    size_t size = typeface->getTableSize(tag);
    if (size == 0) {
        return bytes;
    }

    bytes.resize(size);
    size_t copied = typeface->getTableData(tag, 0, size, bytes.data());
    bytes.resize(copied);
    return bytes;
}
```

These APIs matter when you are doing advanced font diagnostics, metadata reading, or custom shaping-related tooling.

## 19. `SkFont`: the runtime font object

After you choose a typeface, you usually build an `SkFont`.

`SkFont` contains:

- a typeface
- size
- horizontal scale
- horizontal skew
- edging
- hinting
- subpixel and metrics flags
- embolden and baseline snapping flags

`SkFont` is the object you usually pass to text drawing and text measuring APIs.

### Minimal real usage

```cpp
SkFont MakeUIFont(sk_sp<SkTypeface> typeface) {
    return SkFont(std::move(typeface), 18.0f);
}
```

### Construct with scale and skew

```cpp
SkFont MakeAdjustedFont(sk_sp<SkTypeface> typeface) {
    return SkFont(std::move(typeface), 18.0f, 1.0f, 0.0f);
}
```

### Build a font from a matched typeface

```cpp
SkFont BuildEditorFont(sk_sp<SkFontMgr> fontMgr) {
    sk_sp<SkTypeface> face = fontMgr->matchFamilyStyle(
        "Consolas",
        SkFontStyle::Normal()
    );

    SkFont font(face, 18.0f);
    font.setSubpixel(true);
    font.setEdging(SkFont::Edging::kAntiAlias);
    return font;
}
```

## 20. `SkFont` getters and setters you actually use

### Set or replace the typeface

```cpp
void ApplyTypefaceToFont(SkFont* font, sk_sp<SkTypeface> typeface) {
    if (!font) {
        return;
    }

    font->setTypeface(std::move(typeface));
}
```

### Adjust size, scale, and skew

```cpp
void ConfigureFontGeometry(SkFont* font) {
    if (!font) {
        return;
    }

    font->setSize(24.0f);
    font->setScaleX(1.0f);
    font->setSkewX(0.0f);
}
```

### Edging, subpixel, hinting

```cpp
void ConfigureFontRasterization(SkFont* font) {
    if (!font) {
        return;
    }

    font->setSubpixel(true);
    font->setEdging(SkFont::Edging::kSubpixelAntiAlias);
    font->setLinearMetrics(true);
    font->setBaselineSnap(true);
}
```

### Synthetic bold / embedded bitmap request

```cpp
void ConfigureOptionalFontFlags(SkFont* font) {
    if (!font) {
        return;
    }

    font->setEmbolden(false);
    font->setEmbeddedBitmaps(true);
}
```

## 21. Measure text with `SkFont`

This is one of the main reasons `SkFont` exists.

```cpp
SkScalar MeasureUtf8Text(const SkFont& font, const char* text, SkRect* bounds) {
    return font.measureText(
        text,
        strlen(text),
        SkTextEncoding::kUTF8,
        bounds
    );
}
```

### Real measurement example

```cpp
void MeasureLabel(sk_sp<SkFontMgr> fontMgr) {
    sk_sp<SkTypeface> face = fontMgr->matchFamilyStyle("Segoe UI", SkFontStyle::Normal());
    SkFont font(face, 20.0f);

    SkRect bounds;
    SkScalar advance = font.measureText(
        "Settings",
        strlen("Settings"),
        SkTextEncoding::kUTF8,
        &bounds
    );
}
```

## 22. Convert text to glyphs with `SkFont`

`SkFont` forwards glyph mapping through its typeface and current configuration.

```cpp
void ConvertTextToGlyphs(const SkFont& font, const char* text) {
    size_t glyphCount = font.countText(
        text,
        strlen(text),
        SkTextEncoding::kUTF8
    );

    std::vector<SkGlyphID> glyphs(glyphCount);

    font.textToGlyphs(
        text,
        strlen(text),
        SkTextEncoding::kUTF8,
        glyphs
    );
}
```

### Glyph positions from origin

```cpp
void BuildGlyphPositions(const SkFont& font, SkSpan<const SkGlyphID> glyphs) {
    std::vector<SkPoint> pos(glyphs.size());
    font.getPos(glyphs, pos, SkPoint::Make(40, 80));
}
```

### Glyph widths

```cpp
void ReadGlyphWidths(const SkFont& font, SkSpan<const SkGlyphID> glyphs) {
    std::vector<SkScalar> widths(glyphs.size());
    font.getWidths(glyphs, widths);
}
```

## 23. Real draw flow on Windows

This is the practical end-to-end pattern most apps need.

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkFont.h"
#include "include/core/SkFontMgr.h"
#include "include/core/SkPaint.h"
#include "include/ports/SkTypeface_win.h"

void DrawWindowsText(SkCanvas* canvas) {
    sk_sp<SkFontMgr> fontMgr = SkFontMgr_New_DirectWrite();
    if (!fontMgr) {
        return;
    }

    sk_sp<SkTypeface> typeface = fontMgr->matchFamilyStyle(
        "Segoe UI",
        SkFontStyle::Normal()
    );
    if (!typeface) {
        return;
    }

    SkFont font(typeface, 24.0f);
    font.setSubpixel(true);
    font.setEdging(SkFont::Edging::kAntiAlias);

    SkPaint paint;
    paint.setColor(SK_ColorBlack);
    paint.setAntiAlias(true);

    canvas->drawString("Hello Windows", 40, 80, font, paint);
}
```

## 24. Real fallback draw flow

When your primary UI font may not contain all characters, fallback matters.

```cpp
void DrawCharacterWithFallback(SkCanvas* canvas, SkUnichar ch) {
    sk_sp<SkFontMgr> fontMgr = SkFontMgr_New_DirectWrite();
    if (!fontMgr) {
        return;
    }

    sk_sp<SkTypeface> face = fontMgr->matchFamilyStyleCharacter(
        "Segoe UI",
        SkFontStyle::Normal(),
        nullptr,
        0,
        ch
    );
    if (!face) {
        return;
    }

    SkFont font(face, 28.0f);
    SkPaint paint;
    paint.setColor(SK_ColorBlue);
    paint.setAntiAlias(true);

    SkString utf8;
    utf8.appendUnichar(ch);
    canvas->drawString(utf8.c_str(), 40, 80, font, paint);
}
```

## 25. LOGFONT interop on Windows

Local `SkTypeface_win.h` also exposes LOGFONT interop:

- `SkCreateTypefaceFromLOGFONT(...)`
- `SkLOGFONTFromTypeface(...)`

That is important if your application already has a Windows GDI-era font description and wants to move it into Skia.

### Create a Skia typeface from `LOGFONT`

```cpp
#include <windows.h>
#include "include/ports/SkTypeface_win.h"

sk_sp<SkTypeface> MakeTypefaceFromLOGFONT() {
    LOGFONT lf = {};
    lf.lfCharSet = DEFAULT_CHARSET;
    lf.lfWeight = FW_NORMAL;
    wcscpy_s(lf.lfFaceName, L"Segoe UI");

    return SkCreateTypefaceFromLOGFONT(lf);
}
```

### Extract `LOGFONT` from a Skia typeface

```cpp
void ConvertTypefaceToLOGFONT(const SkTypeface* typeface) {
    LOGFONT lf = {};
    SkLOGFONTFromTypeface(typeface, &lf);
}
```

This is Windows-specific bridge functionality, not the cross-platform core path.

## 26. `SkFont` versus `SkTypeface`

This distinction causes a lot of confusion.

`SkTypeface`:

- which font face
- intrinsic family and style
- glyph source
- font file / table access
- fallback result object

`SkFont`:

- how that typeface is used for drawing right now
- size
- rasterization-related options
- measurement behavior
- scale/skew adjustments

Short rule:

- if the question is "which font face?", think `SkTypeface`
- if the question is "how do I draw or measure with it?", think `SkFont`

## 27. `SkFontMgr` versus `SkTypeface`

Another common confusion:

`SkFontMgr` is not a font.

It is the service that finds or loads fonts.

Short rule:

- `SkFontMgr` discovers and loads
- `SkTypeface` is the face you got back

## 28. Common Windows usage patterns

### Pattern 1: system UI font by family name

```cpp
sk_sp<SkFontMgr> fontMgr = SkFontMgr_New_DirectWrite();
sk_sp<SkTypeface> face = fontMgr->matchFamilyStyle("Segoe UI", SkFontStyle::Normal());
SkFont font(face, 18.0f);
```

### Pattern 2: monospace editor font

```cpp
sk_sp<SkTypeface> face = fontMgr->matchFamilyStyle("Consolas", SkFontStyle::Normal());
SkFont font(face, 16.0f);
```

### Pattern 3: load bundled custom font

```cpp
sk_sp<SkTypeface> face = fontMgr->makeFromFile("C:\\\\MyApp\\\\assets\\\\MyFont.ttf");
SkFont font(face, 20.0f);
```

### Pattern 4: fallback for one missing character

```cpp
sk_sp<SkTypeface> face = fontMgr->matchFamilyStyleCharacter(
    "Segoe UI",
    SkFontStyle::Normal(),
    nullptr,
    0,
    0x4E2D
);
```

## 29. Common mistakes

### Mistake: treating `SkFont()` as complete font selection

It is not. Real selection usually starts with `SkFontMgr`.

### Mistake: confusing family name with typeface

"Segoe UI" is a family request. The matched result is an `SkTypeface`.

### Mistake: assuming one family contains every character you need

It often does not. Use fallback for multilingual or symbol-heavy text.

### Mistake: using `SkFont` to inspect font file details

That is `SkTypeface` territory, not `SkFont`.

### Mistake: assuming style requests guarantee an exact installed face

`matchFamilyStyle(...)` returns the closest match, not necessarily a perfect literal one.

### Mistake: loading a custom font file and then still expecting system fallback automatically inside that one face

A single loaded face only contains its own glyph coverage. Fallback is still a separate manager-level concern.

## 30. Practical rules of thumb

- On Windows, start with `SkFontMgr_New_DirectWrite()`.
- Use `matchFamilyStyle(...)` for normal family/style selection.
- Use `matchFamilyStyleCharacter(...)` when glyph coverage matters.
- Use `makeFromFile(...)` or `makeFromData(...)` for app-bundled fonts.
- Treat `SkTypeface` as the durable font face object.
- Treat `SkFont` as the draw/measure wrapper built on top of the typeface.
- Inspect families and styles through `SkFontMgr` and `SkFontStyleSet`, not by guessing installed variants.
- Use `SkTypeface` APIs for deep inspection, stream access, table access, and glyph mapping.

## 31. Minimal end-to-end example

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkFont.h"
#include "include/core/SkFontMgr.h"
#include "include/core/SkPaint.h"
#include "include/ports/SkTypeface_win.h"

void DrawLabelOnWindows(SkCanvas* canvas) {
    sk_sp<SkFontMgr> fontMgr = SkFontMgr_New_DirectWrite();
    if (!fontMgr) {
        return;
    }

    SkFontStyle style(
        SkFontStyle::kNormal_Weight,
        SkFontStyle::kNormal_Width,
        SkFontStyle::kUpright_Slant
    );

    sk_sp<SkTypeface> typeface = fontMgr->matchFamilyStyle("Segoe UI", style);
    if (!typeface) {
        return;
    }

    SkFont font(typeface, 20.0f);
    font.setSubpixel(true);
    font.setEdging(SkFont::Edging::kAntiAlias);

    SkPaint paint;
    paint.setColor(SK_ColorBLACK);
    paint.setAntiAlias(true);

    canvas->drawString("Settings", 40, 80, font, paint);
}
```

## 32. Object summary

If you remember only one map, use this one:

- `SkFontMgr`
  Windows font discovery, loading, matching, and fallback
- `SkFontStyle`
  requested weight, width, slant
- `SkTypeface`
  concrete face returned by the manager
- `SkFont`
  size plus text draw/measure configuration using that face
