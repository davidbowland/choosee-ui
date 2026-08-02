import Link from 'next/link'
import React, { useState } from 'react'

import { Brand, InstallIconButton, NavContainer } from './elements'
import InstallDialog from '@components/install-dialog'
import { canOfferInstall, useInstallMethod, useInstallPromptContext } from '@hooks/useInstallPrompt'

const AppBar = (): React.ReactNode => {
  const method = useInstallMethod()
  const { promptInstall } = useInstallPromptContext()
  const [installOpen, setInstallOpen] = useState(false)

  return (
    <NavContainer>
      <Link href="/">
        <Brand>Choosee</Brand>
      </Link>
      {/* Hidden outright when the browser is already standalone or cannot install at all. An icon
          that opens a dialog with nothing to offer is worse than an empty slot. */}
      {canOfferInstall(method) && (
        <>
          <InstallIconButton onPress={() => setInstallOpen(true)} />
          <InstallDialog
            method={method}
            onClose={() => setInstallOpen(false)}
            open={installOpen}
            promptInstall={promptInstall}
          />
        </>
      )}
    </NavContainer>
  )
}

export default AppBar
