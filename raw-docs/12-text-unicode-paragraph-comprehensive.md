# Text in Skia: Unicode, Shaping, and Paragraphs

This is the comprehensive text guide for the local Skia tree.

It covers text as one connected system:

- simple text drawing
- glyphs and metrics
- Unicode and multilingual text
- BiDi and shaping
- fallback fonts
- text blobs
- `SkShaper`
- `SkUnicode`
- `skparagraph`
- text styles such as bold, italic, underline, strike-through, foreground paint, background paint, shadows, spacing, locale, and paragraph layout

This guide is grounded in the local sources:

- `include/core/SkFont.h`
- `include/core/SkFontMetrics.h`
- `include/core/SkTextBlob.h`
- `include/core/SkCanvas.h`
- `modules/skunicode/include/SkUnicode.h`
- `modules/skshaper/include/SkShaper.h`
- `modules/skparagraph/include/TextStyle.h`
- `modules/skparagraph/include/ParagraphStyle.h`
- `modules/skparagraph/include/FontCollection.h`
- `modules/skparagraph/include/ParagraphBuilder.h`
- `modules/skparagraph/include/Paragraph.h`

## 1. The real text stack

Skia text is not one API.

The text stack has layers:

- `SkFont` and `SkTypeface`
  Font selection, metrics, glyph mapping, and basic text measurement
- `SkCanvas` text methods
  Fast direct drawing of simple text, glyphs, or blobs
- `SkTextBlob`
  Immutable container of glyph runs
- `SkUnicode`
  Unicode-level services such as BiDi, word boundaries, grapheme boundaries, line breaks, emoji and ideographic classification
- `SkShaper`
  Script-aware shaping and run segmentation for real text
- `skparagraph`
  Full styled paragraph layout with wrapping, alignment, multiline layout, decorations, placeholders, and multilingual fallback

Short rule:

- use `drawString()` only for simple text
- use `SkShaper` when text shaping matters
- use `skparagraph` when layout and style matter

## 2. The first important distinction: simple text vs real text

These are not the same:

```cpp
canvas->drawString("Hello", 40, 80, font, paint);
```

and:

- Arabic text
- Indic text
- mixed RTL/LTR text
- emoji sequences
- multilingual paragraph layout
- styled spans with different fonts and paints

Simple text APIs can draw UTF-8, but they do not replace shaping and paragraph layout.

If you care about:

- ligatures
- script shaping
- correct BiDi handling
- font fallback across scripts
- line breaking
- styled text runs

you need `SkShaper` or `skparagraph`.

## 3. Core text objects

The practical text objects are:

- `SkTypeface`
  concrete font face
- `SkFont`
  typeface plus size and text rendering options
- `SkPaint`
  text color, shader, blend, filter, and other paint state
- `SkTextBlob`
  immutable glyph-run container
- `SkShaper`
  shapes Unicode text into glyph runs
- `SkUnicode`
  analyzes Unicode text
- `skia::textlayout::TextStyle`
  styled run description for paragraph text
- `skia::textlayout::ParagraphStyle`
  paragraph-wide layout rules
- `skia::textlayout::FontCollection`
  paragraph font lookup and fallback setup
- `skia::textlayout::ParagraphBuilder`
  constructs styled paragraphs
- `skia::textlayout::Paragraph`
  final laid-out paragraph object

## 4. Simple text drawing with `SkCanvas`

Local `SkCanvas.h` exposes:

- `drawSimpleText(...)`
- `drawString(...)`
- `drawGlyphs(...)`
- `drawTextBlob(...)`

### Basic UTF-8 string drawing

```cpp
void DrawSimpleLabel(SkCanvas* canvas, const SkFont& font) {
    SkPaint paint;
    paint.setColor(SK_ColorBLACK);
    paint.setAntiAlias(true);

    canvas->drawString("Hello Skia", 40, 80, font, paint);
}
```

### Direct `drawSimpleText(...)`

```cpp
void DrawUtf8Bytes(SkCanvas* canvas, const SkFont& font) {
    const char* text = u8"Hello";

    SkPaint paint;
    paint.setColor(SK_ColorBLUE);
    paint.setAntiAlias(true);

    canvas->drawSimpleText(
        text,
        strlen(text),
        SkTextEncoding::kUTF8,
        40,
        80,
        font,
        paint
    );
}
```

Use this for straightforward text when you already know shaping is not the issue.

## 5. `SkFont` is the runtime text configuration

`SkFont` controls:

- typeface
- size
- scale and skew
- edging
- hinting
- subpixel
- linear metrics
- embolden
- baseline snapping

### Real text font setup

```cpp
SkFont MakeBodyFont(sk_sp<SkTypeface> typeface) {
    SkFont font(typeface, 20.0f);
    font.setSubpixel(true);
    font.setEdging(SkFont::Edging::kAntiAlias);
    font.setLinearMetrics(true);
    return font;
}
```

### Faux italic and expanded width

```cpp
SkFont MakeAdjustedFont(sk_sp<SkTypeface> typeface) {
    SkFont font(typeface, 22.0f);
    font.setScaleX(1.1f);
    font.setSkewX(-0.2f);
    return font;
}
```

This is not the same as selecting a true italic face through `SkFontStyle`, but it is a real API path in `SkFont`.

## 6. Basic measurement with `SkFont`

### Measure advance and bounds

```cpp
void MeasureTextRun(const SkFont& font) {
    SkRect bounds;
    SkScalar advance = font.measureText(
        u8"Hello world",
        strlen(u8"Hello world"),
        SkTextEncoding::kUTF8,
        &bounds
    );
}
```

### Get font metrics

```cpp
void ReadFontMetrics(const SkFont& font) {
    SkFontMetrics metrics;
    SkScalar spacing = font.getMetrics(&metrics);

    SkScalar ascent = metrics.fAscent;
    SkScalar descent = metrics.fDescent;
    SkScalar leading = metrics.fLeading;
}
```

### Read underline and strikeout metrics

```cpp
void ReadDecorationMetrics(const SkFont& font) {
    SkFontMetrics metrics;
    font.getMetrics(&metrics);

    SkScalar underlineThickness = 0;
    SkScalar underlinePosition = 0;
    SkScalar strikeThickness = 0;
    SkScalar strikePosition = 0;

    bool hasUnderlineThickness = metrics.hasUnderlineThickness(&underlineThickness);
    bool hasUnderlinePosition = metrics.hasUnderlinePosition(&underlinePosition);
    bool hasStrikeThickness = metrics.hasStrikeoutThickness(&strikeThickness);
    bool hasStrikePosition = metrics.hasStrikeoutPosition(&strikePosition);
}
```

These matter when implementing your own text decorations outside `skparagraph`.

## 7. From text to glyphs

Text eventually becomes glyphs.

### UTF-8 to glyph IDs

```cpp
void Utf8ToGlyphs(const SkFont& font, const char* text) {
    size_t count = font.countText(text, strlen(text), SkTextEncoding::kUTF8);
    std::vector<SkGlyphID> glyphs(count);

    font.textToGlyphs(
        text,
        strlen(text),
        SkTextEncoding::kUTF8,
        glyphs
    );
}
```

### Glyph widths

```cpp
void ReadGlyphWidths(const SkFont& font, SkSpan<const SkGlyphID> glyphs) {
    std::vector<SkScalar> widths(glyphs.size());
    font.getWidths(glyphs, widths);
}
```

### Glyph positions from an origin

```cpp
void BuildGlyphPositions(const SkFont& font, SkSpan<const SkGlyphID> glyphs) {
    std::vector<SkPoint> positions(glyphs.size());
    font.getPos(glyphs, positions, SkPoint::Make(40, 100));
}
```

### Draw glyphs directly

```cpp
void DrawGlyphRun(SkCanvas* canvas, const SkFont& font, const char* text) {
    size_t count = font.countText(text, strlen(text), SkTextEncoding::kUTF8);
    std::vector<SkGlyphID> glyphs(count);
    std::vector<SkPoint> positions(count);

    font.textToGlyphs(text, strlen(text), SkTextEncoding::kUTF8, glyphs);
    font.getPos(glyphs, positions, SkPoint::Make(40, 80));

    SkPaint paint;
    paint.setColor(SK_ColorBLACK);
    paint.setAntiAlias(true);

    canvas->drawGlyphs(glyphs, positions, SkPoint::Make(0, 0), font, paint);
}
```

Direct glyph drawing is useful when you already own shaped glyph positions.

## 8. `SkTextBlob`: immutable text/glyph container

`SkTextBlob` is useful when:

- you want reusable glyph runs
- you want shaped text captured as an immutable object
- you want to draw the same run repeatedly

### Make a blob from text

```cpp
sk_sp<SkTextBlob> MakeSimpleBlob(const SkFont& font, const char* text) {
    return SkTextBlob::MakeFromText(
        text,
        strlen(text),
        font,
        SkTextEncoding::kUTF8
    );
}
```

### Draw a blob

```cpp
void DrawBlob(SkCanvas* canvas, const SkFont& font) {
    sk_sp<SkTextBlob> blob = SkTextBlob::MakeFromString("Blob text", font);
    if (!blob) {
        return;
    }

    SkPaint paint;
    paint.setColor(SK_ColorBLUE);
    paint.setAntiAlias(true);

    canvas->drawTextBlob(blob, 40, 80, paint);
}
```

### Build a blob with explicit glyph positions

```cpp
sk_sp<SkTextBlob> MakePositionedBlob(const SkFont& font, const char* text) {
    size_t count = font.countText(text, strlen(text), SkTextEncoding::kUTF8);
    std::vector<SkScalar> xpos(count);

    SkScalar x = 40;
    for (size_t i = 0; i < count; ++i) {
        xpos[i] = x;
        x += 18.0f;
    }

    return SkTextBlob::MakeFromPosTextH(
        text,
        strlen(text),
        xpos.data(),
        80,
        font,
        SkTextEncoding::kUTF8
    );
}
```

## 9. Where simple APIs stop being enough

These cases need shaping or paragraph layout:

- Arabic joining
- Devanagari shaping
- Thai and Southeast Asian shaping
- mixed LTR/RTL runs
- emoji ZWJ sequences
- script-aware cluster handling
- wrapping without breaking grapheme clusters incorrectly
- multiple styles in one paragraph
- paragraph alignment and ellipsis

If your text can be multilingual, assume `drawString()` alone is not enough.

## 10. `SkUnicode`: Unicode services

`SkUnicode` provides:

- BiDi regions
- word boundaries
- grapheme boundaries
- line break boundaries
- sentence boundaries
- emoji and ideographic classification
- UTF-8/UTF-16 conversion helpers

It is not itself a paragraph object. It is the Unicode analysis service used by higher-level text code.

## 11. UTF-8 and UTF-16 conversion

`SkUnicode` exposes helpers for conversion.

### UTF-8 to UTF-16

```cpp
std::u16string ToUtf16(const char* utf8) {
    return SkUnicode::convertUtf8ToUtf16(utf8, (int)strlen(utf8));
}
```

### UTF-16 to UTF-8

```cpp
SkString ToUtf8(const std::u16string& utf16) {
    return SkUnicode::convertUtf16ToUtf8(utf16);
}
```

This matters because:

- `SkShaper` is driven by UTF-8
- parts of paragraph editing APIs report UTF-16 offsets

## 12. Unicode character classification

### Check emoji, whitespace, ideographic code points

```cpp
void CheckUnicodeProperties(SkUnicode* unicode, SkUnichar ch) {
    if (!unicode) {
        return;
    }

    bool emoji = unicode->isEmoji(ch);
    bool ideographic = unicode->isIdeographic(ch);
    bool whitespace = unicode->isWhitespace(ch);
    bool hardBreak = unicode->isHardBreak(ch);
}
```

This is useful when building custom text tools or diagnostics.

## 13. BiDi analysis

For multilingual text, visual order can differ from logical order.

### Read BiDi regions

```cpp
void AnalyzeBidiRuns(SkUnicode* unicode, const char* text) {
    if (!unicode) {
        return;
    }

    std::vector<SkUnicode::BidiRegion> regions;
    unicode->getBidiRegions(
        text,
        (int)strlen(text),
        SkUnicode::TextDirection::kLTR,
        &regions
    );
}
```

This matters for mixed text such as:

- English plus Arabic
- numbers embedded in RTL text
- punctuation around mixed scripts

## 14. Word, grapheme, and line boundaries

### Get word boundaries

```cpp
void GetUtf8Words(SkUnicode* unicode, const char* text) {
    if (!unicode) {
        return;
    }

    std::vector<SkUnicode::Position> wordBreaks;
    unicode->getUtf8Words(
        text,
        (int)strlen(text),
        "en",
        &wordBreaks
    );
}
```

### Compute code-unit flags

```cpp
void ComputeCodeUnitFlags(SkUnicode* unicode, char* text) {
    if (!unicode) {
        return;
    }

    skia_private::TArray<SkUnicode::CodeUnitFlags, true> flags;
    unicode->computeCodeUnitFlags(
        text,
        (int)strlen(text),
        true,
        &flags
    );
}
```

These flags can identify:

- grapheme starts
- soft line breaks
- hard line breaks
- whitespace boundaries
- controls
- tabs
- emoji
- ideographic code points

## 15. `SkShaper`: shaping real text

`SkShaper` shapes Unicode text into glyph runs using:

- font runs
- BiDi runs
- script runs
- language runs

This is the layer that turns multilingual text into correct glyph sequences and positions.

## 16. Make a shaper

### Default shaper with fallback manager

```cpp
std::unique_ptr<SkShaper> MakeDefaultShaper(sk_sp<SkFontMgr> fallbackMgr) {
    return SkShaper::Make(std::move(fallbackMgr));
}
```

### Primitive shaper

```cpp
std::unique_ptr<SkShaper> MakePrimitiveShaper() {
    return SkShaper::MakePrimitive();
}
```

The primitive shaper exists, but for serious multilingual text you want the HarfBuzz-backed shaping path when available.

## 17. Shape into a text blob

`SkTextBlobBuilderRunHandler` is the most practical direct shaping helper.

### End-to-end shaped blob

```cpp
sk_sp<SkTextBlob> ShapeUtf8ToBlob(
    const char* utf8,
    const SkFont& font,
    sk_sp<SkFontMgr> fallbackMgr,
    SkScalar width
) {
    std::unique_ptr<SkShaper> shaper = SkShaper::Make(std::move(fallbackMgr));
    if (!shaper) {
        return nullptr;
    }

    SkTextBlobBuilderRunHandler handler(utf8, SkPoint::Make(0, 0));
    shaper->shape(
        utf8,
        strlen(utf8),
        font,
        true,
        width,
        &handler
    );
    return handler.makeBlob();
}
```

### Draw the shaped blob

```cpp
void DrawShapedText(
    SkCanvas* canvas,
    const char* utf8,
    const SkFont& font,
    sk_sp<SkFontMgr> fallbackMgr
) {
    sk_sp<SkTextBlob> blob = ShapeUtf8ToBlob(utf8, font, std::move(fallbackMgr), 1000.0f);
    if (!blob) {
        return;
    }

    SkPaint paint;
    paint.setColor(SK_ColorBLACK);
    paint.setAntiAlias(true);

    canvas->drawTextBlob(blob, 40, 100, paint);
}
```

This is the right direction for multilingual shaped single-line text.

## 18. Advanced shaping with explicit run iterators

`SkShaper` can consume:

- `FontRunIterator`
- `BiDiRunIterator`
- `ScriptRunIterator`
- `LanguageRunIterator`

That lets you explicitly control segmentation.

### Explicit shaping pipeline

```cpp
void ShapeWithExplicitIterators(
    const char* utf8,
    const SkFont& font,
    sk_sp<SkFontMgr> fallbackMgr,
    SkShaper::RunHandler* handler
) {
    std::unique_ptr<SkShaper> shaper = SkShaper::Make(fallbackMgr);
    if (!shaper) {
        return;
    }

    auto fontRuns = SkShaper::MakeFontMgrRunIterator(
        utf8,
        strlen(utf8),
        font,
        fallbackMgr
    );
    auto bidiRuns = SkShaper::MakeBiDiRunIterator(utf8, strlen(utf8), 0);
    auto scriptRuns = SkShaper::MakeScriptRunIterator(utf8, strlen(utf8), 0);
    auto languageRuns = SkShaper::MakeStdLanguageRunIterator(utf8, strlen(utf8));

    shaper->shape(
        utf8,
        strlen(utf8),
        *fontRuns,
        *bidiRuns,
        *scriptRuns,
        *languageRuns,
        nullptr,
        0,
        1000.0f,
        handler
    );
}
```

This is lower-level and more specialized than `skparagraph`.

## 19. Multilingual shaping example

```cpp
void DrawMixedScriptLine(
    SkCanvas* canvas,
    const SkFont& baseFont,
    sk_sp<SkFontMgr> fallbackMgr
) {
    const char* text = u8"English العربية हिंदी 日本語";

    std::unique_ptr<SkShaper> shaper = SkShaper::Make(fallbackMgr);
    if (!shaper) {
        return;
    }

    SkTextBlobBuilderRunHandler handler(text, SkPoint::Make(0, 0));
    shaper->shape(text, strlen(text), baseFont, true, 1200.0f, &handler);

    sk_sp<SkTextBlob> blob = handler.makeBlob();
    if (!blob) {
        return;
    }

    SkPaint paint;
    paint.setColor(SK_ColorBLACK);
    paint.setAntiAlias(true);

    canvas->drawTextBlob(blob, 40, 100, paint);
}
```

This is already much closer to real-world text than `drawString()` alone.

## 20. When to choose `SkShaper` vs `skparagraph`

Use `SkShaper` when:

- you need shaped glyph runs
- you want direct blob/glyph control
- your layout is custom
- you are building your own editor/rendering logic

Use `skparagraph` when:

- you want styled runs
- you want wrapping and alignment
- you want max lines and ellipsis
- you want decorations and background paints
- you want placeholders
- you want paragraph hit testing and metrics

## 21. `skparagraph`: full paragraph layout

`skparagraph` is the main high-level text system in the local tree.

It is built around:

- `FontCollection`
- `TextStyle`
- `ParagraphStyle`
- `ParagraphBuilder`
- `Paragraph`

## 22. `FontCollection`: paragraph font world

`FontCollection` manages the font managers used by paragraph layout.

It supports:

- asset font manager
- dynamic font manager
- test font manager
- default font manager
- fallback
- default emoji fallback

### Minimal font collection

```cpp
using namespace skia::textlayout;

sk_sp<FontCollection> MakeParagraphFonts(sk_sp<SkFontMgr> defaultMgr) {
    auto fonts = sk_make_sp<FontCollection>();
    fonts->setDefaultFontManager(std::move(defaultMgr));
    fonts->enableFontFallback();
    return fonts;
}
```

### Use a default family list

```cpp
sk_sp<FontCollection> MakeParagraphFontsWithFamilies(sk_sp<SkFontMgr> defaultMgr) {
    auto fonts = sk_make_sp<FontCollection>();
    fonts->setDefaultFontManager(
        std::move(defaultMgr),
        std::vector<SkString>{SkString("Segoe UI"), SkString("Arial")}
    );
    return fonts;
}
```

### Disable fallback

```cpp
void TurnOffParagraphFallback(sk_sp<FontCollection> fonts) {
    if (fonts) {
        fonts->disableFontFallback();
    }
}
```

## 23. `TextStyle`: run-level styling

Local `TextStyle.h` exposes a lot of styling surface:

- text color
- foreground paint
- background paint
- decorations
- decoration color, style, thickness
- font style
- font families
- typeface override
- font size
- locale
- letter spacing
- word spacing
- height and baseline shift
- shadows
- font features
- font arguments
- edging, subpixel, hinting

This is where most styled text work lives.

## 24. Basic `TextStyle`

```cpp
using namespace skia::textlayout;

TextStyle MakeBasicTextStyle() {
    TextStyle style;
    style.setColor(SK_ColorBLACK);
    style.setFontSize(24.0f);
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontStyle(SkFontStyle::Normal());
    return style;
}
```

## 25. Bold and italic in `TextStyle`

### Bold

```cpp
TextStyle MakeBoldStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setFontStyle(SkFontStyle::Bold());
    style.setColor(SK_ColorBLACK);
    return style;
}
```

### Italic

```cpp
TextStyle MakeItalicStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setFontStyle(SkFontStyle::Italic());
    style.setColor(SK_ColorBLACK);
    return style;
}
```

### Bold italic

```cpp
TextStyle MakeBoldItalicStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setFontStyle(SkFontStyle::BoldItalic());
    style.setColor(SK_ColorBLACK);
    return style;
}
```

These are the real “bold” and “italic” paragraph-level style controls.

## 26. Underline, overline, and strike-through

`TextStyle` decorations support:

- `kUnderline`
- `kOverline`
- `kLineThrough`

### Underline

```cpp
TextStyle MakeUnderlineStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    style.setDecoration(TextDecoration::kUnderline);
    return style;
}
```

### Strike-through

```cpp
TextStyle MakeStrikeStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    style.setDecoration(TextDecoration::kLineThrough);
    return style;
}
```

### Multiple decorations

```cpp
TextStyle MakeUnderlineAndOverlineStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    style.setDecoration(
        static_cast<TextDecoration>(
            TextDecoration::kUnderline | TextDecoration::kOverline
        )
    );
    return style;
}
```

## 27. Decoration style, color, and thickness

Decoration style supports:

- `kSolid`
- `kDouble`
- `kDotted`
- `kDashed`
- `kWavy`

### Styled underline

```cpp
TextStyle MakeFancyUnderlineStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    style.setDecoration(TextDecoration::kUnderline);
    style.setDecorationColor(SK_ColorBLUE);
    style.setDecorationStyle(TextDecorationStyle::kWavy);
    style.setDecorationThicknessMultiplier(1.5f);
    return style;
}
```

### Gaps vs through mode

```cpp
TextStyle MakeUnderlineWithGapsStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    style.setDecoration(TextDecoration::kUnderline);
    style.setDecorationMode(TextDecorationMode::kGaps);
    return style;
}
```

## 28. Foreground paint

You asked specifically for foreground paint.

`TextStyle` supports:

- `setForegroundPaint(...)`
- `setForegroundPaintID(...)`

If foreground paint is set, it becomes the real drawing paint for the text run.

### Foreground gradient paint

```cpp
TextStyle MakeGradientForegroundStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(28.0f);

    SkPaint fg;
    fg.setAntiAlias(true);

    SkPoint pts[2] = { {0, 0}, {180, 0} };
    SkColor colors[2] = { SK_ColorBLUE, SK_ColorMAGENTA };
    fg.setShader(SkGradientShader::MakeLinear(
        pts,
        colors,
        nullptr,
        2,
        SkTileMode::kClamp
    ));

    style.setForegroundPaint(fg);
    return style;
}
```

### Foreground stroke paint

```cpp
TextStyle MakeStrokeForegroundStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(30.0f);

    SkPaint fg;
    fg.setAntiAlias(true);
    fg.setStyle(SkPaint::kStroke_Style);
    fg.setStrokeWidth(2.0f);
    fg.setColor(SK_ColorRED);

    style.setForegroundPaint(fg);
    return style;
}
```

## 29. Background paint

You also asked specifically for background paint.

`TextStyle` supports:

- `setBackgroundPaint(...)`
- `setBackgroundPaintID(...)`

Background paint fills behind the text run.

### Solid background

```cpp
TextStyle MakeBackgroundStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);

    SkPaint bg;
    bg.setColor(SkColorSetARGB(255, 255, 230, 120));
    bg.setAntiAlias(true);

    style.setBackgroundPaint(bg);
    return style;
}
```

### Patterned background via shader

```cpp
TextStyle MakeGradientBackgroundStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);

    SkPaint bg;
    SkPoint pts[2] = { {0, 0}, {0, 60} };
    SkColor colors[2] = {
        SkColorSetARGB(255, 255, 240, 180),
        SkColorSetARGB(255, 255, 210, 120)
    };
    bg.setShader(SkGradientShader::MakeLinear(
        pts,
        colors,
        nullptr,
        2,
        SkTileMode::kClamp
    ));

    style.setBackgroundPaint(bg);
    return style;
}
```

## 30. Color and plain text color

If you only need a color, use:

```cpp
TextStyle MakeColoredStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLUE);
    return style;
}
```

Use `setColor(...)` for simple color.

Use `setForegroundPaint(...)` when the run should be painted with:

- gradients
- shaders
- strokes
- blend modes
- special paint state

## 31. Shadows

`TextStyle` supports shadows via `addShadow(...)`.

### Shadowed text

```cpp
TextStyle MakeShadowedTextStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(28.0f);
    style.setColor(SK_ColorBLACK);

    style.addShadow(TextShadow(
        SkColorSetARGB(160, 0, 0, 0),
        SkPoint::Make(3, 3),
        4.0f
    ));

    return style;
}
```

## 32. Letter spacing, word spacing, baseline shift

### Letter spacing

```cpp
TextStyle MakeLetterSpacedStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    style.setLetterSpacing(2.0f);
    return style;
}
```

### Word spacing

```cpp
TextStyle MakeWordSpacedStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    style.setWordSpacing(8.0f);
    return style;
}
```

### Baseline shift

```cpp
TextStyle MakeShiftedStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    style.setBaselineShift(-6.0f);
    return style;
}
```

## 33. Line height and half-leading

`TextStyle` supports:

- `setHeight(...)`
- `setHeightOverride(...)`
- `setHalfLeading(...)`

### Override text line height

```cpp
TextStyle MakeTallLineStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    style.setHeight(1.4f);
    style.setHeightOverride(true);
    style.setHalfLeading(true);
    return style;
}
```

## 34. Locale

Locale influences text processing choices and fallback behavior.

```cpp
TextStyle MakeJapaneseStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Yu Gothic UI"), SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    style.setLocale(SkString("ja"));
    return style;
}
```

For multilingual text, locale is not just metadata. It can help fallback and segmentation behave more appropriately.

## 35. Typeface override in `TextStyle`

You can directly set a typeface on a text style.

```cpp
TextStyle MakeTypefaceBackedStyle(sk_sp<SkTypeface> typeface) {
    TextStyle style;
    style.setTypeface(std::move(typeface));
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);
    return style;
}
```

Use this when you already resolved the exact typeface you want instead of relying on family lookup.

## 36. Font features and font arguments

`TextStyle` supports:

- `addFontFeature(...)`
- `setFontArguments(...)`

### OpenType feature usage

```cpp
TextStyle MakeFeatureStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI")});
    style.setFontSize(24.0f);
    style.setColor(SK_ColorBLACK);

    style.addFontFeature(SkString("liga"), 1);
    style.addFontFeature(SkString("kern"), 1);
    style.addFontFeature(SkString("tnum"), 1);
    return style;
}
```

### Font arguments usage

```cpp
TextStyle MakeArgumentStyle() {
    TextStyle style;
    style.setFontFamilies({SkString("Segoe UI Variable")});
    style.setFontSize(24.0f);

    SkFontArguments args;
    style.setFontArguments(args);
    return style;
}
```

## 37. Paragraph-wide style with `ParagraphStyle`

`ParagraphStyle` controls:

- default text style
- text direction
- text alignment
- max lines
- ellipsis
- paragraph height behavior
- strut style
- tab replacement
- some layout behavior flags

### Minimal paragraph style

```cpp
using namespace skia::textlayout;

ParagraphStyle MakeBasicParagraphStyle() {
    ParagraphStyle ps;

    TextStyle textStyle;
    textStyle.setFontFamilies({SkString("Segoe UI")});
    textStyle.setFontSize(24.0f);
    textStyle.setColor(SK_ColorBLACK);

    ps.setTextStyle(textStyle);
    ps.setTextDirection(TextDirection::kLTR);
    ps.setTextAlign(TextAlign::kLeft);
    return ps;
}
```

## 38. Paragraph alignment

### Centered paragraph

```cpp
ParagraphStyle MakeCenteredParagraphStyle() {
    ParagraphStyle ps;
    ps.setTextDirection(TextDirection::kLTR);
    ps.setTextAlign(TextAlign::kCenter);
    return ps;
}
```

### RTL paragraph

```cpp
ParagraphStyle MakeRtlParagraphStyle() {
    ParagraphStyle ps;
    ps.setTextDirection(TextDirection::kRTL);
    ps.setTextAlign(TextAlign::kRight);
    return ps;
}
```

## 39. Max lines and ellipsis

```cpp
ParagraphStyle MakeEllipsizedStyle() {
    ParagraphStyle ps;
    ps.setTextDirection(TextDirection::kLTR);
    ps.setTextAlign(TextAlign::kLeft);
    ps.setMaxLines(2);
    ps.setEllipsis(SkString("..."));
    return ps;
}
```

## 40. Strut style

`StrutStyle` controls paragraph line height floors.

### Strut example

```cpp
ParagraphStyle MakeStrutParagraphStyle() {
    ParagraphStyle ps;

    StrutStyle strut;
    strut.setStrutEnabled(true);
    strut.setFontFamilies({SkString("Segoe UI")});
    strut.setFontSize(24.0f);
    strut.setHeight(1.3f);
    strut.setHeightOverride(true);
    strut.setHalfLeading(true);

    ps.setStrutStyle(strut);
    return ps;
}
```

Use strut when you want more stable line heights across mixed fonts and scripts.

## 41. Build a paragraph

### Minimal paragraph build

```cpp
using namespace skia::textlayout;

std::unique_ptr<Paragraph> BuildSimpleParagraph(
    sk_sp<FontCollection> fonts,
    sk_sp<SkUnicode> unicode
) {
    ParagraphStyle ps;

    TextStyle ts;
    ts.setFontFamilies({SkString("Segoe UI")});
    ts.setFontSize(24.0f);
    ts.setColor(SK_ColorBLACK);
    ps.setTextStyle(ts);

    auto builder = ParagraphBuilder::make(ps, fonts, unicode);
    builder->addText(u8"Hello paragraph");
    return builder->Build();
}
```

### Layout and paint

```cpp
void DrawParagraph(
    SkCanvas* canvas,
    std::unique_ptr<skia::textlayout::Paragraph>& paragraph
) {
    if (!paragraph) {
        return;
    }

    paragraph->layout(400.0f);
    paragraph->paint(canvas, 40.0f, 80.0f);
}
```

## 42. Styled spans in one paragraph

### Bold, italic, and colored spans

```cpp
std::unique_ptr<skia::textlayout::Paragraph> BuildStyledParagraph(
    sk_sp<skia::textlayout::FontCollection> fonts,
    sk_sp<SkUnicode> unicode
) {
    using namespace skia::textlayout;

    ParagraphStyle ps;

    TextStyle base;
    base.setFontFamilies({SkString("Segoe UI")});
    base.setFontSize(24.0f);
    base.setColor(SK_ColorBLACK);
    ps.setTextStyle(base);

    auto builder = ParagraphBuilder::make(ps, fonts, unicode);

    builder->pushStyle(base);
    builder->addText(u8"Normal ");
    builder->pop();

    TextStyle bold = base;
    bold.setFontStyle(SkFontStyle::Bold());
    builder->pushStyle(bold);
    builder->addText(u8"Bold ");
    builder->pop();

    TextStyle italic = base;
    italic.setFontStyle(SkFontStyle::Italic());
    builder->pushStyle(italic);
    builder->addText(u8"Italic ");
    builder->pop();

    TextStyle accent = base;
    accent.setColor(SK_ColorBLUE);
    builder->pushStyle(accent);
    builder->addText(u8"Blue");
    builder->pop();

    return builder->Build();
}
```

## 43. Foreground paint and background paint in one paragraph

```cpp
std::unique_ptr<skia::textlayout::Paragraph> BuildPaintStyledParagraph(
    sk_sp<skia::textlayout::FontCollection> fonts,
    sk_sp<SkUnicode> unicode
) {
    using namespace skia::textlayout;

    ParagraphStyle ps;
    TextStyle base;
    base.setFontFamilies({SkString("Segoe UI")});
    base.setFontSize(28.0f);
    base.setColor(SK_ColorBLACK);
    ps.setTextStyle(base);

    auto builder = ParagraphBuilder::make(ps, fonts, unicode);

    builder->pushStyle(base);
    builder->addText(u8"Plain ");
    builder->pop();

    TextStyle fg = base;
    SkPaint fgPaint;
    fgPaint.setColor(SK_ColorRED);
    fgPaint.setStyle(SkPaint::kStroke_Style);
    fgPaint.setStrokeWidth(1.5f);
    fgPaint.setAntiAlias(true);
    fg.setForegroundPaint(fgPaint);
    builder->pushStyle(fg);
    builder->addText(u8"Stroke ");
    builder->pop();

    TextStyle bg = base;
    SkPaint bgPaint;
    bgPaint.setColor(SkColorSetARGB(255, 255, 240, 150));
    bg.setBackgroundPaint(bgPaint);
    builder->pushStyle(bg);
    builder->addText(u8"Background");
    builder->pop();

    return builder->Build();
}
```

## 44. Decoration-rich paragraph

```cpp
std::unique_ptr<skia::textlayout::Paragraph> BuildDecorationParagraph(
    sk_sp<skia::textlayout::FontCollection> fonts,
    sk_sp<SkUnicode> unicode
) {
    using namespace skia::textlayout;

    ParagraphStyle ps;
    TextStyle base;
    base.setFontFamilies({SkString("Segoe UI")});
    base.setFontSize(24.0f);
    base.setColor(SK_ColorBLACK);
    ps.setTextStyle(base);

    auto builder = ParagraphBuilder::make(ps, fonts, unicode);

    TextStyle underline = base;
    underline.setDecoration(TextDecoration::kUnderline);
    underline.setDecorationStyle(TextDecorationStyle::kWavy);
    underline.setDecorationColor(SK_ColorBLUE);

    TextStyle strike = base;
    strike.setDecoration(TextDecoration::kLineThrough);
    strike.setDecorationColor(SK_ColorRED);

    builder->pushStyle(underline);
    builder->addText(u8"Wavy underline ");
    builder->pop();

    builder->pushStyle(strike);
    builder->addText(u8"strike-through");
    builder->pop();

    return builder->Build();
}
```

## 45. Multilingual paragraph

```cpp
std::unique_ptr<skia::textlayout::Paragraph> BuildMultilingualParagraph(
    sk_sp<skia::textlayout::FontCollection> fonts,
    sk_sp<SkUnicode> unicode
) {
    using namespace skia::textlayout;

    ParagraphStyle ps;
    ps.setTextDirection(TextDirection::kLTR);
    ps.setTextAlign(TextAlign::kLeft);

    TextStyle base;
    base.setFontFamilies({SkString("Segoe UI"), SkString("Yu Gothic UI"), SkString("Nirmala UI")});
    base.setFontSize(24.0f);
    base.setColor(SK_ColorBLACK);
    base.setLocale(SkString("en"));
    ps.setTextStyle(base);

    auto builder = ParagraphBuilder::make(ps, fonts, unicode);
    builder->pushStyle(base);
    builder->addText(u8"English العربية हिंदी 日本語 😀");
    builder->pop();

    return builder->Build();
}
```

This is the kind of text that strongly benefits from paragraph layout and fallback.

## 46. Mixed locale spans

```cpp
std::unique_ptr<skia::textlayout::Paragraph> BuildLocalizedRuns(
    sk_sp<skia::textlayout::FontCollection> fonts,
    sk_sp<SkUnicode> unicode
) {
    using namespace skia::textlayout;

    ParagraphStyle ps;
    TextStyle base;
    base.setFontFamilies({SkString("Segoe UI")});
    base.setFontSize(24.0f);
    base.setColor(SK_ColorBLACK);
    ps.setTextStyle(base);

    auto builder = ParagraphBuilder::make(ps, fonts, unicode);

    TextStyle english = base;
    english.setLocale(SkString("en"));

    TextStyle arabic = base;
    arabic.setLocale(SkString("ar"));

    TextStyle japanese = base;
    japanese.setLocale(SkString("ja"));

    builder->pushStyle(english);
    builder->addText(u8"English ");
    builder->pop();

    builder->pushStyle(arabic);
    builder->addText(u8"العربية ");
    builder->pop();

    builder->pushStyle(japanese);
    builder->addText(u8"日本語");
    builder->pop();

    return builder->Build();
}
```

## 47. Paragraph placeholders

`ParagraphBuilder` can insert placeholders.

### Placeholder example

```cpp
std::unique_ptr<skia::textlayout::Paragraph> BuildParagraphWithPlaceholder(
    sk_sp<skia::textlayout::FontCollection> fonts,
    sk_sp<SkUnicode> unicode
) {
    using namespace skia::textlayout;

    ParagraphStyle ps;
    TextStyle base;
    base.setFontFamilies({SkString("Segoe UI")});
    base.setFontSize(24.0f);
    base.setColor(SK_ColorBLACK);
    ps.setTextStyle(base);

    auto builder = ParagraphBuilder::make(ps, fonts, unicode);

    builder->pushStyle(base);
    builder->addText(u8"Before ");
    builder->addPlaceholder(PlaceholderStyle(
        60,
        30,
        PlaceholderAlignment::kMiddle,
        TextBaseline::kAlphabetic,
        20
    ));
    builder->addText(u8" After");
    builder->pop();

    return builder->Build();
}
```

## 48. Paragraph metrics and querying

`Paragraph` exposes:

- width and height
- intrinsic widths
- baselines
- line metrics
- rects for ranges
- hit testing
- word boundaries
- glyph cluster info
- fonts used

### Layout metrics

```cpp
void ReadParagraphMetrics(skia::textlayout::Paragraph* paragraph) {
    if (!paragraph) {
        return;
    }

    paragraph->layout(400.0f);

    SkScalar width = paragraph->getMaxWidth();
    SkScalar height = paragraph->getHeight();
    SkScalar minIntrinsic = paragraph->getMinIntrinsicWidth();
    SkScalar maxIntrinsic = paragraph->getMaxIntrinsicWidth();
    SkScalar longest = paragraph->getLongestLine();
}
```

### Line metrics

```cpp
void ReadLineMetrics(skia::textlayout::Paragraph* paragraph) {
    if (!paragraph) {
        return;
    }

    std::vector<skia::textlayout::LineMetrics> lines;
    paragraph->getLineMetrics(lines);
}
```

### Hit testing

```cpp
void HitTestParagraph(skia::textlayout::Paragraph* paragraph) {
    if (!paragraph) {
        return;
    }

    auto pos = paragraph->getGlyphPositionAtCoordinate(120.0f, 40.0f);
}
```

### Boxes for text range

```cpp
void QueryRangeBoxes(skia::textlayout::Paragraph* paragraph) {
    using namespace skia::textlayout;
    if (!paragraph) {
        return;
    }

    std::vector<TextBox> boxes = paragraph->getRectsForRange(
        0,
        10,
        RectHeightStyle::kTight,
        RectWidthStyle::kTight
    );
}
```

## 49. Fonts actually used by a paragraph

This is very important for multilingual and fallback-heavy text.

```cpp
void InspectParagraphFonts(const skia::textlayout::Paragraph* paragraph) {
    if (!paragraph) {
        return;
    }

    std::vector<skia::textlayout::Paragraph::FontInfo> fonts = paragraph->getFonts();
}
```

This helps answer:

- which fallback fonts were actually used
- which span got shaped by which font

## 50. Unresolved glyphs and code points

If text failed to resolve fully:

```cpp
void CheckUnresolvedText(skia::textlayout::Paragraph* paragraph) {
    if (!paragraph) {
        return;
    }

    int32_t unresolvedGlyphCount = paragraph->unresolvedGlyphs();
    std::unordered_set<SkUnichar> unresolved = paragraph->unresolvedCodepoints();
}
```

This is useful for diagnostics when coverage is incomplete.

## 51. Updating an existing paragraph style range

The paragraph API includes experimental update helpers:

- `updateTextAlign(...)`
- `updateFontSize(...)`
- `updateForegroundPaint(...)`
- `updateBackgroundPaint(...)`

### Update foreground paint

```cpp
void RecolorParagraphRun(skia::textlayout::Paragraph* paragraph) {
    if (!paragraph) {
        return;
    }

    SkPaint paint;
    paint.setColor(SK_ColorRED);
    paragraph->updateForegroundPaint(0, 5, paint);
}
```

## 52. Real end-to-end paragraph example

This is the full high-level path for styled multilingual text.

```cpp
#include "include/core/SkCanvas.h"
#include "include/core/SkFontMgr.h"
#include "include/ports/SkTypeface_win.h"
#include "modules/skparagraph/include/FontCollection.h"
#include "modules/skparagraph/include/ParagraphBuilder.h"
#include "modules/skparagraph/include/ParagraphStyle.h"
#include "modules/skparagraph/include/TextStyle.h"
#include "modules/skunicode/include/SkUnicode.h"
#include "modules/skunicode/include/SkUnicode_icu.h"

void DrawRichTextParagraph(SkCanvas* canvas) {
    using namespace skia::textlayout;

    sk_sp<SkFontMgr> fontMgr = SkFontMgr_New_DirectWrite();
    if (!fontMgr) {
        return;
    }

    auto fonts = sk_make_sp<FontCollection>();
    fonts->setDefaultFontManager(fontMgr, std::vector<SkString>{
        SkString("Segoe UI"),
        SkString("Yu Gothic UI"),
        SkString("Nirmala UI")
    });
    fonts->enableFontFallback();

    sk_sp<SkUnicode> unicode = SkUnicodes::ICU::Make();
    if (!unicode) {
        return;
    }

    ParagraphStyle ps;
    ps.setTextDirection(TextDirection::kLTR);
    ps.setTextAlign(TextAlign::kLeft);
    ps.setMaxLines(3);
    ps.setEllipsis(SkString("..."));

    TextStyle base;
    base.setFontFamilies({SkString("Segoe UI")});
    base.setFontSize(24.0f);
    base.setColor(SK_ColorBLACK);
    ps.setTextStyle(base);

    auto builder = ParagraphBuilder::make(ps, fonts, unicode);

    builder->pushStyle(base);
    builder->addText(u8"English ");
    builder->pop();

    TextStyle bold = base;
    bold.setFontStyle(SkFontStyle::Bold());
    builder->pushStyle(bold);
    builder->addText(u8"Bold ");
    builder->pop();

    TextStyle arabic = base;
    arabic.setLocale(SkString("ar"));
    arabic.setDecoration(TextDecoration::kUnderline);
    arabic.setDecorationStyle(TextDecorationStyle::kWavy);
    arabic.setDecorationColor(SK_ColorBLUE);
    builder->pushStyle(arabic);
    builder->addText(u8"العربية ");
    builder->pop();

    TextStyle bg = base;
    SkPaint bgPaint;
    bgPaint.setColor(SkColorSetARGB(255, 255, 240, 170));
    bg.setBackgroundPaint(bgPaint);
    builder->pushStyle(bg);
    builder->addText(u8"日本語 ");
    builder->pop();

    TextStyle fg = base;
    SkPaint fgPaint;
    fgPaint.setColor(SK_ColorMAGENTA);
    fgPaint.setStyle(SkPaint::kFill_Style);
    fg.setForegroundPaint(fgPaint);
    builder->pushStyle(fg);
    builder->addText(u8"😀 Emoji");
    builder->pop();

    std::unique_ptr<Paragraph> paragraph = builder->Build();
    if (!paragraph) {
        return;
    }

    paragraph->layout(500.0f);
    paragraph->paint(canvas, 40.0f, 80.0f);
}
```

## 53. Common mistakes

### Mistake: using `drawString()` for complex multilingual text

That is not enough for shaping-heavy scripts.

### Mistake: confusing Unicode text with glyph runs

Text is input. Glyph runs are shaped output.

### Mistake: assuming one font family covers everything

Real multilingual text usually needs fallback.

### Mistake: treating UTF-8 byte offsets as the same thing as UTF-16 offsets

They are not the same. Paragraph APIs can use both kinds depending on the method.

### Mistake: drawing decorations manually when using `skparagraph`

If you are already in `TextStyle`, use paragraph decorations.

### Mistake: using `setColor()` when you actually need full paint behavior

If the text needs shader, stroke, or special paint state, use `setForegroundPaint(...)`.

### Mistake: using `SkShaper` when you really need full layout

If you need wrapping, alignment, placeholders, and styled spans, use `skparagraph`.

## 54. Practical rules of thumb

- Use `SkFont` and `drawString()` only for simple text.
- Use `SkTextBlob` when you want reusable glyph-run objects.
- Use `SkUnicode` for Unicode analysis, not direct layout.
- Use `SkShaper` when shaping matters but layout is custom.
- Use `skparagraph` for real rich text and multiline layout.
- Put bold, italic, strike-through, underline, shadows, foreground paint, background paint, spacing, and locale in `TextStyle`.
- Put alignment, max lines, ellipsis, paragraph direction, and strut in `ParagraphStyle`.
- Use `FontCollection` with fallback enabled for multilingual text.
- Inspect `getFonts()` and `unresolvedCodepoints()` when debugging fallback.

## 55. Minimal mental map

- `SkFont`
  draw/measure configuration for a font face
- `SkTextBlob`
  immutable glyph runs
- `SkUnicode`
  Unicode analysis
- `SkShaper`
  shaping
- `TextStyle`
  run-level rich style
- `ParagraphStyle`
  paragraph-wide layout policy
- `FontCollection`
  paragraph font lookup and fallback
- `ParagraphBuilder`
  builds the paragraph
- `Paragraph`
  lays out, paints, and answers queries
