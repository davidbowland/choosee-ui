import { Link, navigate } from 'gatsby'
import React from 'react'

import CheckBoxIcon from '@mui/icons-material/CheckBox'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Rating from '@mui/material/Rating'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { PlaceDetails } from '@types'

export interface WinnerProps {
  winner: PlaceDetails
}

const Winner = ({ winner }: WinnerProps): JSX.Element => {
  return (
    <Stack margin="auto" maxWidth="600px" spacing={2}>
      <Typography sx={{ textAlign: 'center' }} variant="h5">
        The winning decision is:
      </Typography>
      <Card sx={{ margin: 'auto', maxWidth: 600 }}>
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
            {winner.formattedPriceLevel !== undefined && (
              <Tooltip arrow title={winner.formattedPriceLevel.label}>
                <Rating
                  emptyIcon={<MonetizationOnOutlinedIcon fontSize="inherit" />}
                  icon={<MonetizationOnIcon fontSize="inherit" />}
                  max={4}
                  precision={0.5}
                  readOnly
                  sx={{ '& .MuiRating-iconFilled': { color: '#d4af37' } }}
                  value={winner.formattedPriceLevel.rating}
                />
              </Tooltip>
            )}
            {winner.rating !== undefined && (
              <Tooltip arrow title={`${winner.rating} heart${winner.rating === 1 ? '' : 's'}`}>
                <Rating
                  defaultValue={winner.rating}
                  emptyIcon={<FavoriteBorderIcon fontSize="inherit" />}
                  icon={<FavoriteIcon fontSize="inherit" />}
                  precision={0.5}
                  readOnly
                  sx={{ '& .MuiRating-iconFilled': { color: '#ff6d75' } }}
                  value={winner.rating}
                />
              </Tooltip>
            )}
            {winner.website && (
              <Typography>
                <Link target="_blank" to={winner.website}>
                  Visit their website
                </Link>
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
        startIcon={<CheckBoxIcon />}
        variant="contained"
      >
        Make new choices
      </Button>
    </Stack>
  )
}

export default Winner
