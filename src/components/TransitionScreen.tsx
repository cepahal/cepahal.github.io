interface TransitionScreenProps { visible: boolean }

export default function TransitionScreen({ visible }: TransitionScreenProps) {
  return <div className={`transition-screen${visible ? ' visible' : ''}`} hidden={!visible} role="status" aria-live="polite" aria-label="Unwrapping project">
    <div className="sunburst" aria-hidden="true" />
    <div className="candy-wrap"><div className="candy" aria-hidden="true">
      <svg viewBox="0 0 160 160"><defs><radialGradient id="candyShine" cx="30%" cy="25%" r="80%"><stop offset="0" stopColor="white" stopOpacity=".65"/><stop offset=".5" stopColor="white" stopOpacity="0"/><stop offset="1" stopColor="#9a362b" stopOpacity=".15"/></radialGradient><clipPath id="candyCircle"><circle cx="80" cy="80" r="68"/></clipPath></defs>
        <circle cx="80" cy="80" r="76" fill="#FAF9F6"/><circle cx="80" cy="80" r="69" fill="#FFEE8C"/><g clipPath="url(#candyCircle)" fill="#ff6961">{[0, 90, 180, 270].map(angle => <path key={angle} transform={`rotate(${angle} 80 80)`} d="M80 80 C110 78 137 50 123 18 C140 25 157 47 155 74 C131 60 101 65 80 80Z" />)}</g>
        <circle cx="80" cy="80" r="68" fill="url(#candyShine)"/><circle cx="80" cy="80" r="69" fill="none" stroke="#d8b76d" strokeOpacity=".35" strokeWidth="2"/>
      </svg>
    </div></div>
  </div>;
}
