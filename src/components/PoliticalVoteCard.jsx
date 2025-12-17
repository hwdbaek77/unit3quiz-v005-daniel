import { useEffect, useMemo, useState } from 'react'
import { doc, increment, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { firestore, isFirebaseConfigured } from '../firebase/client.js'

function formatNumber(n) {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n ?? 0)
  } catch {
    return String(n ?? 0)
  }
}

export default function PoliticalVoteCard({ statementId, statementText }) {
  const configured = isFirebaseConfigured()
  const voteRef = useMemo(() => {
    if (!configured) return null
    return doc(firestore, 'votes', statementId)
  }, [configured, statementId])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [support, setSupport] = useState(0)
  const [against, setAgainst] = useState(0)

  useEffect(() => {
    if (!configured || !voteRef) {
      setLoading(false)
      return
    }

    // Ensure the document exists so increment updates are always safe.
    setDoc(
      voteRef,
      { support: 0, against: 0, statement: statementText, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true },
    ).catch(() => {
      // Ignore: if rules block creation, the snapshot below will still surface errors.
    })

    const unsub = onSnapshot(
      voteRef,
      (snap) => {
        const data = snap.data() || {}
        setSupport(Number(data.support) || 0)
        setAgainst(Number(data.against) || 0)
        setError('')
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to read votes from Firestore.')
        setLoading(false)
      },
    )

    return () => unsub()
  }, [configured, voteRef, statementText])

  async function vote(direction) {
    if (!configured || !voteRef) return
    setError('')
    try {
      await runTransaction(firestore, async (tx) => {
        const snap = await tx.get(voteRef)
        if (!snap.exists()) {
          tx.set(voteRef, { support: 0, against: 0, statement: statementText, createdAt: serverTimestamp() })
        }
        tx.update(voteRef, {
          [direction]: increment(1),
          updatedAt: serverTimestamp(),
        })
      })
    } catch (e) {
      setError(e?.message || 'Vote failed. Check Firestore rules and your Firebase config.')
    }
  }

  const total = support + against
  const supportPct = total > 0 ? Math.round((support / total) * 100) : 0
  const againstPct = total > 0 ? 100 - supportPct : 0

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">Community vote</h2>
          <p className="card__subtitle">{statementText}</p>
        </div>
        <span className="pill">{configured ? 'Live' : 'Not configured'}</span>
      </div>

      {!configured ? (
        <div className="callout">
          <div className="callout__title">Firestore not configured</div>
          <div className="callout__body">
            Add your Firebase web config in <code>.env.local</code> (see <code>.env.example</code>) then restart the dev
            server.
          </div>
        </div>
      ) : null}

      <div className="voteGrid" aria-busy={loading ? 'true' : 'false'}>
        <button className="btn btn--support" type="button" disabled={!configured} onClick={() => vote('support')}>
          <div className="btn__label">Support</div>
          <div className="btn__value">{formatNumber(support)}</div>
        </button>

        <button className="btn btn--against" type="button" disabled={!configured} onClick={() => vote('against')}>
          <div className="btn__label">Against</div>
          <div className="btn__value">{formatNumber(against)}</div>
        </button>
      </div>

      <div className="meter" role="img" aria-label={`Support ${supportPct}%, Against ${againstPct}%`}>
        <div className="meter__bar meter__bar--support" style={{ width: `${supportPct}%` }} />
        <div className="meter__bar meter__bar--against" style={{ width: `${againstPct}%` }} />
      </div>

      <div className="metaRow">
        <div className="metaRow__item">
          <span className="muted">Total votes</span>
          <span className="mono">{formatNumber(total)}</span>
        </div>
        <div className="metaRow__item">
          <span className="muted">Support</span>
          <span className="mono">{supportPct}%</span>
        </div>
        <div className="metaRow__item">
          <span className="muted">Against</span>
          <span className="mono">{againstPct}%</span>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
    </section>
  )
}


