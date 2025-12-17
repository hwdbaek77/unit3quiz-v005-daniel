#!/usr/bin/env node
/**
 * Test script to verify Firestore connectivity and vote data
 * Run with: node test-firestore.js
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore'

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

async function testFirestore() {
  console.log('🔍 Testing Firestore connectivity...\n')

  try {
    // Test 1: Check aggregate votes document
    console.log('1️⃣ Checking aggregate votes document (votes/political-statement-v1)...')
    const voteDocRef = doc(db, 'votes', 'political-statement-v1')
    const voteSnap = await getDoc(voteDocRef)
    
    if (voteSnap.exists()) {
      const data = voteSnap.data()
      console.log('   ✅ Document exists:')
      console.log('      support:', data.support || 0)
      console.log('      against:', data.against || 0)
      console.log('      statement:', data.statement?.substring(0, 50) + '...')
    } else {
      console.log('   ⚠️  Document does not exist (will be created on first vote)')
    }

    // Test 2: Count all user votes
    console.log('\n2️⃣ Counting all user votes in userVotes collection...')
    const userVotesRef = collection(db, 'userVotes')
    const userVotesSnap = await getDocs(userVotesRef)
    
    let supportCount = 0
    let againstCount = 0
    const userVotes = []
    
    userVotesSnap.forEach((docSnap) => {
      const data = docSnap.data()
      userVotes.push({
        id: docSnap.id,
        vote: data.vote,
        userId: data.userId,
        statementId: data.statementId,
      })
      if (data.vote === 'support') supportCount++
      if (data.vote === 'against') againstCount++
    })

    console.log(`   ✅ Found ${userVotes.length} user vote documents:`)
    console.log(`      support: ${supportCount}`)
    console.log(`      against: ${againstCount}`)
    
    if (userVotes.length > 0) {
      console.log('\n   Sample user votes:')
      userVotes.slice(0, 5).forEach((uv) => {
        console.log(`      - ${uv.id}: ${uv.vote}`)
      })
    }

    // Test 3: Check for votes matching the statement
    console.log('\n3️⃣ Checking votes for political-statement-v1...')
    const statementVotes = userVotes.filter((uv) => uv.statementId === 'political-statement-v1')
    const statementSupport = statementVotes.filter((uv) => uv.vote === 'support').length
    const statementAgainst = statementVotes.filter((uv) => uv.vote === 'against').length
    
    console.log(`   ✅ Found ${statementVotes.length} votes for this statement:`)
    console.log(`      support: ${statementSupport}`)
    console.log(`      against: ${statementAgainst}`)

    // Test 4: Compare aggregate vs actual counts
    console.log('\n4️⃣ Comparing aggregate document vs actual user vote counts...')
    if (voteSnap.exists()) {
      const aggregateData = voteSnap.data()
      const aggSupport = aggregateData.support || 0
      const aggAgainst = aggregateData.against || 0
      
      if (aggSupport !== statementSupport || aggAgainst !== statementAgainst) {
        console.log('   ⚠️  MISMATCH DETECTED!')
        console.log(`      Aggregate doc: support=${aggSupport}, against=${aggAgainst}`)
        console.log(`      Actual counts:  support=${statementSupport}, against=${statementAgainst}`)
        console.log('\n   💡 The aggregate document needs to be synced with user votes.')
      } else {
        console.log('   ✅ Aggregate counts match user vote counts!')
      }
    } else {
      console.log('   ⚠️  Aggregate document does not exist.')
      console.log(`   💡 Should create with: support=${statementSupport}, against=${statementAgainst}`)
    }

    console.log('\n✅ Firestore test completed successfully!')
  } catch (error) {
    console.error('\n❌ Error testing Firestore:', error)
    console.error('   Message:', error.message)
    console.error('   Code:', error.code)
    process.exit(1)
  }
}

testFirestore().then(() => {
  process.exit(0)
}).catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

