# Image I/O in Skia: Files, Codecs, and Encoding

This document covers image input and output in the local Skia tree.

It focuses on the real APIs for:

- reading encoded images from files, memory, and streams
- decoding into pixels, `SkBitmap`, `SkPixmap`, and `SkImage`
- writing images back out to files, memory, and streams
- JPEG quality and compression choices
- PNG compression and filter choices
- WebP lossy vs lossless encoding
- common image I/O patterns and mistakes

This guide is grounded in the local sources:

- `include/codec/SkCodec.h`
- `include/codec/SkEncodedImageFormat.h`
- `include/core/SkImage.h`
- `include/core/SkData.h`
- `include/core/SkStream.h`
- `include/encode/SkJpegEncoder.h`
- `include/encode/SkPngEncoder.h`
- `include/encode/SkWebpEncoder.h`

## 1. The main idea

In Skia, image I/O is not one API.

The practical layers are:

- `SkData`
  raw bytes from file, memory, stream, or resource
- `SkStream`, `SkFILEStream`, `SkFILEWStream`, `SkDynamicMemoryWStream`
  stream-based reading and writing
- `SkCodec`
  decode encoded bytes into pixels or images
- `SkImage`, `SkBitmap`, `SkPixmap`
  image/pixel containers after decode
- `SkJpegEncoder`, `SkPngEncoder`, `SkWebpEncoder`
  write pixels or images back out as encoded bytes

Short rule:

- for decode, think `SkCodec`
- for encode, think `Sk*Encoder` plus a stream

## 2. Encoded image formats in local Skia

From local `SkEncodedImageFormat.h`, the enum includes:

- `kBMP`
- `kGIF`
- `kICO`
- `kJPEG`
- `kPNG`
- `kWBMP`
- `kWEBP`
- `kPKM`
- `kKTX`
- `kASTC`
- `kDNG`
- `kHEIF`
- `kAVIF`
- `kJPEGXL`

That does not mean every deployment of your minimal tree is built with every decoder enabled, but this is the format surface reflected in the local enum and codec layer.

## 3. Reading encoded bytes from a file

The simplest file-to-memory path is:

```cpp
#include "include/core/SkData.h"

sk_sp<SkData> LoadFileBytes(const char* path) {
    return SkData::MakeFromFileName(path);
}
```

### Real usage

```cpp
sk_sp<SkData> pngData = SkData::MakeFromFileName("C:\\\\images\\\\photo.png");
if (!pngData) {
    return;
}
```

Use this when:

- the whole encoded file can be loaded into memory
- you want a simple decode path
- you want to create a deferred image from encoded bytes

## 4. Reading from a file stream

If you want a stream instead of loading the entire file up front:

```cpp
#include "include/core/SkStream.h"

std::unique_ptr<SkFILEStream> OpenFileStream(const char* path) {
    return SkFILEStream::Make(path);
}
```

### Real usage

```cpp
std::unique_ptr<SkFILEStream> stream = SkFILEStream::Make("C:\\\\images\\\\photo.jpg");
if (!stream || !stream->isValid()) {
    return;
}
```

Use this when:

- you want `SkCodec::MakeFromStream(...)`
- you prefer stream ownership
- you want stream operations like rewind/seek/fork

## 5. Create a codec from bytes

### From `SkData`

```cpp
#include "include/codec/SkCodec.h"

std::unique_ptr<SkCodec> MakeCodecFromData(sk_sp<SkData> data) {
    if (!data) {
        return nullptr;
    }
    return SkCodec::MakeFromData(data);
}
```

### From `SkStream`

```cpp
std::unique_ptr<SkCodec> MakeCodecFromStream(std::unique_ptr<SkStream> stream) {
    return SkCodec::MakeFromStream(std::move(stream));
}
```

## 6. Inspect the codec before decode

`SkCodec` is useful because it tells you about the encoded image before decoding pixels.

### Read basic info

```cpp
void InspectCodec(SkCodec* codec) {
    if (!codec) {
        return;
    }

    SkImageInfo info = codec->getInfo();
    SkISize dimensions = codec->dimensions();
    SkIRect bounds = codec->bounds();
    SkEncodedImageFormat format = codec->getEncodedFormat();
    SkEncodedOrigin origin = codec->getOrigin();
}
```

### Read result codes

```cpp
void PrintCodecResult(SkCodec::Result result) {
    const char* text = SkCodec::ResultToString(result);
}
```

Useful result codes include:

- `kSuccess`
- `kIncompleteInput`
- `kErrorInInput`
- `kInvalidConversion`
- `kInvalidScale`
- `kInvalidParameters`
- `kInvalidInput`
- `kCouldNotRewind`
- `kInternalError`
- `kUnimplemented`
- `kOutOfMemory`

## 7. Decode to raw pixel memory

This is the most direct decode path.

```cpp
bool DecodeIntoMemory(SkCodec* codec) {
    if (!codec) {
        return false;
    }

    SkImageInfo info = codec->getInfo().makeColorType(kRGBA_8888_SkColorType)
                                       .makeAlphaType(kPremul_SkAlphaType);

    size_t rowBytes = info.minRowBytes();
    std::vector<uint8_t> pixels(info.computeByteSize(rowBytes));

    SkCodec::Result result = codec->getPixels(info, pixels.data(), rowBytes);
    return result == SkCodec::kSuccess;
}
```

Use this when:

- you want your own pixel buffer
- you want full control over storage
- you plan to wrap that memory later

## 8. Decode into `SkPixmap`

```cpp
bool DecodeIntoPixmap(SkCodec* codec) {
    if (!codec) {
        return false;
    }

    SkImageInfo info = codec->getInfo().makeColorType(kRGBA_8888_SkColorType)
                                       .makeAlphaType(kPremul_SkAlphaType);
    size_t rowBytes = info.minRowBytes();
    std::vector<uint8_t> pixels(info.computeByteSize(rowBytes));

    SkPixmap pixmap(info, pixels.data(), rowBytes);
    SkCodec::Result result = codec->getPixels(pixmap);
    return result == SkCodec::kSuccess;
}
```

`SkPixmap` is a non-owning view over your decode buffer.

## 9. Decode into `SkBitmap`

This is a common raster decode path.

```cpp
#include "include/core/SkBitmap.h"

bool DecodeIntoBitmap(SkCodec* codec, SkBitmap* bitmap) {
    if (!codec || !bitmap) {
        return false;
    }

    SkImageInfo info = codec->getInfo().makeColorType(kRGBA_8888_SkColorType)
                                       .makeAlphaType(kPremul_SkAlphaType);

    if (!bitmap->tryAllocPixels(info)) {
        return false;
    }

    SkCodec::Result result = codec->getPixels(
        info,
        bitmap->getPixels(),
        bitmap->rowBytes()
    );
    return result == SkCodec::kSuccess;
}
```

## 10. Decode directly to `SkImage`

`SkCodec` can return an image.

```cpp
std::tuple<sk_sp<SkImage>, SkCodec::Result> DecodeToImage(SkCodec* codec) {
    if (!codec) {
        return {nullptr, SkCodec::kInvalidInput};
    }

    SkImageInfo info = codec->getInfo().makeColorType(kRGBA_8888_SkColorType)
                                       .makeAlphaType(kPremul_SkAlphaType);
    return codec->getImage(info);
}
```

### Default image decode

```cpp
std::tuple<sk_sp<SkImage>, SkCodec::Result> DecodeDefaultImage(SkCodec* codec) {
    if (!codec) {
        return {nullptr, SkCodec::kInvalidInput};
    }
    return codec->getImage();
}
```

## 11. File to decoded image: full path

```cpp
sk_sp<SkImage> LoadDecodedImageFromFile(const char* path) {
    sk_sp<SkData> data = SkData::MakeFromFileName(path);
    if (!data) {
        return nullptr;
    }

    std::unique_ptr<SkCodec> codec = SkCodec::MakeFromData(data);
    if (!codec) {
        return nullptr;
    }

    auto [image, result] = codec->getImage();
    if (result != SkCodec::kSuccess) {
        return nullptr;
    }

    return image;
}
```

## 12. File to deferred encoded image

Sometimes you do not want to decode immediately.

Use `SkImages::DeferredFromEncodedData(...)`:

```cpp
#include "include/core/SkImage.h"

sk_sp<SkImage> LoadDeferredImageFromFile(const char* path) {
    sk_sp<SkData> data = SkData::MakeFromFileName(path);
    if (!data) {
        return nullptr;
    }

    return SkImages::DeferredFromEncodedData(data);
}
```

This keeps the image in encoded form and lets Skia decode lazily when needed.

Use this when:

- you are loading many images but may not draw them immediately
- you want Skia’s deferred decode/cache path

## 13. Create images from already-decoded pixels

### Copy from `SkPixmap`

```cpp
sk_sp<SkImage> MakeImageFromPixmapCopy(const SkPixmap& pixmap) {
    return SkImages::RasterFromPixmapCopy(pixmap);
}
```

### Share pixels from `SkPixmap`

```cpp
sk_sp<SkImage> MakeImageFromSharedPixmap(const SkPixmap& pixmap) {
    return SkImages::RasterFromPixmap(pixmap, nullptr, nullptr);
}
```

### Share `SkData` pixel storage

```cpp
sk_sp<SkImage> MakeImageFromRasterData(
    const SkImageInfo& info,
    sk_sp<SkData> pixelData,
    size_t rowBytes
) {
    return SkImages::RasterFromData(info, std::move(pixelData), rowBytes);
}
```

## 14. Read back pixels from `SkImage`

If you already have an image and want raw pixels:

```cpp
bool ReadImagePixels(const sk_sp<SkImage>& image) {
    if (!image) {
        return false;
    }

    SkImageInfo info = image->imageInfo().makeColorType(kRGBA_8888_SkColorType)
                                         .makeAlphaType(kPremul_SkAlphaType);

    size_t rowBytes = info.minRowBytes();
    std::vector<uint8_t> pixels(info.computeByteSize(rowBytes));

    return image->readPixels(info, pixels.data(), rowBytes, 0, 0);
}
```

### Peek pixels when possible

```cpp
bool PeekImagePixels(const sk_sp<SkImage>& image) {
    if (!image) {
        return false;
    }

    SkPixmap pixmap;
    return image->peekPixels(&pixmap);
}
```

`peekPixels()` only works when the image already has directly accessible raster pixels.

## 15. Read back pixels from a surface or canvas

### From `SkSurface`

```cpp
bool ReadSurfacePixels(sk_sp<SkSurface> surface) {
    if (!surface) {
        return false;
    }

    SkImageInfo info = SkImageInfo::MakeN32Premul(256, 256);
    std::vector<uint8_t> pixels(info.computeMinByteSize());

    return surface->readPixels(info, pixels.data(), info.minRowBytes(), 0, 0);
}
```

### From `SkCanvas`

```cpp
bool ReadCanvasPixels(SkCanvas* canvas) {
    if (!canvas) {
        return false;
    }

    SkImageInfo info = SkImageInfo::MakeN32Premul(256, 256);
    std::vector<uint8_t> pixels(info.computeMinByteSize());

    return canvas->readPixels(info, pixels.data(), info.minRowBytes(), 0, 0);
}
```

## 16. Reading metadata-like information

### Encoded format

```cpp
SkEncodedImageFormat GetFormat(sk_sp<SkData> data) {
    std::unique_ptr<SkCodec> codec = SkCodec::MakeFromData(std::move(data));
    if (!codec) {
        return SkEncodedImageFormat::kPNG; // example fallback, not a real default choice
    }
    return codec->getEncodedFormat();
}
```

### ICC profile and HDR metadata

```cpp
void InspectColorMetadata(SkCodec* codec) {
    if (!codec) {
        return;
    }

    const skcms_ICCProfile* icc = codec->getICCProfile();
    const auto& hdr = codec->getHdrMetadata();
    bool highBitDepth = codec->hasHighBitDepthEncodedData();
}
```

## 17. Animated images

`SkCodec` can also expose frame information for animated formats.

```cpp
void InspectAnimation(SkCodec* codec) {
    if (!codec) {
        return;
    }

    int frameCount = codec->getFrameCount();
}
```

If the format is not animated, frame count behavior depends on the codec, but this is the entry point for animation-aware decode logic.

## 18. Incremental and scanline decode

Local `SkCodec` exposes:

- `startIncrementalDecode(...)`
- `incrementalDecode(...)`
- `startScanlineDecode(...)`

These are advanced decode paths for:

- streaming decode
- partial availability of data
- row-by-row processing

### Incremental decode shape

```cpp
bool StartIncrementalDecode(SkCodec* codec, void* pixels, size_t rowBytes) {
    if (!codec) {
        return false;
    }

    SkImageInfo info = codec->getInfo().makeColorType(kRGBA_8888_SkColorType)
                                       .makeAlphaType(kPremul_SkAlphaType);

    SkCodec::Result result = codec->startIncrementalDecode(info, pixels, rowBytes);
    return result == SkCodec::kSuccess;
}
```

These are real APIs, but for most application-level image I/O, `getPixels(...)` and encoder APIs are the primary paths.

## 19. Writing encoded output: the core pattern

Skia does not give you a single generic `saveImageToFile("x.jpg")` function in the core image type.

The real pattern is:

1. get pixels as `SkPixmap`, `SkBitmap`, or `SkImage`
2. choose an encoder namespace such as `SkJpegEncoder`
3. write to:
   - `SkFILEWStream`
   - `SkDynamicMemoryWStream`
   - `SkData`

## 20. Write to a file with `SkFILEWStream`

```cpp
#include "include/core/SkStream.h"

bool IsWritable(const char* path) {
    SkFILEWStream stream(path);
    return stream.isValid();
}
```

### Real file output

```cpp
bool SavePngToFile(const SkPixmap& pixmap, const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkPngEncoder::Options options;
    return SkPngEncoder::Encode(&out, pixmap, options);
}
```

## 21. Write to memory with `SkDynamicMemoryWStream`

```cpp
sk_sp<SkData> EncodePngToData(const SkPixmap& pixmap) {
    SkDynamicMemoryWStream stream;

    SkPngEncoder::Options options;
    if (!SkPngEncoder::Encode(&stream, pixmap, options)) {
        return nullptr;
    }

    return stream.detachAsData();
}
```

This is the main path when:

- you want encoded bytes in memory
- you will upload or store them elsewhere
- you do not want to write directly to a file

## 22. JPEG encoding basics

`SkJpegEncoder::Options` exposes:

- `fQuality`
- `fDownsample`
- `fAlphaOption`
- optional XMP metadata
- optional encoded origin

### JPEG quality

`fQuality` is an integer in `[0, 100]`.

- `0` = lowest quality
- `100` = highest quality

### JPEG downsample

Options:

- `k420`
- `k422`
- `k444`

Meaning:

- `k420`
  strongest chroma subsampling, smaller files, most common default
- `k422`
  middle ground
- `k444`
  no chroma subsampling, best color detail, larger files

### JPEG alpha handling

JPEG is opaque.

Options:

- `kIgnore`
  ignore alpha and treat source as opaque
- `kBlendOnBlack`
  blend alpha onto black before encoding

## 23. Save JPEG to file

```cpp
bool SaveJpegToFile(const SkPixmap& pixmap, const char* path, int quality) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkJpegEncoder::Options options;
    options.fQuality = quality;
    options.fDownsample = SkJpegEncoder::Downsample::k420;
    options.fAlphaOption = SkJpegEncoder::AlphaOption::kIgnore;

    return SkJpegEncoder::Encode(&out, pixmap, options);
}
```

## 24. High-quality JPEG example

```cpp
bool SaveHighQualityJpeg(const SkPixmap& pixmap, const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkJpegEncoder::Options options;
    options.fQuality = 95;
    options.fDownsample = SkJpegEncoder::Downsample::k444;
    options.fAlphaOption = SkJpegEncoder::AlphaOption::kIgnore;

    return SkJpegEncoder::Encode(&out, pixmap, options);
}
```

Use `k444` when preserving color detail matters more than file size.

## 25. Small-file JPEG example

```cpp
bool SaveSmallJpeg(const SkPixmap& pixmap, const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkJpegEncoder::Options options;
    options.fQuality = 70;
    options.fDownsample = SkJpegEncoder::Downsample::k420;
    options.fAlphaOption = SkJpegEncoder::AlphaOption::kIgnore;

    return SkJpegEncoder::Encode(&out, pixmap, options);
}
```

## 26. JPEG with alpha source

If the source has alpha:

```cpp
bool SaveTransparentSourceAsJpeg(const SkPixmap& pixmap, const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkJpegEncoder::Options options;
    options.fQuality = 90;
    options.fAlphaOption = SkJpegEncoder::AlphaOption::kBlendOnBlack;

    return SkJpegEncoder::Encode(&out, pixmap, options);
}
```

This avoids pretending the alpha channel will be preserved. It will not.

## 27. JPEG to memory

```cpp
sk_sp<SkData> EncodeJpegToData(const SkPixmap& pixmap, int quality) {
    SkJpegEncoder::Options options;
    options.fQuality = quality;
    return SkJpegEncoder::Encode(pixmap, options);
}
```

## 28. PNG encoding basics

`SkPngEncoder::Options` exposes:

- `fFilterFlags`
- `fZLibLevel`
- comments
- HDR metadata
- gainmap/gainmap info

### PNG filter flags

Options include:

- `kNone`
- `kSub`
- `kUp`
- `kAvg`
- `kPaeth`
- `kAll`

You can combine them.

### PNG zlib level

`fZLibLevel` is in `[0, 9]`.

- `0`
  effectively skip zlib compression, very large output
- `9`
  maximal compression effort
- default local value is `6`

Important:

- PNG compression is lossless
- `fZLibLevel` changes compression effort and output size, not visual quality

## 29. Save PNG to file

```cpp
bool SavePngWithCompression(const SkPixmap& pixmap, const char* path, int zlibLevel) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkPngEncoder::Options options;
    options.fZLibLevel = zlibLevel;
    options.fFilterFlags = SkPngEncoder::FilterFlag::kAll;

    return SkPngEncoder::Encode(&out, pixmap, options);
}
```

## 30. Fast PNG example

```cpp
bool SaveFastPng(const SkPixmap& pixmap, const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkPngEncoder::Options options;
    options.fZLibLevel = 1;
    options.fFilterFlags = SkPngEncoder::FilterFlag::kNone;

    return SkPngEncoder::Encode(&out, pixmap, options);
}
```

Use this when speed matters more than final file size.

## 31. Small-size PNG example

```cpp
bool SaveSmallPng(const SkPixmap& pixmap, const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkPngEncoder::Options options;
    options.fZLibLevel = 9;
    options.fFilterFlags = SkPngEncoder::FilterFlag::kAll;

    return SkPngEncoder::Encode(&out, pixmap, options);
}
```

## 32. PNG comments

PNG options support comments through `SkDataTable`.

```cpp
sk_sp<SkDataTable> MakePngComments() {
    const char* values[] = {
        "Author", "Skia Doc Example",
        "Description", "Saved from Skia"
    };
    return SkDataTable::MakeCopyArrays((const void* const*)values, nullptr, 4);
}
```

### Use comments in encode

```cpp
bool SavePngWithComments(const SkPixmap& pixmap, const char* path) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkPngEncoder::Options options;
    options.fComments = MakePngComments();
    return SkPngEncoder::Encode(&out, pixmap, options);
}
```

## 33. WebP encoding basics

`SkWebpEncoder::Options` exposes:

- `fCompression`
- `fQuality`

Compression modes:

- `kLossy`
- `kLossless`

Quality is `float` in `[0.0f, 100.0f]`.

Important:

- for `kLossy`, quality means visual quality
- for `kLossless`, quality means encoding effort, not image quality loss

## 34. Lossy WebP example

```cpp
bool SaveLossyWebp(const SkPixmap& pixmap, const char* path, float quality) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkWebpEncoder::Options options;
    options.fCompression = SkWebpEncoder::Compression::kLossy;
    options.fQuality = quality;

    return SkWebpEncoder::Encode(&out, pixmap, options);
}
```

## 35. Lossless WebP example

```cpp
bool SaveLosslessWebp(const SkPixmap& pixmap, const char* path, float effort) {
    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    SkWebpEncoder::Options options;
    options.fCompression = SkWebpEncoder::Compression::kLossless;
    options.fQuality = effort;

    return SkWebpEncoder::Encode(&out, pixmap, options);
}
```

In lossless mode:

- lower values usually encode faster into larger files
- higher values usually encode slower into smaller files

## 36. Encode from `SkImage`

The encoder namespaces also support `SkImage`.

### JPEG from image

```cpp
sk_sp<SkData> EncodeImageAsJpeg(GrDirectContext* ctx, const SkImage* image) {
    SkJpegEncoder::Options options;
    options.fQuality = 90;
    return SkJpegEncoder::Encode(ctx, image, options);
}
```

### PNG from image

```cpp
sk_sp<SkData> EncodeImageAsPng(GrDirectContext* ctx, const SkImage* image) {
    SkPngEncoder::Options options;
    return SkPngEncoder::Encode(ctx, image, options);
}
```

### WebP from image

```cpp
sk_sp<SkData> EncodeImageAsWebp(GrDirectContext* ctx, const SkImage* image) {
    SkWebpEncoder::Options options;
    options.fCompression = SkWebpEncoder::Compression::kLossy;
    options.fQuality = 85.0f;
    return SkWebpEncoder::Encode(ctx, image, options);
}
```

If the image is texture-backed, you need the matching GPU context so pixels can be read first.

## 37. Encode from a rendered surface snapshot

Very common real pattern:

```cpp
bool SaveSurfaceSnapshotAsPng(sk_sp<SkSurface> surface, const char* path) {
    if (!surface) {
        return false;
    }

    sk_sp<SkImage> image = surface->makeImageSnapshot();
    if (!image) {
        return false;
    }

    sk_sp<SkData> encoded = SkPngEncoder::Encode(nullptr, image.get(), SkPngEncoder::Options{});
    if (!encoded) {
        return false;
    }

    SkFILEWStream out(path);
    return out.isValid() && out.write(encoded->data(), encoded->size());
}
```

## 38. Write arbitrary encoded bytes to a file

Sometimes encoding is already done and you just need to save the bytes.

```cpp
bool WriteDataToFile(sk_sp<SkData> data, const char* path) {
    if (!data) {
        return false;
    }

    SkFILEWStream out(path);
    if (!out.isValid()) {
        return false;
    }

    return out.write(data->data(), data->size());
}
```

## 39. Recover original encoded bytes from an image

If an `SkImage` still retains its encoded representation, local `SkImage.h` exposes:

- `refEncodedData()`

```cpp
sk_sp<const SkData> TryGetOriginalEncodedBytes(const sk_sp<SkImage>& image) {
    if (!image) {
        return nullptr;
    }
    return image->refEncodedData();
}
```

This is useful when:

- the image came from encoded data
- you want the original bytes rather than re-encoding

Do not assume it always succeeds.

## 40. File-to-file transcode example

Decode one format and save another:

```cpp
bool ConvertPngToJpeg(const char* srcPath, const char* dstPath, int quality) {
    sk_sp<SkData> data = SkData::MakeFromFileName(srcPath);
    if (!data) {
        return false;
    }

    std::unique_ptr<SkCodec> codec = SkCodec::MakeFromData(data);
    if (!codec) {
        return false;
    }

    SkBitmap bitmap;
    if (!bitmap.tryAllocPixels(codec->getInfo().makeColorType(kRGBA_8888_SkColorType)
                                              .makeAlphaType(kPremul_SkAlphaType))) {
        return false;
    }

    if (codec->getPixels(bitmap.pixmap()) != SkCodec::kSuccess) {
        return false;
    }

    SkFILEWStream out(dstPath);
    if (!out.isValid()) {
        return false;
    }

    SkJpegEncoder::Options options;
    options.fQuality = quality;
    options.fAlphaOption = SkJpegEncoder::AlphaOption::kBlendOnBlack;

    return SkJpegEncoder::Encode(&out, bitmap.pixmap(), options);
}
```

## 41. Memory-to-memory transcode example

```cpp
sk_sp<SkData> ConvertEncodedToWebp(sk_sp<SkData> encodedInput) {
    if (!encodedInput) {
        return nullptr;
    }

    std::unique_ptr<SkCodec> codec = SkCodec::MakeFromData(encodedInput);
    if (!codec) {
        return nullptr;
    }

    SkBitmap bitmap;
    SkImageInfo info = codec->getInfo().makeColorType(kRGBA_8888_SkColorType)
                                       .makeAlphaType(kPremul_SkAlphaType);
    if (!bitmap.tryAllocPixels(info)) {
        return nullptr;
    }

    if (codec->getPixels(bitmap.pixmap()) != SkCodec::kSuccess) {
        return nullptr;
    }

    SkWebpEncoder::Options options;
    options.fCompression = SkWebpEncoder::Compression::kLossy;
    options.fQuality = 80.0f;

    return SkWebpEncoder::Encode(bitmap.pixmap(), options);
}
```

## 42. What “JPEG quality” really means

In local `SkJpegEncoder::Options`:

- `fQuality` is `[0, 100]`
- it affects lossy compression quality
- higher is usually larger and visually better

Practical guidance:

- `95-100`
  maximum visual quality, larger files
- `85-92`
  common high-quality web/app range
- `70-84`
  visibly more compressed but often acceptable
- `<70`
  aggressive compression

Also remember:

- `fDownsample` changes chroma detail independently of quality
- `k444` can matter a lot for UI, text-in-images, and sharp color boundaries

## 43. PNG “quality” is not like JPEG quality

PNG has no lossy quality knob here.

What you control instead:

- `fZLibLevel`
  compression effort
- `fFilterFlags`
  row filter strategy

Visual output remains lossless.

## 44. WebP quality depends on compression mode

For local `SkWebpEncoder::Options`:

- `kLossy`
  `fQuality` means visual quality
- `kLossless`
  `fQuality` means encoding effort

So `fQuality = 100` means different things in the two modes.

## 45. Common mistakes

### Mistake: expecting `SkImage` to save itself directly to a file path

The real path is encoder plus stream.

### Mistake: assuming JPEG preserves transparency

It does not.

### Mistake: using PNG `fZLibLevel` as if it were visual quality

It is not.

### Mistake: assuming `peekPixels()` always works

It only works when directly accessible raster pixels exist.

### Mistake: always decoding immediately

Sometimes `SkImages::DeferredFromEncodedData(...)` is the better fit.

### Mistake: using high JPEG quality with aggressive chroma subsampling and expecting text/UI edges to stay perfect

`fDownsample` matters too.

### Mistake: forgetting that GPU-backed `SkImage` encode paths may require a `GrDirectContext*`

For texture-backed images, context matters.

## 46. Practical rules of thumb

- Use `SkData::MakeFromFileName(...)` for simple file reads.
- Use `SkCodec::MakeFromData(...)` or `MakeFromStream(...)` for decode.
- Use `codec->getInfo()` and `getEncodedFormat()` before allocating decode buffers.
- Decode to `SkBitmap` or `SkImage` for common app-level use.
- Use `SkImages::DeferredFromEncodedData(...)` when lazy decode is desirable.
- Use `SkFILEWStream` for file output.
- Use `SkDynamicMemoryWStream` or encoder `Encode(...) -> SkData` for memory output.
- For JPEG, choose both `fQuality` and `fDownsample` intentionally.
- For PNG, think “compression effort”, not “quality”.
- For WebP, choose lossy vs lossless first, then choose quality/effort.

## 47. Minimal reference summary

Decode side:

- `SkData::MakeFromFileName(...)`
- `SkFILEStream::Make(...)`
- `SkCodec::MakeFromData(...)`
- `SkCodec::MakeFromStream(...)`
- `codec->getInfo()`
- `codec->getPixels(...)`
- `codec->getImage()`
- `SkImages::DeferredFromEncodedData(...)`

Encode side:

- `SkFILEWStream`
- `SkDynamicMemoryWStream`
- `SkJpegEncoder::Encode(...)`
- `SkPngEncoder::Encode(...)`
- `SkWebpEncoder::Encode(...)`

Most important format knobs:

- JPEG:
  `fQuality`, `fDownsample`, `fAlphaOption`
- PNG:
  `fZLibLevel`, `fFilterFlags`
- WebP:
  `fCompression`, `fQuality`
