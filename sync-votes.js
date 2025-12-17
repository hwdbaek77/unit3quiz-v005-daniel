#!/usr/bin/env node
/**
 * Script to manually sync aggregate vote counts with actual user votes
 * Run with: node sync-votes.js
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, getDocs, setDoc, query, where, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBxQcvQyUpyyXD9gfb5l0Xabip92BGlqp8',
  authDomain: 'unit3quiz-v005-daniel.firebaseapp.com',
  projectId: 'unit3quiz-v005-daniel',
  storageBucket: 'unit3quiz-v005-daniel.firebasestorage.app',
  messagingSenderId: '749260899718',
  appId: '1:749260899718:web:671d353e798cf23b005807',
  measurementId: 'G-Q2RQRCYXXJ',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function syncVotes() {
  console.log('🔄 Syncing aggregate vote counts with user votes...\n')

  const statementId = 'political-statement-v1'
  const statementText = 'Political statement: We should expand evidence-based harm-reduction and treatment programs to address rising drug overdose trends.'

  try {
    // Count all user votes for this statement
    const userVotesRef = collection(db, 'userVotes')
    const q = query(userVotesRef, where('statementId', '==', statementId))
    const userVotesSnap = await getDocs(q)
    
    let supportCount = 0
    let againstCount = 0
    const userVotes = []
    
    userVotesSnap.forEach((docSnap) => {
      const data = docSnap.data()
      userVotes.push({
        id: docSnap.id,
        vote: data.vote,
        userId: data.userId,
      })
      if (data.vote === 'support') supportCount++
      if (data.vote === 'against') againstCount++
    })

    console.log(`📊 Found ${userVotes.length} user votes:`)
    console.log(`   Support: ${supportCount}`)
    console.log(`   Against: ${againstCount}\n`)

    // Update aggregate document
    const voteDocRef = doc(db, 'votes', statementId)
    await setDoc(
      voteDocRef,
      {
        support: supportCount,
        against: againstCount,
        statement: statementText,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    console.log('✅ Successfully synced aggregate vote counts!')
    console.log(`   Updated votes/${statementId}:`)
    console.log(`   support: ${supportCount}`)
    console.log(`   against: ${againstCount}`)
  } catch (error) {
    console.error('\n❌ Error syncing votes:', error)
    console.error('   Message:', error.message)
    console.error('   Code:', error.code)
    process.exit(1)
  }
}

syncVotes().then(() => {
  process.exit(0)
}).catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

