const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const cron = require('node-cron');

let swellHeightMin = 1;
let swellHeightMax = 2.5;
let swellDirections = ['S', 'SSW', 'SW'];
let swellPeriodMin = 12;
let swellPeriodMax = 20;
let windSpeedMin = 0;
let windSpeedMax = 25;
let windDirections = ['N', 'NNE', 'NE', 'E', 'ESE', 'SE'];

cron.schedule('0 9-12 * * *', () => {
  console.log('Running every day at 9am, 10am, 11am and 12pm');
  axios.get('https://www.surf-forecast.com/breaks/Long-Beach_6/forecasts/latest/six_day', {
  headers: {
    Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`
  },
})
  .then((response) => {
    const $ = cheerio.load(response.data);
    let swellHeight = parseFloat($('#forecast-table > div > table > tbody > tr:nth-child(5) > td:nth-child(24) > div > svg > text').text());
    let swellDirection = $('#forecast-table > div > table > tbody > tr:nth-child(5) > td:nth-child(24) > div > div').text();
    let swellPeriod = parseFloat($('#forecast-table > div > table > tbody > tr:nth-child(6) > td:nth-child(24) > strong').text());
    let windSpeed = parseFloat($('#forecast-table > div > table > tbody > tr:nth-child(9) > td:nth-child(24) > div > svg > text').text());
    let windDirection = $('#forecast-table > div > table > tbody > tr:nth-child(9) > td:nth-child(24) > div > div').text();
    let weatherConditions = $('#forecast-table > div > table > tfoot > tr:nth-child(4) > td:nth-child(24)').text();
    let weatherTemp = $('#forecast-table > div > table > tfoot > tr:nth-child(6) > td:nth-child(24) > span').text();
    
    if (
      swellHeight >= swellHeightMin && swellHeight <= swellHeightMax &&
      swellDirections.includes(swellDirection) &&
      swellPeriod >= swellPeriodMin && swellPeriod <= swellPeriodMax &&
      windSpeed >= windSpeedMin && windSpeed <= windSpeedMax &&
      (windSpeed >= 5 || windDirections.includes(windDirection))
    ) {
      console.log("Conditions are perfect!");
      console.log(`Swell Height: ${swellHeight}m\nSwell Direction: ${swellDirection}\nSwell Period: ${swellPeriod}s\nWind Speed: ${windSpeed}km\nWind Direction: ${windDirection}\nWeather: ${weatherConditions.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}\nTemperature: ${weatherTemp}°C`)
      const msg = {
        to: 'curtis90h@gmail.com',
        from: 'curtis@cstudio.ca',
        subject: 'Conditions are perfect!',
        text: 'Surf conditions are looking good next week!',
        html: `
          <p>Hi Curtis!</p>
          <p>You might want to book some time off next week..</p>
          <p>Here is the forecast for Long Beach:</p>
          <ul>
            <li>Swell Height: ${swellHeight}m</li>
            <li>Swell Direction: ${swellDirection}</li>
            <li>Swell Period: ${swellPeriod}s</li>
            <li>Wind Speed: ${windSpeed}km</li>
            <li>Wind Direction: ${windDirection}</li>
            <li>Weather: ${weatherConditions.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}</li>
            <li>Temperature: ${weatherTemp}°C</li>
          </ul>
          <p>Best,</p>
          <p>cStudio Bot</p>
        `,
      }
      sgMail
        .send(msg)
        .then(() => {
          console.log('Notification sent to Curtis!')
        })
        .catch((error) => {
          console.error(error)
        })
    } else {
      console.log("Conditions are not great...");
      console.log(`Swell Height: ${swellHeight}m\nSwell Direction: ${swellDirection}\nSwell Period: ${swellPeriod}s\nWind Speed: ${windSpeed}km\nWind Direction: ${windDirection}\nWeather: ${weatherConditions.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}\nTemperature: ${weatherTemp}°C`)
      const msg = {
        to: 'curtis90h@gmail.com',
        from: 'curtis@cstudio.ca',
        subject: 'Conditions are not great..',
        text: 'Surf conditions are not looking good next week..',
        html: `
          <p>Hi Curtis,</p>
          <p>You might want to stay in and work next week..</p>
          <p>Here is the forecast for Long Beach:</p>
          <ul>
            <li>Swell Height: ${swellHeight}m</li>
            <li>Swell Direction: ${swellDirection}</li>
            <li>Swell Period: ${swellPeriod}s</li>
            <li>Wind Speed: ${windSpeed}km</li>
            <li>Wind Direction: ${windDirection}</li>
            <li>Weather: ${weatherConditions.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}</li>
            <li>Temperature: ${weatherTemp}°C</li>
          </ul>
          <p>Best,</p>
          <p>cStudio Bot</p>
        `,
      }
      sgMail
        .send(msg)
        .then(() => {
          console.log('Notification sent to Curtis!')
        })
        .catch((error) => {
          console.error(error)
        })
    }

  })
  .catch((error) => {
    console.log(error);
  });

});