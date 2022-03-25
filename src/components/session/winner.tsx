import { Link, navigate } from 'gatsby'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import React from 'react'

import Logo from '@components/logo'
import { PlaceDetails } from '@types'

export interface WinnerProps {
  winner: PlaceDetails
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
            {winner.formattedAddress ?? winner.vicinity}
          </Typography>
          {winner.internationalPhoneNumber && (
            <Typography color="text.secondary" variant="body2">
              <Link to={`tel:${winner.internationalPhoneNumber.replace(/\D/g, '')}`}>
                {winner.formattedPhoneNumber ?? winner.internationalPhoneNumber}
              </Link>
            </Typography>
          )}
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
          {winner.website && (
            <Typography color="text.secondary" variant="body2">
              <Link to={winner.website}>Visit their website</Link>
            </Typography>
          )}
          {winner.openHours && (
            <Typography color="text.secondary" variant="body2">
              <FormControl sx={{ m: 1, minWidth: 120 }} variant="standard">
                <InputLabel id="choice-hours-label">Hours</InputLabel>
                <Select
                  labelId="choice-hours-label"
                  id="choice-hours-select"
                  value={winner.openHours[(new Date().getDay() + 7) % 8]}
                  label="Hours"
                >
                  {winner.openHours.map((hours, index) => (
                    <MenuItem key={index} value={hours}>
                      {hours}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Typography>
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
