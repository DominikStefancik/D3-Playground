const MARGIN = { LEFT: 75, RIGHT: 100, TOP: 50, BOTTOM: 100 };
const WIDTH = 1200 - MARGIN.LEFT - MARGIN.RIGHT;
const HEIGHT = 750 - MARGIN.TOP - MARGIN.BOTTOM;
const AXIS_LABEL_FONT_SIZE = 20;
const FONT_STYLE = "Courier";
const cleanData = {};

let minDate;
let maxDate;

const svg = d3
  .select("#chart-area")
  .append("svg")
  .attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
  .attr("height", HEIGHT + MARGIN.TOP + MARGIN.BOTTOM);

const group = svg
  .append("g")
  .attr("transform", `translate(${MARGIN.LEFT}, ${MARGIN.TOP})`);

// "%d/%m/%Y" - interpret string as "day/month/year"
const parseTime = d3.timeParse("%d/%m/%Y");
// for formatting date as a string in the format "day/month/year"
const formatTime = d3.timeFormat("%d/%m/%Y");

const xScale = d3.scaleTime().range([0, WIDTH]);
const yScale = d3.scaleLinear().range([HEIGHT, 0]);

// helper function for formatting ticks on y-axis
const formatSi = d3.format(".2s");
const formatAbbreviation = (data) => {
  const string = formatSi(data);
  switch (string[string.length - 1]) {
    case "G":
      return string.slice(0, -1) + "B";
    case "k":
      return string.slice(0, -1) + "K";
  }
  return string;
};

const xAxisCall = d3.axisBottom().ticks(d3.timeMonth.every(6));
const yAxisCall = d3
  .axisLeft()
  .ticks(6)
  .tickFormat((data) => formatAbbreviation(data));

const line = d3.line();

const xAxis = group
  .append("g")
  .attr("class", "x axis")
  .attr("transform", `translate(0, ${HEIGHT})`);
const yAxis = group.append("g").attr("class", "y axis");

yAxis
  .append("text")
  .text("Population")
  .attr("class", "axis-title")
  .attr("transform", "rotate(-90)")
  .attr("y", 6)
  .attr("dy", ".71em")
  .style("text-anchor", "end")
  .attr("fill", "#5D6971");

group
  .append("text")
  .text("Time")
  .attr("x", WIDTH / 2)
  .attr("y", HEIGHT + 50)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle");

const outerLabel = group
  .append("text")
  .attr("x", -HEIGHT / 2)
  .attr("y", -MARGIN.LEFT + 20)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)");

group
  .append("path")
  .attr("class", "line")
  .attr("fill", "none")
  .attr("stroke", "grey")
  .attr("stroke-width", "3px");

$("#coin-select").on("change", function () {
  const value = $(this).val();

  initializeSlider(cleanData, value);
  updateChart(cleanData);
});

$("#var-select").on("change", () => {
  updateChart(cleanData);
});

const onSlide = (ui) => {
  minDate = new Date(ui.values[0]);
  maxDate = new Date(ui.values[1]);

  $("#minDateLabel").text(formatTime(minDate));
  $("#maxDateLabel").text(formatTime(maxDate));

  updateChart(cleanData);
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

const bisectDate = d3.bisector((data) => data.date).left;

const updateChart = (data) => {
  const coinSelectValue = $("#coin-select").val();
  const varSelectValue = $("#var-select").val();

  const selectedCoinData = data[coinSelectValue];

  // filter data from selected time period
  const filteredData = selectedCoinData.filter(
    (data) => data.date >= minDate && data.date <= maxDate
  );

  xScale.domain([minDate, maxDate]);
  yScale.domain([
    d3.min(filteredData, (data) => data[varSelectValue]) / 1.005,
    d3.max(filteredData, (data) => data[varSelectValue]) * 1.005,
  ]);

  const transition = d3.transition().duration(3000);

  xAxis.transition(transition).call(xAxisCall.scale(xScale));
  yAxis.transition(transition).call(yAxisCall.scale(yScale));

  line.x((data) => xScale(data.date)).y((data) => yScale(data[varSelectValue]));

  d3.selectAll("path.line")
    .transition(transition)
    .attr("d", line(filteredData));

  createTooltip({
    parentGroup: group,
    data: filteredData,
    yParameter: varSelectValue,
    height: HEIGHT,
    width: WIDTH,
    xScale,
    yScale,
    bisectDate,
  });

  outerLabel.text($("#var-select option:selected").text() + " ($)");
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
  updateChart(cleanData);
})();
