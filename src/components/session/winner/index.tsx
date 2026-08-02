import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

import { BracketButton, InstallLink, NewSessionButton, WinnerContainer, WinnerLoading, WinnerTitle } from './elements'
import BracketView from '@components/bracket-view'
import InstallDialog from '@components/install-dialog'
import RestaurantCard from '@components/restaurant-card'
import { FilterClosingSoonBadge } from '@components/session/elements'
import { canOfferInstall, useInstallMethod, useInstallPromptContext } from '@hooks/useInstallPrompt'
import { ChoicesMap, SessionData } from '@types'
import { markWinnerSeen } from '@utils/joined-sessions'

export interface WinnerPhaseProps {
  session: SessionData
  choices: ChoicesMap
}

const WinnerPhase = ({ session, choices }: WinnerPhaseProps): React.ReactNode => {
  const router = useRouter()
  const [bracketOpen, setBracketOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const method = useInstallMethod()
  const { promptInstall } = useInstallPromptContext()
  const winnerChoice = session.winner ? choices[session.winner] : null

  // Retires this Choosee's home-page card. Here rather than on the home page because this also
  // catches arriving from a notification: the card should go because the winner was seen, by
  // whatever route. Above the early return below — a hook after a conditional return would break
  // the moment the winner's choice is still loading.
  useEffect(() => {
    markWinnerSeen(session.sessionId)
  }, [session.sessionId])

  if (!winnerChoice) {
    return <WinnerLoading />
  }

  return (
    <WinnerContainer>
      <WinnerTitle />
      {session.filterClosingSoon && <FilterClosingSoonBadge />}
      <RestaurantCard choice={winnerChoice} variant="winner" />
      <NewSessionButton onPress={() => router.push('/')} />
      {/* Same visibility rule as the app bar: nothing here when the app is already installed or the
          browser cannot install it. */}
      {canOfferInstall(method) && (
        <>
          <InstallLink onPress={() => setInstallOpen(true)} />
          <InstallDialog
            method={method}
            onClose={() => setInstallOpen(false)}
            open={installOpen}
            promptInstall={promptInstall}
          />
        </>
      )}
      <BracketButton onPress={() => setBracketOpen(true)} />
      <BracketView choices={choices} onClose={() => setBracketOpen(false)} open={bracketOpen} session={session} />
    </WinnerContainer>
  )
}

export default WinnerPhase
