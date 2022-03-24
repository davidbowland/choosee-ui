import { navigate } from 'gatsby'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'
import React from 'react'

import Logo from '@components/logo'
import { Restaurant } from '@types'

export interface WinnerProps {
  winner: Restaurant
}

const Winner = ({ winner }: WinnerProps): JSX.Element => {
  return (
    <>
      <Logo />
      <Typography sx={{ textAlign: 'center' }} variant="h5">
        The winning decision is:
      </Typography>
      <br />
      <Card sx={{ margin: 'auto', maxWidth: 350 }}>
        {winner.pic ? (
          <CardMedia alt={`Photo of ${winner.name}`} component="img" height="200" image={winner.pic} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <RestaurantIcon fontSize="large" sx={{ height: 200 }} titleAccess="Restaurant icon" />
          </div>
        )}
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {winner.name}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {winner.vicinity}
          </Typography>
          {winner.rating !== undefined && (
            <div>
              {Array.from({ length: Math.round(winner.rating) }).map((_, index) => (
                <FavoriteRoundedIcon key={index} />
              ))}
            </div>
          )}
          {winner.priceLevel !== undefined && (
            <div>
              {Array.from({ length: Math.round(winner.priceLevel) }).map((_, index) => (
                <MonetizationOnRoundedIcon key={index} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <br />
      <div style={{ textAlign: 'center' }}>
        <Button
          data-amplify-analytics-name="new-choices-click"
          data-amplify-analytics-on="click"
          onClick={() => navigate('/')}
          variant="contained"
        >
          Make new choices
        </Button>
      </div>
    </>
  )
}

export default Winner
