#!/usr/bin/env python3
"""
Take the two logos out of the TRC comments Word file and put them where the welcome window expects them.

    python tools/extract-logos-from-docx.py "TRC comments for GIS database -36 DSDs.docx"

The pictures are ordered from LEFT to RIGHT by where they sit on the page (a picture that floats on the page has a position; pictures
without one keep the order in which they are used). The left one is the ministry logo and the right one the IWWRMP logo, as in the
TRC sample. In the TRC file the IWWRMP picture is used first but sits on the right, so the page position matters.
Written (next to the folder that holds tools/, or into --out):
    assets/logos/ministry-logo.png
    assets/logos/iwwrmp-logo.png
If the two came out the wrong way round, run it again with --swap. Pictures inside a Word file are small: if you have the original
logo files, use them instead (same names, same folder) for a sharper result on large screens.
"""
import argparse
import os
import re
import struct
import sys
import zipfile


def png_size(data):
    if data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR':
        return struct.unpack('>II', data[16:24])
    return None


def ordered_images(z):
    """Pictures of the document from left to right (see the note at the top)."""
    doc = z.read('word/document.xml').decode('utf-8', 'replace')
    rels = z.read('word/_rels/document.xml.rels').decode('utf-8', 'replace')
    target = {}
    for m in re.finditer(r'<Relationship\b[^>]*>', rels):
        tag = m.group(0)
        i, t = re.search(r'\bId="([^"]+)"', tag), re.search(r'\bTarget="([^"]+)"', tag)
        if i and t and '/media/' in ('/' + t.group(1)):
            target[i.group(1)] = 'word/' + t.group(1).lstrip('/').replace('word/', '', 1)
    found, seen = [], set()                      # (horizontal position or None, order of use, path)
    for order, m in enumerate(re.finditer(r'<(wp:anchor|wp:inline)\b.*?</\1>', doc, re.S)):
        block = m.group(0)
        emb = re.search(r'r:embed="([^"]+)"', block)
        path = target.get(emb.group(1)) if emb else None
        if not path or path in seen or path not in z.namelist():
            continue
        seen.add(path)
        pos = re.search(r'<wp:positionH\b[^>]*>.*?<wp:posOffset>(-?\d+)</wp:posOffset>', block, re.S) if m.group(1) == 'wp:anchor' else None
        found.append((int(pos.group(1)) if pos else None, order, path))
    for m in re.finditer(r'r:(?:embed|id)="([^"]+)"', doc):          # pictures outside a drawing block (rare)
        path = target.get(m.group(1))
        if path and path not in seen and path in z.namelist():
            seen.add(path)
            found.append((None, 10 ** 6 + len(found), path))
    found.sort(key=lambda f: (f[0] is None, f[0] if f[0] is not None else 0, f[1]))
    return [f[2] for f in found]


def main(argv=None):
    ap = argparse.ArgumentParser(description='Extract the ministry and IWWRMP logos from the TRC Word file.')
    ap.add_argument('docx', help='the TRC comments .docx file')
    ap.add_argument('--out', default=None, help='folder to write the logos to (default: assets/logos next to tools/)')
    ap.add_argument('--swap', action='store_true', help='use the left picture for IWWRMP and the right one for the ministry')
    a = ap.parse_args(argv)
    out = a.out or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'logos')
    try:
        with zipfile.ZipFile(a.docx) as z:
            images = ordered_images(z)
            if len(images) < 2:
                print('Found %d picture(s) in the document; two logos are needed.' % len(images))
                return 1
            if len(images) > 2:
                print('The document has %d pictures. The first two (from the left) are used.' % len(images))
            first, second = z.read(images[0]), z.read(images[1])
    except (OSError, KeyError, zipfile.BadZipFile) as e:
        print('Could not read %s as a Word file: %s' % (a.docx, e))
        return 2
    if a.swap:
        first, second = second, first
    os.makedirs(out, exist_ok=True)
    for name, data in (('ministry-logo.png', first), ('iwwrmp-logo.png', second)):
        if data[:8] != b'\x89PNG\r\n\x1a\n':
            print('%s: this picture is not a PNG file, so it was NOT written. Save the logo as %s by hand.' % (name, name))
            continue
        with open(os.path.join(out, name), 'wb') as f:
            f.write(data)
        w, h = png_size(data)
        print('%-18s %d x %d pixels%s' % (name, w, h, '  (small: use the original logo file if you have it)' if w < 400 else ''))
    print('Written to %s' % out)
    return 0


if __name__ == '__main__':
    sys.exit(main())
