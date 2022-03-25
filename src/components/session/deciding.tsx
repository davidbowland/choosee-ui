import CheckIcon from '@mui/icons-material/Check'
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'
import React from 'react'

import { Place } from '@types'

export interface DecidingProps {
  address: string
  makeChoice: (name: string, value: boolean) => void
  place: Place
}

const Deciding = ({ address, place, makeChoice }: DecidingProps): JSX.Element => {
  const onDecision = (_: any, value: number) => {
    makeChoice(place.name, value === 0)
  }

  return (
    <>
      <Typography sx={{ textAlign: 'center' }} variant="h6">
        {address}
      </Typography>
      <br />
      {place && (
        <Card sx={{ margin: 'auto', maxWidth: 350 }}>
          {place.pic ? (
            <CardMedia alt={`Photo of ${place.name}`} component="img" height="200" image={place.pic} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <RestaurantIcon fontSize="large" sx={{ height: 200 }} titleAccess="Restaurant icon" />
            </div>
          )}
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              {place.name}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {place.vicinity}
            </Typography>
            {place.rating !== undefined && (
              <div>
                {Array.from({ length: Math.round(place.rating) }).map((_, index) => (
                  <FavoriteRoundedIcon key={index} />
                ))}
              </div>
            )}
            {place.priceLevel !== undefined && (
              <div>
                {Array.from({ length: Math.round(place.priceLevel) }).map((_, index) => (
                  <MonetizationOnRoundedIcon key={index} />
                ))}
              </div>
            )}
          </CardContent>
          <BottomNavigation onChange={onDecision} showLabels>
            <BottomNavigationAction icon={<CheckIcon />} label="Sounds good" />
            <BottomNavigationAction icon={<DoNotDisturbIcon />} label="Maybe later" />
          </BottomNavigation>
        </Card>
      )}
    </>
  )
}

export default Deciding
