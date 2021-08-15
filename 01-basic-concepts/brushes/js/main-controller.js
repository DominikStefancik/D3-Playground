/*
 *  Main controller responsible for the loading data, setting up input controls (selectboxes, slider, ...)
 *  and reacting to user actions (time interval change, selection change, ...).
 *  It triggers updates on the line charts every time a user changes data.
 */

const cleanData = {};
let minDate;
let maxDate;
let lineChart;
let timeline;

// "%d/%m/%Y" - interpret string as "day/month/year"
const parseTime = d3.timeParse("%d/%m/%Y");
// for formatting date as a string in the format "day/month/year"
const formatTime = d3.timeFormat("%d/%m/%Y");

$("#coin-select").on("change", function () {
  const value = $(this).val();

  initializeSlider(cleanData, value);
  lineChart.setCoin(value);
  timeline.setCoin(value);
  updateCharts();
});

$("#var-select").on("change", () => updateCharts());

const onSlide = (ui) => {
  minDate = new Date(ui.values[0]);
  maxDate = new Date(ui.values[1]);

  $("#minDateLabel").text(formatTime(minDate));
  $("#maxDateLabel").text(formatTime(maxDate));

  // when moving slider also update the brush size
  // we call the "move" event on the group the brush is attached to
  timeline.brushComponent.call(timeline.brush.move, [
    // we have to pass the set of values which should match the pixel positions the brush selections should run between
    timeline.xScale(minDate),
    timeline.xScale(maxDate),
  ]);

  lineChart.updateData();
};

const initializeSlider = (data, coinSelectValue) => {
  const selectedCoinData = data[coinSelectValue];
  minDate = d3.min(selectedCoinData, (data) => data.date);
  maxDate = d3.max(selectedCoinData, (data) => data.date);
  const minDateTime = minDate.getTime();
  const maxDateTime = maxDate.getTime();

  // remove previously rendered slider
  $("#selector").slider("destroy");

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
  lineChart.updateData();
  timeline.updateData();
  // when changing the charts for different coin or variable, remove brush
  // because we changing the slider interval to maximum
  timeline.brushComponent.call(timeline.brush.clear);
};

const brushMoveHadler = (event) => {
  // if the "d3.event.selection" is empty, it means a user clicked outside of the brush area
  // then the selection will be the whole xScale
  const selection = event.selection || timeline.xScale.range();
  // "timeline.xScale.invert" returns the date values the selection points to
  const newValues = selection.map(timeline.xScale.invert);
  minDate = newValues[0];
  maxDate = newValues[1];

  $("#date-slider").slider("values", 0, minDate).slider("values", 1, maxDate);
  $("#minDateLabel").text(formatTime(minDate));
  $("#maxDateLabel").text(formatTime(maxDate));

  lineChart.updateData();
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
  const coinSelectValue = $("#coin-select").val();
  initializeSlider(cleanData, coinSelectValue);

  lineChart = new LineChart(
    "#chart-area",
    {
      canvasWidth: 1200,
      canvasHeight: 550,
      margin: { left: 75, right: 100, top: 50, bottom: 100 },
      labelFontSize: 20,
      fontStyle: "Courier",
    },
    cleanData,
    coinSelectValue
  );
  timeline = new Timeline(
    "#timeline-area",
    {
      canvasWidth: 1200,
      canvasHeight: 150,
      margin: { left: 75, right: 100, top: 0, bottom: 20 },
    },
    cleanData,
    coinSelectValue
  );
})();
