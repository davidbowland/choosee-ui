import { Helmet } from 'react-helmet'
import { Link } from 'gatsby'
import React from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export interface ServerErrorProps {
  children: React.ReactNode
  title: string
}

const ServerErrorMessage = ({ children, title }: ServerErrorProps): JSX.Element => {
  return (
    <Stack margin="auto" padding={4} spacing={2}>
      <Helmet>
        <title>{title} -- dbowland.com</title>
      </Helmet>
      <Typography variant="h1">{title}</Typography>
      <Typography>{children}</Typography>
      <Link to="/">Go home</Link>
    </Stack>
  )
}

export default ServerErrorMessage
