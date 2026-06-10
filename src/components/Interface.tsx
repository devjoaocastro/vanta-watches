import { scrollToPage } from '../scrollBus'

const PILLARS = [
  {
    name: 'Guilloché',
    line: 'A lattice engraved one pass at a time, on a rose-engine lathe older than the company itself.',
  },
  {
    name: 'Anglage',
    line: 'Every bridge edge bevelled by hand to a forty-five degree mirror — four hours per bridge.',
  },
  {
    name: 'Perlage',
    line: 'Overlapping pearls of finish applied where only the watchmaker will ever look.',
  },
]

const MILESTONES = [
  {
    year: '1947',
    text: 'Édouard Vanta opens a two-bench atelier above the Rhône, with one lathe and a borrowed loupe.',
  },
  {
    year: '1968',
    text: 'The Calibre I survives a 4,000-metre descent strapped to a bathyscaphe hull. It loses two seconds.',
  },
  {
    year: '1994',
    text: 'VANTA refuses quartz. Production is capped at four hundred pieces a year — permanently.',
  },
  {
    year: '2026',
    text: 'The Calibre V-47 debuts: our first movement with not a single supplied component.',
  },
]

const MODELS = [
  { name: 'VANTA Un', spec: '38mm · steel', price: 'CHF 18,400' },
  { name: 'VANTA Deux', spec: '40mm · rose gold', price: 'CHF 32,700' },
  { name: 'VANTA Nuit', spec: '41mm · ceramic', price: 'CHF 24,900' },
]

export default function Interface() {
  return (
    <div className="interface">
      {/* 0 — Hero */}
      <section className="section section--center section--hero">
        <p className="tagline">Haute Horlogerie · Genève · Est. 1947</p>
        <h1 className="hero-title">
          Time, <em>assembled</em>
          <br />
          by hand.
        </h1>
        <p className="hero-sub">
          Seventy-nine years, one address, no shortcuts. Every VANTA leaves the atelier
          exactly two hundred and seventeen parts heavier than it arrived.
        </p>
        <button className="cta" onClick={() => scrollToPage(1)}>
          Descend into the movement
        </button>
        <div className="scroll-hint">
          <span className="scroll-hint__line" />
          <span className="scroll-hint__label">scroll</span>
        </div>
      </section>

      {/* 1 — The Movement */}
      <section className="section section--left" data-num="I">
        <p className="kicker">01 — The Movement</p>
        <h2>
          Calibre <em>V-47</em>.
        </h2>
        <p className="body">
          Two hundred and seventeen components. One pair of hands. The going train is cut,
          polished and set by a single watchmaker from first wheel to final jewel — a
          discipline we have kept since 1947, because a movement remembers who built it.
        </p>
        <p className="hint">→ hover the movement</p>
      </section>

      {/* 2 — Craft */}
      <section className="section section--right" data-num="II">
        <p className="kicker">02 — Craft</p>
        <h2>
          Three words we
          <br />
          never <em>translate</em>.
        </h2>
        <ul className="pillars">
          {PILLARS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong>
              <span>{p.line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3 — The Watch, complete */}
      <section className="section section--bottom" data-num="III">
        <p className="kicker">03 — The Watch</p>
        <h2 className="h2--small">
          Forty hours of reserve.
          <br />A lifetime of <em>attention</em>.
        </h2>
        <p className="hint">hover — the hours hasten · click — it chimes</p>
      </section>

      {/* 4 — Heritage */}
      <section className="section section--left" data-num="IV">
        <p className="kicker">04 — Heritage</p>
        <h2>
          Slow since <em>1947</em>.
        </h2>
        <ol className="timeline">
          {MILESTONES.map((m) => (
            <li key={m.year}>
              <em>{m.year}</em>
              <span>{m.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 5 — Collection */}
      <section className="section section--collection" data-num="V">
        <div className="collection-head">
          <p className="kicker">05 — Collection</p>
          <h2 className="h2--small">
            One idea, three <em>temperaments</em>.
          </h2>
        </div>
        <ul className="models">
          {MODELS.map((m) => (
            <li key={m.name}>
              <strong>{m.name}</strong>
              <span>{m.spec}</span>
              <em>{m.price}</em>
            </li>
          ))}
        </ul>
      </section>

      {/* 6 — Footer: restraint is the design */}
      <section className="section section--footer">
        <div className="monogram" aria-hidden="true">
          V
        </div>
        <p className="footer-line">By appointment only — Genève · Lisboa · Tokyo</p>
        <hr className="footer-rule" />
        <nav className="footer-links">
          <a href="mailto:atelier@vanta.swiss?subject=Care">Care</a>
          <a href="mailto:atelier@vanta.swiss?subject=Warranty">Warranty</a>
          <a href="mailto:atelier@vanta.swiss?subject=Authenticity">Authenticity</a>
          <a href="mailto:press@vanta.swiss">Press</a>
        </nav>
        <p className="footer-copy">© VANTA Horlogerie 1947–2026</p>
      </section>
    </div>
  )
}
