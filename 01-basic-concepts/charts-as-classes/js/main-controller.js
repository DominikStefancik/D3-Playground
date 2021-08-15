/*
 *  Main controller responsible for the loading data, setting up input controls (selectbox, slider, ...)
 *  and reacting to user actions (time interval change, selection change, ...).
 *  It triggers updates on the line charts every time a user changes data.
 */

const cleanData = {};
let minDate;
let maxDate;
let lineChart1;
let lineChart2;
let lineChart3;
let lineChart4;
let lineChart5;

// "%d/%m/%Y" - interpret string as "day/month/year"
const parseTime = d3.timeParse("%d/%m/%Y");
// for formatting date as a string in the format "day/month/year"
const formatTime = d3.timeFormat("%d/%m/%Y");

$("#var-select").on("change", () => {
  updateCharts();
});

const onSlide = (ui) => {
  minDate = new Date(ui.values[0]);
  maxDate = new Date(ui.values[1]);

  $("#minDateLabel").text(formatTime(minDate));
  $("#maxDateLabel").text(formatTime(maxDate));

  updateCharts();
};

const initializeSlider = () => {
  // we know from data what the minimum and maximum date is
  // this will be set for all charts, even though some of them have null values for first days in the timelime
  minDate = parseTime("12/5/2013");
  maxDate = parseTime("30/10/2017");
  const minDateTime = minDate.getTime();
  const maxDateTime = maxDate.getTime();

  $("#date-slider").slider({
    range: true,
    min: minDateTime,
    max: maxDateTime,
    step: 86400000, // one day
    values: [minDateTime, maxDateTime],
    // event handler for sliding
    slide: (event, ui) => onSlide(ui),
  });

  $("#minDateLabel").text(formatTime(minDate));
  $("#maxDateLabel").text(formatTime(maxDate));
};

const updateCharts = () => {
  lineChart1.updateData();
  lineChart2.updateData();
  lineChart3.updateData();
  lineChart4.updateData();
  lineChart5.updateData();
};

(async () => {
  const loadedData = await d3.json("data/coins.json");

  // clean data of null values + convert strings into dates and numbers
  Object.keys(loadedData).forEach((key) => {
    let coinData = loadedData[key];

    coinData = coinData
      .filter(
        (dailyData) =>
          dailyData["24h_vol"] && dailyData.market_cap && dailyData.price_usd
      )
      .map((dailyData) => {
        // data.date will become a Date object
        dailyData.date = parseTime(dailyData.date);
        dailyData["24h_vol"] = Number(dailyData["24h_vol"]);
        dailyData.market_cap = Number(dailyData.market_cap);
        dailyData.price_usd = Number(dailyData.price_usd);

        return dailyData;
      });

    cleanData[key] = coinData;
  });

  // initialize chart and slider at the very beginning
  initializeSlider();

  const chartSettings = {
    canvasWidth: 370,
    canvasHeight: 350,
    margin: { left: 35, right: 20, top: 50, bottom: 100 },
    labelFontSize: 15,
    fontStyle: "Courier",
  };

  // create an instance of the line chart for each coin
  lineChart1 = new LineChart(
    "#chart-area1",
    { ...chartSettings, coinName: "Bitcoin", coinClass: "bitcoin" },
    cleanData["bitcoin"]
  );
  lineChart2 = new LineChart(
    "#chart-area2",
    { ...chartSettings, coinName: "Ethereum", coinClass: "ethereum" },
    cleanData["ethereum"]
  );
  lineChart3 = new LineChart(
    "#chart-area3",
    { ...chartSettings, coinName: "Bitcoin Cash", coinClass: "bitcoin_cash" },
    cleanData["bitcoin_cash"]
  );
  lineChart4 = new LineChart(
    "#chart-area4",
    { ...chartSettings, coinName: "Litecoin", coinClass: "litecoin" },
    cleanData["litecoin"]
  );
  lineChart5 = new LineChart(
    "#chart-area5",
    { ...chartSettings, coinName: "Ripple", coinClass: "ripple" },
    cleanData["ripple"]
  );
})();
