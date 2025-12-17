import OverdoseTrendsChartCard from './components/OverdoseTrendsChartCard.jsx'
import PoliticalVoteCard from './components/PoliticalVoteCard.jsx'

export default function App() {
  const statement = `Political statement: We should expand evidence-based harm-reduction and treatment programs to address rising drug overdose trends.`

  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar__inner">
          <div className="brand">
            <div className="brand__logo" aria-hidden="true">
              OT
            </div>
            <div className="brand__meta">
              <div className="brand__title">Overdose Trends</div>
              <div className="brand__subtitle">Interactive data + community sentiment</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container content">
        <section className="hero">
          <h1 className="hero__title">Overdose data dashboard</h1>
          <p className="hero__description">
            Explore monthly overdose trends by drug/indicator. Then vote on the statement—votes are stored in Firestore and
            update live for everyone.
          </p>
        </section>

        <div className="stack">
          <OverdoseTrendsChartCard />
          <PoliticalVoteCard statementId="political-statement-v1" statementText={statement} />
        </div>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__links">
            <a
              className="footer__link"
              href="https://catalog.data.gov/dataset/provisional-drug-overdose-death-counts-for-specific-drugs"
              target="_blank"
              rel="noreferrer"
            >
              Data source: Provisional Drug Overdose Death Counts for Specific Drugs (Data.gov)
            </a>
            <a
              className="footer__link"
              href="https://github.com/hwdbaek77/unit3quiz-v005-daniel"
              target="_blank"
              rel="noreferrer"
            >
              GitHub: hwdbaek77/unit3quiz-v005-daniel
            </a>
          </div>
          <div className="footer__note">Built with React + Vite + Firestore</div>
        </div>
      </footer>
    </div>
  )
}


