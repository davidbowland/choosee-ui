import { Helmet } from 'react-helmet'
import { Link } from 'gatsby'
import React from 'react'

import { ErrorContents, ErrorHeader, ErrorMain } from './elements'

export interface ServerErrorProps {
  children: React.ReactNode
  title: string
}

const ServerErrorMessage = ({ children, title }: ServerErrorProps): JSX.Element => {
  return (
    <ErrorMain>
      <Helmet>
        <title>{title} -- dbowland.com</title>
      </Helmet>
      <ErrorHeader>{title}</ErrorHeader>
      <ErrorContents>
        {children}
        <br />
        <br />
        <Link to="/">Go home</Link>.
      </ErrorContents>
    </ErrorMain>
  )
}

export default ServerErrorMessage
