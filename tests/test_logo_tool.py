"""Tests of tools/extract-logos-from-docx.py on synthetic Word files."""
import os, sys, io, zipfile, tempfile, struct, zlib, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); TOOL = os.path.join(HERE, '..', 'tools', 'extract-logos-from-docx.py')
R = []
def chk(n, c, d=''): R.append((n, bool(c), str(d)[:220]))
def png(w, h, rgb):
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    def chunk(t, d): c = struct.pack('>I', len(d)) + t + d; return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
def docx(path, images, order, extra_rels=''):
    rels = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(
        f'<Relationship Id="rId{i + 5}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{n}"/>' for i, n in enumerate(images)) + extra_rels + '</Relationships>'
    body = ''.join(f'<w:r><w:drawing><a:blip r:embed="rId{images.index(n) + 5}"/></w:drawing></w:r>' for n in order)
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr('word/document.xml', '<w:document xmlns:w="w" xmlns:a="a" xmlns:r="r"><w:body><w:p>' + body + '</w:p></w:body></w:document>')
        z.writestr('word/_rels/document.xml.rels', rels)
        for n, data in images.items() if isinstance(images, dict) else []: z.writestr('word/media/' + n, data)
def build(path, files, order):
    names = list(files)
    rels = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(
        f'<Relationship Id="rId{i + 5}" Type="x/image" Target="media/{n}"/>' for i, n in enumerate(names)) + '<Relationship Id="rId1" Type="x/styles" Target="styles.xml"/></Relationships>'
    body = ''.join(f'<w:r><w:drawing><a:blip r:embed="rId{names.index(n) + 5}"/></w:drawing></w:r>' for n in order)
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr('word/document.xml', '<w:document xmlns:w="w" xmlns:a="a" xmlns:r="r"><w:body><w:p>' + body + '</w:p></w:body></w:document>')
        z.writestr('word/_rels/document.xml.rels', rels)
        for n, data in files.items(): z.writestr('word/media/' + n, data)
def run(*a): r = subprocess.run([sys.executable, TOOL] + list(a), capture_output=True, text=True); return r.returncode, r.stdout
d = tempfile.mkdtemp()
A, B = png(104, 137, (150, 30, 30)), png(160, 92, (30, 120, 60))
# like the TRC file: media/image1 is the IWWRMP logo but it is used SECOND; image2 (the ministry emblem) is used first
build(d + '/trc.docx', {'image1.png': B, 'image2.png': A}, ['image2.png', 'image1.png'])
out = d + '/logos'; rc, txt = run(d + '/trc.docx', '--out', out)
chk('the first picture used in the document becomes ministry-logo.png and the second iwwrmp-logo.png (order of use, not file name)', rc == 0 and open(out + '/ministry-logo.png', 'rb').read() == A and open(out + '/iwwrmp-logo.png', 'rb').read() == B, txt)
chk('it prints each size and warns that small pictures should be replaced by the originals', '104 x 137' in txt and '160 x 92' in txt and txt.count('small: use the original') == 2, txt)
rc, txt = run(d + '/trc.docx', '--out', d + '/swapped', '--swap'); chk('--swap reverses them', open(d + '/swapped/ministry-logo.png', 'rb').read() == B and open(d + '/swapped/iwwrmp-logo.png', 'rb').read() == A)
build(d + '/one.docx', {'a.png': A}, ['a.png']); rc, txt = run(d + '/one.docx', '--out', d + '/o1'); chk('only one picture: says so, exit 1, writes nothing', rc == 1 and 'two logos are needed' in txt and not os.path.exists(d + '/o1'), txt)
build(d + '/three.docx', {'a.png': A, 'b.png': B, 'c.png': A}, ['a.png', 'b.png', 'c.png']); rc, txt = run(d + '/three.docx', '--out', d + '/o3'); chk('three pictures: uses the first two and says so', rc == 0 and 'first two are used' in txt and os.path.exists(d + '/o3/iwwrmp-logo.png'))
build(d + '/rep.docx', {'a.png': A, 'b.png': B}, ['a.png', 'b.png', 'a.png']); rc, txt = run(d + '/rep.docx', '--out', d + '/o4'); chk('a picture used twice is counted once', rc == 0 and open(d + '/o4/ministry-logo.png', 'rb').read() == A and open(d + '/o4/iwwrmp-logo.png', 'rb').read() == B)
build(d + '/jpg.docx', {'a.jpeg': b'\xff\xd8\xff' + b'x' * 20, 'b.png': B}, ['a.jpeg', 'b.png']); rc, txt = run(d + '/jpg.docx', '--out', d + '/o5'); chk('a picture that is not a PNG is not written (the page expects .png) and the message says what to do', 'NOT written' in txt and not os.path.exists(d + '/o5/ministry-logo.png') and os.path.exists(d + '/o5/iwwrmp-logo.png'), txt)
open(d + '/bad.docx', 'w').write('not a zip'); rc, txt = run(d + '/bad.docx'); chk('a file that is not a Word file: plain message, exit 2, no traceback', rc == 2 and 'Could not read' in txt)
rc, txt = run(d + '/missing.docx'); chk('a missing file: plain message, exit 2', rc == 2 and 'Could not read' in txt)

def build_anchored(path, files, placed):
    """placed: list of (picture name, horizontal offset in EMU or None for an inline picture), in the order the pictures are USED in the document."""
    names = list(files)
    rels = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(
        f'<Relationship Id="rId{i + 5}" Type="x/image" Target="media/{n}"/>' for i, n in enumerate(names)) + '</Relationships>'
    body = ''
    for n, off in placed:
        emb = f'<a:blip r:embed="rId{names.index(n) + 5}"/>'
        body += (f'<w:r><w:drawing><wp:anchor><wp:positionH relativeFrom="column"><wp:posOffset>{off}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>5</wp:posOffset></wp:positionV>{emb}</wp:anchor></w:drawing></w:r>'
                 if off is not None else f'<w:r><w:drawing><wp:inline>{emb}</wp:inline></w:drawing></w:r>')
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr('word/document.xml', '<w:document xmlns:w="w" xmlns:a="a" xmlns:r="r" xmlns:wp="wp"><w:body><w:p>' + body + '</w:p></w:body></w:document>')
        z.writestr('word/_rels/document.xml.rels', rels)
        for n, data in files.items(): z.writestr('word/media/' + n, data)
# Exactly like the TRC file: the IWWRMP picture is used FIRST but sits on the RIGHT (offset 4991100); the emblem is used second and sits on the LEFT (205740).
build_anchored(d + '/trc2.docx', {'image1.png': B, 'image2.png': A}, [('image1.png', 4991100), ('image2.png', 205740)])
rc, txt = run(d + '/trc2.docx', '--out', d + '/o6')
chk('floating pictures are ordered by their position on the page, not by order of use: the left picture is the ministry logo even though it is used second (the real TRC file)', rc == 0 and open(d + '/o6/ministry-logo.png', 'rb').read() == A and open(d + '/o6/iwwrmp-logo.png', 'rb').read() == B, txt)
build_anchored(d + '/trc3.docx', {'a.png': A, 'b.png': B, 'c.png': A}, [('b.png', None), ('a.png', 100)])
rc, txt = run(d + '/trc3.docx', '--out', d + '/o7'); chk('a positioned picture comes before an inline one (positions first, then order of use)', rc == 0 and open(d + '/o7/ministry-logo.png', 'rb').read() == A and open(d + '/o7/iwwrmp-logo.png', 'rb').read() == B, txt)
rc, txt = run(d + '/trc2.docx', '--out', d + '/o8', '--swap'); chk('--swap reverses the pair for floating pictures too', open(d + '/o8/ministry-logo.png', 'rb').read() == B and open(d + '/o8/iwwrmp-logo.png', 'rb').read() == A)
for n, c, dd in R: print(('PASS ' if c else 'FAIL ') + n + ('' if c else '   -> ' + dd))
print(sum(1 for _, c, _ in R if c), '/', len(R), 'passed')
