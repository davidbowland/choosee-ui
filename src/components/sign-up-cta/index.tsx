import { StaticImage } from 'gatsby-plugin-image'
import React from 'react'

import FollowTheSignsIcon from '@mui/icons-material/FollowTheSigns'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { AuthState } from '@types'

export interface SignUpCtaProps {
  setAuthState: (state: AuthState) => void
  setShowLogin: (state: boolean) => void
}

const SignUpCta = ({ setAuthState, setShowLogin }: SignUpCtaProps): JSX.Element => {
  interface CtaCardProps {
    children: string | JSX.Element | JSX.Element[]
    cta: string
    img: JSX.Element
    title: string
  }

  const CtaCard = ({ children, cta, img, title }: CtaCardProps): JSX.Element => (
    <Grid item lg={4} md={6} sm={8} xs={12}>
      <Card>
        <CardMedia>{img}</CardMedia>
        <CardContent>
          <Typography component="div" gutterBottom variant="h5">
            {title}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {children}
          </Typography>
        </CardContent>
        <CardActions>
          <Button onClick={signUpClick} size="small">
            {cta}
          </Button>
        </CardActions>
      </Card>
    </Grid>
  )

  const signUpClick = (): void => {
    setAuthState('signUp')
    setShowLogin(true)
  }

  return (
    <>
      <Grid container justifyContent="center">
        <Grid item maxWidth="800px">
          <Stack margin="auto" spacing={2}>
            <Typography sx={{ textAlign: 'center' }} variant="h6">
              Vote on where you want to eat. Share a link for others to vote with you. Use the form to get started. Sign
              up for a free account or sign in to unlock special features such as texting and option editing.
            </Typography>
            <Button
              data-amplify-analytics-name="sign-up-click"
              data-amplify-analytics-on="click"
              fullWidth
              onClick={signUpClick}
              startIcon={<FollowTheSignsIcon />}
              variant="contained"
            >
              Sign up
            </Button>
            <Typography>
              A free account is required to keep our costs low. We don&apos;t sell your information and deleting your
              account is easy.
            </Typography>
          </Stack>
        </Grid>
      </Grid>
      <Grid
        container
        justifyContent="center"
        spacing={4}
        sx={{ minHeight: '100vh', paddingRight: 4, paddingTop: 2, width: '100%' }}
      >
        <CtaCard
          cta="Sign up"
          img={<StaticImage alt="Restaurant search" src="../../assets/images/restaurant-search.png" />}
          title="Search for nearby restaurants"
        >
          Use multiple criteria to find the perfect set of restaurants to choose from.
        </CtaCard>
        <CtaCard
          cta="Get started"
          img={<StaticImage alt="Text others" src="../../assets/images/text-others.png" />}
          title="Invite others to choose with you"
        >
          Sign in to enter the phone number of people you want to text. A link will be sent directly to them inviting
          them to vote with you.
        </CtaCard>
        <CtaCard
          cta="Sounds good"
          img={<StaticImage alt="Winning restaurant decision" src="../../assets/images/winning-decision.png" />}
          title="Randomly picked winner"
        >
          Once all participants have voted, a winning resaurant is picked from the choices everyone agreed on.
        </CtaCard>
        <CtaCard
          cta="Let's go"
          img={<StaticImage alt="Restaurant contact info" src="../../assets/images/contact-info.png" />}
          title="Contact info at your fingertips"
        >
          Restaurant contact info, including phone number and website, are prominently displayed on each choice and the
          winning decision. Other information displayed includes rating, price estimate, and hours of operation.
        </CtaCard>
        <CtaCard
          cta="I'm in"
          img={<StaticImage alt="Automatic location" src="../../assets/images/automatic-location.png" />}
          title="Find choices anyhere"
        >
          No matter where you are, you can allow Choosee to find your location, saving you time and trouble.
        </CtaCard>
        <CtaCard
          cta="Create account"
          img={<StaticImage alt="Vote options" src="../../assets/images/vote-options.png" />}
          title="Adjust vote options on the fly"
        >
          Sign in to unlock the ability to modify vote options while the vote is in progress.
        </CtaCard>
      </Grid>
    </>
  )
}

export default SignUpCta
