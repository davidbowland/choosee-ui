import React, { useRef } from 'react'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Carousel from 'react-material-ui-carousel'
import CheckIcon from '@mui/icons-material/Check'
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import { Link } from 'gatsby'
import MenuItem from '@mui/material/MenuItem'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined'
import Rating from '@mui/material/Rating'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { PlaceDetails } from '@types'

export interface DecidingProps {
  address: string
  makeChoice: (name: string, value: boolean) => void
  place: PlaceDetails
}

const Deciding = ({ address, place, makeChoice }: DecidingProps): JSX.Element => {
  const cardRef = useRef<HTMLDivElement>(null)

  const onDecision = (_: any, value: number) => {
    makeChoice(place.name, value === 0)
    cardRef.current && cardRef.current.scrollIntoView()
  }

  return (
    <Stack margin="auto" maxWidth="400px" spacing={2}>
      <Typography sx={{ textAlign: 'center' }} variant="h6">
        {address}
      </Typography>
      {place && (
        <Card ref={cardRef} sx={{ margin: 'auto', maxWidth: 400 }}>
          {place.photos.length > 0 ? (
            <Carousel>
              {place.photos.map((photo, index) => (
                <CardMedia alt={`Photo of ${place.name}`} component="img" height="300" image={photo} key={index} />
              ))}
            </Carousel>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <RestaurantIcon fontSize="large" sx={{ height: 300 }} titleAccess="Restaurant icon" />
            </div>
          )}
          <CardContent>
            <Stack spacing={1}>
              <Typography component="div" gutterBottom variant="h5">
                {place.name}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {place.formattedAddress ?? place.vicinity}
              </Typography>
              {place.internationalPhoneNumber && (
                <Typography>
                  <Link to={`tel:${place.internationalPhoneNumber.replace(/\D/g, '')}`}>
                    {place.formattedPhoneNumber ?? place.internationalPhoneNumber}
                  </Link>
                </Typography>
              )}
              {place.priceLevel !== undefined && (
                <div>
                  <Rating
                    emptyIcon={<MonetizationOnOutlinedIcon fontSize="inherit" />}
                    getLabelText={(value: number) => `${value} Dollar${value !== 1 ? 's' : ''}`}
                    icon={<MonetizationOnIcon fontSize="inherit" />}
                    max={4}
                    precision={0.5}
                    readOnly
                    sx={{ '& .MuiRating-iconFilled': { color: '#d4af37' } }}
                    value={place.priceLevel}
                  />
                </div>
              )}
              {place.rating !== undefined && (
                <>
                  <div>
                    <Rating
                      defaultValue={place.rating}
                      emptyIcon={<FavoriteBorderIcon fontSize="inherit" />}
                      getLabelText={(value: number) => `${value} Heart${value !== 1 ? 's' : ''}`}
                      icon={<FavoriteIcon fontSize="inherit" />}
                      precision={0.5}
                      readOnly
                      sx={{ '& .MuiRating-iconFilled': { color: '#ff6d75' } }}
                      value={place.rating}
                    />
                  </div>
                  {place.ratingsTotal && (
                    <Typography color="text.secondary" variant="caption">
                      based on {place.ratingsTotal.toLocaleString()} ratings
                    </Typography>
                  )}
                </>
              )}
              {place.website && (
                <Typography>
                  <Link to={place.website}>Visit their website</Link>
                </Typography>
              )}
              {place.openHours && (
                <Typography color="text.secondary" variant="body2">
                  <FormControl sx={{ m: 1, minWidth: 120 }} variant="standard">
                    <InputLabel id="choice-hours-label">Hours</InputLabel>
                    <Select
                      id="choice-hours-select"
                      label="Hours"
                      labelId="choice-hours-label"
                      value={place.openHours[(new Date().getDay() + 6) % 7]}
                    >
                      {place.openHours.map((hours, index) => (
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
          <BottomNavigation onChange={onDecision} showLabels>
            <BottomNavigationAction icon={<CheckIcon />} label="Sounds good" />
            <BottomNavigationAction icon={<DoNotDisturbIcon />} label="Maybe later" />
          </BottomNavigation>
        </Card>
      )}
    </Stack>
  )
}

export default Deciding
