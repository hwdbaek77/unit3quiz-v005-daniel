import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, increment, onSnapshot, runTransaction, serverTimestamp, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { firestore, isFirebaseConfigured } from '../firebase/client.js'

function formatNumber(n) {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n ?? 0)
  } catch {
    return String(n ?? 0)
  }
}

// Generate or retrieve a unique user ID from localStorage
function getUserId() {
  const STORAGE_KEY = 'userVoteId'
  let userId = localStorage.getItem(STORAGE_KEY)
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(STORAGE_KEY, userId)
  }
  return userId
}

export default function PoliticalVoteCard({ statementId, statementText }) {
  const configured = isFirebaseConfigured()
  const userId = useMemo(() => getUserId(), [])
  
  const voteRef = useMemo(() => {
    if (!configured) return null
    return doc(firestore, 'votes', statementId)
  }, [configured, statementId])

  const userVoteRef = useMemo(() => {
    if (!configured) return null
    return doc(firestore, 'userVotes', `${userId}_${statementId}`)
  }, [configured, userId, statementId])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [support, setSupport] = useState(0)
  const [against, setAgainst] = useState(0)
  const [userVote, setUserVote] = useState(null) // 'support', 'against', or null
  const [savingVote, setSavingVote] = useState(false)
  const [loadingUserVote, setLoadingUserVote] = useState(true)

  // Load user's vote on mount using getDoc - use real-time listener for updates
  useEffect(() => {
    if (!configured || !userVoteRef) {
      setLoadingUserVote(false)
      setUserVote(null)
      return
    }

    setLoadingUserVote(true)

    // Use onSnapshot for real-time updates, but also works on initial load
    const unsubscribe = onSnapshot(
      userVoteRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          const voteValue = data.vote || null
          setUserVote(voteValue)
          console.log('User vote loaded from Firestore:', voteValue, 'for user:', userId)
        } else {
          setUserVote(null)
          console.log('No user vote found in Firestore for user:', userId)
        }
        setLoadingUserVote(false)
      },
      (err) => {
        console.error('Failed to load user vote:', err)
        setError('Failed to load your saved vote.')
        setLoadingUserVote(false)
      }
    )

    return () => unsubscribe()
  }, [configured, userVoteRef, userId]) // Include userVoteRef so it updates when ref changes

  useEffect(() => {
    if (!configured || !voteRef) {
      setLoading(false)
      return
    }

    let cancelled = false

    // Initialize aggregate document by counting existing user votes if document doesn't exist
    async function initializeAggregateVotes() {
      try {
        const snap = await getDoc(voteRef)
        if (!snap.exists()) {
          // Count all user votes for this statement
          const userVotesRef = collection(firestore, 'userVotes')
          const q = query(userVotesRef, where('statementId', '==', statementId))
          const userVotesSnap = await getDocs(q)
          
          let supportCount = 0
          let againstCount = 0
          userVotesSnap.forEach((docSnap) => {
            const data = docSnap.data()
            if (data.vote === 'support') supportCount++
            if (data.vote === 'against') againstCount++
          })

          // Create aggregate document with actual counts
          await setDoc(
            voteRef,
            {
              support: supportCount,
              against: againstCount,
              statement: statementText,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
          console.log(`Initialized aggregate votes: support=${supportCount}, against=${againstCount}`)
        } else {
          // Document exists, just ensure statement field is set
          await setDoc(
            voteRef,
            { statement: statementText, updatedAt: serverTimestamp() },
            { merge: true }
          ).catch(() => {
            // Ignore errors if rules block update
          })
        }
      } catch (err) {
        console.error('Failed to initialize aggregate votes:', err)
        // Continue anyway - the snapshot listener will still work
      }
    }

    initializeAggregateVotes()

    const unsub = onSnapshot(
      voteRef,
      (snap) => {
        if (cancelled) return
        const data = snap.data() || {}
        const supportVal = Number(data.support) || 0
        const againstVal = Number(data.against) || 0
        setSupport(supportVal)
        setAgainst(againstVal)
        console.log(`Aggregate votes updated: support=${supportVal}, against=${againstVal}`)
        setError('')
        setLoading(false)
      },
      (err) => {
        if (cancelled) return
        console.error('Failed to read aggregate votes:', err)
        setError(err?.message || 'Failed to read votes from Firestore.')
        setLoading(false)
      },
    )

    return () => {
      cancelled = true
      unsub()
    }
  }, [configured, voteRef, statementId, statementText])

  async function vote(direction) {
    if (!configured || !voteRef || !userVoteRef || savingVote) return
    setError('')
    setSavingVote(true)
    
    const previousVote = userVote
    
    try {
      // Save user's vote choice to Firestore using setDoc
      await setDoc(
        userVoteRef,
        {
          vote: direction,
          statementId,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      
      // Update local state immediately for better UX
      setUserVote(direction)

      // Update aggregate counts using transaction
      await runTransaction(firestore, async (tx) => {
        const snap = await tx.get(voteRef)
        if (!snap.exists()) {
          tx.set(voteRef, { support: 0, against: 0, statement: statementText, createdAt: serverTimestamp() })
        }
        
        const updates = { updatedAt: serverTimestamp() }
        
        // If user had a previous vote, decrement it
        if (previousVote && previousVote !== direction) {
          updates[previousVote] = increment(-1)
        }
        
        // Increment the new vote (or if no previous vote, just increment)
        if (!previousVote || previousVote !== direction) {
          updates[direction] = increment(1)
        }
        
        tx.update(voteRef, updates)
      })
    } catch (e) {
      setError(e?.message || 'Vote failed. Check Firestore rules and your Firebase config.')
      // Revert user vote state on error
      setUserVote(previousVote)
    } finally {
      setSavingVote(false)
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

      <div className="voteGrid" aria-busy={loading || savingVote || loadingUserVote ? 'true' : 'false'}>
        <button 
          className={`btn btn--support ${userVote === 'support' ? 'btn--selected' : ''}`} 
          type="button" 
          disabled={!configured || savingVote || loadingUserVote} 
          onClick={() => vote('support')}
          aria-pressed={userVote === 'support'}
        >
          <div className="btn__label">Support</div>
          <div className="btn__value">{formatNumber(support)}</div>
        </button>

        <button 
          className={`btn btn--against ${userVote === 'against' ? 'btn--selected' : ''}`} 
          type="button" 
          disabled={!configured || savingVote || loadingUserVote} 
          onClick={() => vote('against')}
          aria-pressed={userVote === 'against'}
        >
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


