import React from 'react'

import { InstallButton, InstallModal, InstallOffer, InstallSteps } from './elements'
import { InstallMethod } from '@utils/push-capability'

export interface InstallDialogProps {
  method: InstallMethod
  onClose: () => void
  open: boolean
  promptInstall: () => Promise<void>
}

// Safari's own words, in Safari's own order. There is no install API here, so the gestures happen
// in the browser's chrome where we cannot put a button.
const IOS_STEPS = [
  "Tap Share in Safari's toolbar.",
  'Choose Add to Home Screen.',
  'Open Choosee from your Home Screen.',
]

// Never "Share": Firefox for Android has no Share button, and naming one sends the user hunting for
// something that does not exist. The menu is named loosely on purpose — the branch is reached by a
// user-agent guess, so the wording has to survive being slightly wrong.
const MENU_STEPS = ["Tap ⋮ in your browser's toolbar.", 'Choose Add to Home screen.', 'Open Choosee from there.']

const InstallDialog = ({ method, onClose, open, promptInstall }: InstallDialogProps): React.ReactNode => {
  const install = async (): Promise<void> => {
    await promptInstall()
    // The OS install sheet is the thing on screen now. Leaving ours behind it is just noise.
    onClose()
  }

  return (
    <InstallModal onClose={onClose} open={open}>
      <InstallOffer exclusive={method === 'ios-share'} />
      {method === 'prompt' && <InstallButton onPress={install} />}
      {method === 'ios-share' && <InstallSteps steps={IOS_STEPS} />}
      {method === 'browser-menu' && <InstallSteps steps={MENU_STEPS} />}
    </InstallModal>
  )
}

export default InstallDialog
