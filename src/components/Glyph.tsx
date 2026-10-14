// Phone fonts lack ↗ and ✳, so iOS and Android draw them as color emoji. Touch screens get the SVG instead.
const glyphs = {
  arrow: { text: '↗', path: 'M4.5 11.5 11.5 4.5M5.5 4.5h6v6' },
  asterisk: { text: '✳', path: 'M8 1.5v13M1.5 8h13M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2' },
};

export default function Glyph({ name }: { name: keyof typeof glyphs }) {
  const { text, path } = glyphs[name];
  return <span className="glyph"><span className="glyph-text">{text}</span><svg className="glyph-icon" viewBox="0 0 16 16" aria-hidden="true"><path d={path} /></svg></span>;
}
