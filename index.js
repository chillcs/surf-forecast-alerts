require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// DAYS OUT COLUMN TO SCRAPE FROM ---
const daysOut = 7;

// // TIME OF DAY THE PROGRAM RUNS AT (IN 24HR TIME) ---
// const startTime = "1015";

// IDEAL SURF CONDITIONS ---
let swellHeightMin = 1;
let swellHeightMax = 2.5;
let swellPeriodMin = 12;
let swellPeriodMax = 21;
let swellDirections = ["S", "SSW", "SW"];
let windSpeedMaxOnShore = 5;
let windSpeedMaxOffShore = 20;
let windDirections = ["N", "NNE", "NE", "E", "ESE", "SE"];

let swellPeriodMinLongPeriod = 17;
let swellHeightMinLongPeriod = 0.5;
let swellHeightMaxLongPeriod = 2.0;

// SCRAPER FUNCTION ---
function runProgram() {
  // console.log(
  //   `Program ran at ${startTime.slice(0, 2).padStart(2, "0")}:${startTime
  //     .slice(2)
  //     .padStart(2, "0")}`
  // );
  console.log("Running program...");
  axios
    .get(
      "https://www.surf-forecast.com/breaks/Long-Beach_6/forecasts/latest/six_day",
      {
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        },
      }
    )
    .then((response) => {
      const $ = cheerio.load(response.data);

      // EXTRACTS AND STORES THE DATA ---
      function extractFloatValue(selector) {
        return parseFloat($(selector).text());
      }
      function extractStringValue(selector) {
        return $(selector).text();
      }
      const columnNumber = daysOut * 3 + 3;
      let swellHeight = extractFloatValue(
        `#forecast-table > div > table > tbody > tr:nth-child(5) > td:nth-child(${columnNumber}) > div > svg > text`
      );
      let swellDirection = extractStringValue(
        `#forecast-table > div > table > tbody > tr:nth-child(5) > td:nth-child(${columnNumber}) > div > div`
      );
      let swellPeriod = extractFloatValue(
        `#forecast-table > div > table > tbody > tr:nth-child(6) > td:nth-child(${columnNumber}) > strong`
      );
      let windSpeed = extractFloatValue(
        `#forecast-table > div > table > tbody > tr:nth-child(9) > td:nth-child(${columnNumber}) > div > svg > text`
      );
      let windDirection = extractStringValue(
        `#forecast-table > div > table > tbody > tr:nth-child(9) > td:nth-child(${columnNumber}) > div > div`
      );
      let weatherForecast = extractStringValue(
        `#forecast-table > div > table > tfoot > tr:nth-child(4) > td:nth-child(${columnNumber})`
      );
      let weatherTemp = extractStringValue(
        `#forecast-table > div > table > tfoot > tr:nth-child(6) > td:nth-child(${columnNumber}) > span`
      );

      // BUILDS THE HTML SURF REPORT ---
      const today = new Date();
      const reportDate = new Date(
        today.getTime() + daysOut * 24 * 60 * 60 * 1000
      );
      const formattedReportDate = reportDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      function getSurfConditionHTML(
        swellHeight,
        swellDirection,
        swellPeriod,
        windSpeed,
        windDirection,
        weatherForecast,
        weatherTemp
      ) {
        return `
    <p>Surf report for ${formattedReportDate}:</p>
    <ul>
      <li>Swell Height: ${swellHeight}m</li>
      <li>Swell Direction: ${swellDirection}</li>
      <li>Swell Period: ${swellPeriod}s</li>
      <li>Wind Speed: ${windSpeed}km</li>
      <li>Wind Direction: ${windDirection}</li>
      <li>Forecast: ${weatherForecast
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")}</li>
      <li>Temperature: ${weatherTemp}°C</li>
    </ul>
  `;
      }
      const surfConditionHTML = getSurfConditionHTML(
        swellHeight,
        swellDirection,
        swellPeriod,
        windSpeed,
        windDirection,
        weatherForecast,
        weatherTemp
      );
      console.log(
        `Surf Report:\nSwell Height: ${swellHeight}m\nSwell Direction: ${swellDirection}\nSwell Period: ${swellPeriod}s\nWind Speed: ${windSpeed}km\nWind Direction: ${windDirection}\nWeather: ${weatherForecast
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")}\nTemperature: ${weatherTemp}°C`
      );

      // CHECKS IF SURF CONDITIONS ARE IDEAL ---
      function checkSurfConditions() {
        if (swellPeriod >= swellPeriodMinLongPeriod) {
          swellHeightMin = swellHeightMinLongPeriod;
          swellHeightMax = swellHeightMaxLongPeriod;
        }
        if (
          swellHeight >= swellHeightMin &&
          swellHeight <= swellHeightMax &&
          swellDirections.includes(swellDirection) &&
          swellPeriod >= swellPeriodMin &&
          swellPeriod <= swellPeriodMax &&
          windSpeed <=
            (windDirections.includes(windDirection)
              ? windSpeedMaxOffShore
              : windSpeedMaxOnShore)
        ) {
          return true;
        } else {
          return false;
        }
      }

      // SENDGRID EMAIL ALERT RECIPIENT AND MESSAGE ---
      if (checkSurfConditions()) {
        // CONDITIONS ARE IDEAL ---
        console.log("Forecast is looking awesome!");
        const msg = {
          to: "curtis90h@gmail.com",
          from: {
            email: "curtis@cstudio.ca",
            name: "cStudio Bot",
          },
          subject: "Surf forecast alert!",
          html: `
        <p>Hi Curtis!</p>
        <p>You might want to book some time off..</p>
        ${surfConditionHTML}
        <p>Best,</p>
        <p>cStudio Bot</p>
      `,
        };
        sgMail
          .send(msg)
          .then(() => {
            console.log("Notification sent to Curtis");
          })
          .catch((error) => {
            console.error(error);
          });
      } else {
        // CONDITIONS ARE NOT IDEAL ---
        console.log("Forecast is not looking great..");
        const msg = {
          to: "curtis90h@gmail.com",
          from: {
            email: "curtis@cstudio.ca",
            name: "cStudio Bot",
          },
          subject: "Surf forecast is not looking great..",
          html: `
        <p>Hi Curtis,</p>
        <p>You might want to stay in..</p>
        ${surfConditionHTML}
        <p>Best,</p>
        <p>cStudio Bot</p>
      `,
        };
        sgMail
          .send(msg)
          .then(() => {
            console.log("Notification sent to Curtis");
          })
          .catch((error) => {
            console.error(error);
          });
      }
    })
    .catch((error) => {
      console.log(error);
    });
}

runProgram();

// // SCHEDULES PROGRAM TO RUN EVERY 24 HRS ---
// const hour = parseInt(startTime.slice(0, 2), 10);
// const minute = parseInt(startTime.slice(2), 10);
// function scheduleProgram() {
//   const now = new Date();
//   const scheduledTime = new Date(
//     now.getFullYear(),
//     now.getMonth(),
//     now.getDate(),
//     hour,
//     minute,
//     0
//   );
//   let delay = scheduledTime.getTime() - now.getTime();
//   if (delay < 0) {
//     delay += 86400000;
//   }
//   setTimeout(() => {
//     runProgram();
//     setInterval(runProgram, 86400000);
//   }, delay);
// }
// scheduleProgram();
