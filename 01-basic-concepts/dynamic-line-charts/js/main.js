/////////////////////////////////////////////////////////////////////////
////////////////////// SETTING UP THE VISUALISATION /////////////////////
/////////////////////////////////////////////////////////////////////////

const MARGIN = { LEFT: 75, RIGHT: 100, TOP: 50, BOTTOM: 100 };
const WIDTH = 1200 - MARGIN.LEFT - MARGIN.RIGHT;
const HEIGHT = 750 - MARGIN.TOP - MARGIN.BOTTOM;
const AXIS_LABEL_FONT_SIZE = 20;
const FONT_STYLE = "Courier";
const cleanData = {};

const svg = d3
  .select("#chart-area")
  .append("svg")
  .attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
  .attr("height", HEIGHT + MARGIN.TOP + MARGIN.BOTTOM);

const group = svg
  .append("g")
  .attr("transform", `translate(${MARGIN.LEFT}, ${MARGIN.TOP})`);

// time parser for x-scale
// d3.timeParse() returns a function which returns a Date object from the given data
// it can be called d3.timeParse("data_format")(data)
// "%d/%m/%Y" - interpret string as "day/month/year"
const parseTime = d3.timeParse("%d/%m/%Y");

// scales
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

// axis generators
const xAxisCall = d3.axisBottom().ticks(d3.timeMonth.every(6)); // generate ticks for each 6 months
const yAxisCall = d3
  .axisLeft()
  .ticks(6)
  .tickFormat((data) => formatAbbreviation(data));

// line path generator which expects to be given an array of data
// for each element in the array it's described how to interpret that data point as an X and Y coordinate
// the scales are used to return the pixel values of the data
const line = d3.line();

//////////////////////////////////////////////////////////////////
////////////////////// CREATING SVG ELEMENTS /////////////////////
//////////////////////////////////////////////////////////////////

// axis groups
const xAxis = group
  .append("g")
  .attr("class", "x axis")
  .attr("transform", `translate(0, ${HEIGHT})`);
const yAxis = group.append("g").attr("class", "y axis");

// y-axis inner label
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
  .text("Year")
  .attr("x", WIDTH / 2)
  .attr("y", HEIGHT + 50)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle");

// y-axis outer label
const outerLabel = group
  .append("text")
  .attr("x", -HEIGHT / 2)
  .attr("y", -MARGIN.LEFT + 20)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)");

// add line to the chart at the very beginning
// for a line chart because we are only appendiing one SVG path element we don't have to worry about D3 Update pattern
// we don't have to worry about UPDATE and EXIT phases, because we are only adding one line
group
  .append("path")
  // the class attribute has to be provided, so we can later grab the line and update its shape
  .attr("class", "line")
  .attr("fill", "none")
  .attr("stroke", "grey")
  .attr("stroke-width", "3px");

$("#coin-select").on("change", () => {
  updateChart(cleanData);
});

$("#var-select").on("change", () => {
  updateChart(cleanData);
});

///////////////////////////////////////////////////////////////////////
////////////////////// UPDATING THE VISUALISATION /////////////////////
///////////////////////////////////////////////////////////////////////

const updateChart = (data) => {
  const coinSelectValue = $("#coin-select").val();
  const varSelectValue = $("#var-select").val();

  const selectedCoinData = data[coinSelectValue];

  // set scale domains
  xScale.domain(d3.extent(selectedCoinData, (data) => data.date));
  yScale.domain([
    d3.min(selectedCoinData, (data) => data[varSelectValue]) / 1.005,
    d3.max(selectedCoinData, (data) => data[varSelectValue]) * 1.005,
  ]);

  // set the transition
  const transition = d3.transition().duration(3000);

  // generate axes once scales have been set
  xAxis.transition(transition).call(xAxisCall.scale(xScale));
  yAxis.transition(transition).call(yAxisCall.scale(yScale));

  // set the data according to which the line generator will draw the line
  line.x((data) => xScale(data.date)).y((data) => yScale(data[varSelectValue]));

  // redraw the line
  // we have to specify the CSS class of the line because d3.selectAll("path") would select axes as well
  d3.selectAll("path.line")
    .transition(transition)
    // "line()" function returns a string value for the "d" attribute of the SVG path element
    // the end result will be that the browser will draw different parts of the line between the coordinates
    .attr("d", line(selectedCoinData));

  // update outer label of y-axis
  outerLabel.text($("#var-select option:selected").text());
};

/////////////////////////////////////////////////////////////
////////////////////// LOADING THE DATA /////////////////////
/////////////////////////////////////////////////////////////

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

  updateChart(cleanData);
})();
