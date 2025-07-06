import { Link } from 'gatsby'
import React, { useRef } from 'react'
import Carousel from 'react-material-ui-carousel'

import CheckIcon from '@mui/icons-material/Check'
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import NativeSelect from '@mui/material/NativeSelect'
import Rating from '@mui/material/Rating'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { PlaceDetails } from '@types'

export interface DecidingProps {
  address: string
  makeChoice: (name: string, value: boolean) => void
  place: PlaceDetails
}

const Deciding = ({ address, place, makeChoice }: DecidingProps): JSX.Element => {
  const cardRef = useRef<HTMLDivElement>(null)

  const onDecision = (_: unknown, value: number) => {
    makeChoice(place.name, value === 0)
    cardRef.current && cardRef.current.scrollIntoView()
  }

  return (
    <Stack spacing={2} sx={{ m: 'auto', maxWidth: 600, width: '100%' }}>
      <Box>
        {place && (
          <Card ref={cardRef}>
            {place.photos.length > 0 ? (
              <Carousel key={place.name}>
                {place.photos.map((photo, index) => (
                  <CardMedia
                    alt={`Photo of ${place.name}`}
                    component="img"
                    height="300"
                    image={photo}
                    key={`${index}`}
                    referrerPolicy="no-referrer"
                  />
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
                {place.formattedPriceLevel !== undefined && (
                  <Tooltip arrow title={place.formattedPriceLevel.label}>
                    <Rating
                      emptyIcon={<MonetizationOnOutlinedIcon fontSize="inherit" />}
                      icon={<MonetizationOnIcon fontSize="inherit" />}
                      max={4}
                      precision={0.5}
                      readOnly
                      sx={{ '& .MuiRating-iconFilled': { color: '#d4af37' } }}
                      value={place.formattedPriceLevel.rating}
                    />
                  </Tooltip>
                )}
                {place.rating !== undefined && (
                  <>
                    <div>
                      <Tooltip arrow title={`${place.rating} heart${place.rating === 1 ? '' : 's'}`}>
                        <Rating
                          defaultValue={place.rating}
                          emptyIcon={<FavoriteBorderIcon fontSize="inherit" />}
                          icon={<FavoriteIcon fontSize="inherit" />}
                          precision={0.5}
                          readOnly
                          sx={{ '& .MuiRating-iconFilled': { color: '#ff6d75' } }}
                          value={place.rating}
                        />
                      </Tooltip>
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
                    <Link target="_blank" to={place.website}>
                      Visit their website
                    </Link>
                  </Typography>
                )}
                {place.openHours && (
                  <Typography color="text.secondary" variant="body2">
                    <FormControl sx={{ m: 1, maxWidth: '95%' }} variant="standard">
                      <InputLabel id="choice-hours-label">Hours</InputLabel>
                      <NativeSelect
                        aria-labelledby="choice-hours-label"
                        id="choice-hours-select"
                        sx={{ maxWidth: '95%' }}
                        value={place.openHours[(new Date().getDay() + 6) % 7]}
                      >
                        {place.openHours.map((hours, index) => (
                          <option key={index} value={hours}>
                            {hours}
                          </option>
                        ))}
                      </NativeSelect>
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
      </Box>
      <Box>
        <Typography component="div" sx={{ textAlign: 'center' }} variant="caption">
          Showing choices near {address}
        </Typography>
      </Box>
    </Stack>
  )
}

export default Deciding
