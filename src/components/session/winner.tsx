import { Link, navigate } from 'gatsby'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined'
import Rating from '@mui/material/Rating'
import React from 'react'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import Logo from '@components/logo'
import { PlaceDetails } from '@types'

export interface WinnerProps {
  winner: PlaceDetails
}

const Winner = ({ winner }: WinnerProps): JSX.Element => {
  return (
    <>
      <Logo />
      <Stack margin="auto" maxWidth="400px" spacing={2}>
        <Typography sx={{ textAlign: 'center' }} variant="h5">
          The winning decision is:
        </Typography>
        <Card sx={{ margin: 'auto', maxWidth: 400 }}>
          {winner.photos[0] ? (
            <CardMedia alt={`Photo of ${winner.name}`} component="img" height="300" image={winner.photos[0]} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <RestaurantIcon fontSize="large" sx={{ height: 300 }} titleAccess="Restaurant icon" />
            </div>
          )}
          <CardContent>
            <Stack spacing={1}>
              <Typography component="div" gutterBottom variant="h5">
                {winner.name}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {winner.formattedAddress ?? winner.vicinity}
              </Typography>
              {winner.internationalPhoneNumber && (
                <Typography>
                  <Link to={`tel:${winner.internationalPhoneNumber.replace(/\D/g, '')}`}>
                    {winner.formattedPhoneNumber ?? winner.internationalPhoneNumber}
                  </Link>
                </Typography>
              )}
              {winner.rating !== undefined && (
                <Rating
                  defaultValue={winner.rating}
                  emptyIcon={<FavoriteBorderIcon fontSize="inherit" />}
                  getLabelText={(value: number) => `${value} Heart${value !== 1 ? 's' : ''}`}
                  icon={<FavoriteIcon fontSize="inherit" />}
                  precision={0.5}
                  readOnly
                  sx={{ '& .MuiRating-iconFilled': { color: '#ff6d75' } }}
                  value={winner.rating}
                />
              )}
              {winner.priceLevel !== undefined && (
                <Rating
                  emptyIcon={<MonetizationOnOutlinedIcon fontSize="inherit" />}
                  getLabelText={(value: number) => `${value} Dollar${value !== 1 ? 's' : ''}`}
                  icon={<MonetizationOnIcon fontSize="inherit" />}
                  max={4}
                  precision={0.5}
                  readOnly
                  sx={{ '& .MuiRating-iconFilled': { color: '#d4af37' } }}
                  value={winner.priceLevel}
                />
              )}
              {winner.website && (
                <Typography>
                  <Link to={winner.website}>Visit their website</Link>
                </Typography>
              )}
              {winner.openHours && (
                <Typography color="text.secondary" variant="body2">
                  <FormControl sx={{ m: 1, minWidth: 120 }} variant="standard">
                    <InputLabel id="choice-hours-label">Hours</InputLabel>
                    <Select
                      id="choice-hours-select"
                      label="Hours"
                      labelId="choice-hours-label"
                      value={winner.openHours[(new Date().getDay() + 6) % 7]}
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
            </Stack>
          </CardContent>
        </Card>
        <Button
          data-amplify-analytics-name="new-choices-click"
          data-amplify-analytics-on="click"
          onClick={() => navigate('/')}
          variant="contained"
        >
          Make new choices
        </Button>
      </Stack>
    </>
  )
}

export default Winner
