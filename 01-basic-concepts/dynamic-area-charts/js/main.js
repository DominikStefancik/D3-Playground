/////////////////////////////////////////////////////////////////////////
////////////////////// SETTING UP THE VISUALISATION /////////////////////
/////////////////////////////////////////////////////////////////////////

const MARGIN = { LEFT: 75, RIGHT: 100, TOP: 50, BOTTOM: 100 };
const WIDTH = 1200 - MARGIN.LEFT - MARGIN.RIGHT;
const HEIGHT = 750 - MARGIN.TOP - MARGIN.BOTTOM;
const AXIS_LABEL_FONT_SIZE = 20;
const FONT_STYLE = "Georgia";
let loadedData;

const svg = d3
  .select("#chart-area")
  .append("svg")
  .attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
  .attr("height", HEIGHT + MARGIN.TOP + MARGIN.BOTTOM);

const group = svg
  .append("g")
  .attr("transform", `translate(${MARGIN.LEFT}, ${MARGIN.TOP})`);

// scales
// time scale expects a domain of DATE objects (not date as a string)
const xScale = d3.scaleTime().range([0, WIDTH]);
const yScale = d3.scaleLinear().range([HEIGHT, 0]);
// set the colour scale to the scheme of 11 distinguishable colours
const colourScale = d3.scaleOrdinal(d3.schemeSpectral[11]);

// axis generators
const xAxisCall = d3.axisBottom().ticks(d3.timeYear.every(5));
const yAxisCall = d3.axisLeft().tickFormat((data) => d3.format(".2f")(data));

// area path generator which expects to be given an array of data
// for each element in the array it's described how to interpret that data point as an X and Y coordinate
// the scales are used to return the pixel values of the data
const area = d3.area();

//////////////////////////////////////////////////////////////////
////////////////////// CREATING SVG ELEMENTS /////////////////////
//////////////////////////////////////////////////////////////////

// axis groups
const xAxis = group
  .append("g")
  .attr("class", "x axis")
  .attr("transform", `translate(0, ${HEIGHT})`);
const yAxis = group.append("g").attr("class", "y axis");

group
  .append("text")
  .text("Year")
  .attr("x", WIDTH / 2)
  .attr("y", HEIGHT + 50)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle");

group
  .append("text")
  .text("Population growth (%)")
  .attr("x", -HEIGHT / 2)
  .attr("y", -MARGIN.LEFT + 20)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)");

// add area to the chart at the very beginning
// for the area chart because we are only appending one SVG path element we don't have to worry about D3 Update pattern
// we don't have to worry about UPDATE and EXIT phases, because we are only adding one area
group
  .append("path")
  // the class attribute has to be provided, so we can later grab the area and update its shape
  .attr("class", "area")
  .attr("stroke", "grey")
  .attr("stroke-width", "3px");

$("#country-select").on("change", function () {
  const value = $(this).val();
  updateChart(loadedData[value]);
});

const getDate = (year) => {
  return new Date(`${year}-01-01`);
};

///////////////////////////////////////////////////////////////////////
////////////////////// UPDATING THE VISUALISATION /////////////////////
///////////////////////////////////////////////////////////////////////

const updateChart = (selectedCountryData) => {
  const chartData = Object.keys(selectedCountryData).map((key) => ({
    year: getDate(key),
    percentage: selectedCountryData[key],
  }));
  // remove the last key which is always "country"
  chartData.pop();

  // set scale domains
  xScale.domain(d3.extent(chartData, (data) => getDate(data.year)));
  yScale.domain([
    d3.min(chartData, (data) => data.percentage) / 1.005,
    d3.max(chartData, (data) => data.percentage) * 1.005,
  ]);

  // set the transition
  const transition = d3.transition().duration(3000);

  // generate axes once scales have been set
  xAxis
    .transition(transition)
    .call(xAxisCall.scale(xScale))
    .selectAll("text")
    .attr("font-family", FONT_STYLE);
  yAxis
    .transition(transition)
    .call(yAxisCall.scale(yScale))
    .selectAll("text")
    .attr("font-family", FONT_STYLE);

  // set the data according to which the are generator will draw the area
  area
    .x((chartData) => xScale(chartData.year))
    // for the area generator we have to provide two vertical lines,
    // "y0" for the bottom of the area
    .y0(yScale(d3.min(chartData, (data) => data.percentage)))
    // "y1" for the top of the area
    .y1((chartData) => yScale(chartData.percentage));

  // redraw the area
  // we have to specify the CSS class of the area because d3.selectAll("path") would select axis as well
  d3.selectAll("path.area")
    // we are passing the whole data as an array
    // this approach is useful when we want to show more areas in the chart
    // in that case the whole data would be as an array of arrays and we would provide only one array of this data
    .datum(chartData)
    .transition(transition)
    .attr("fill", colourScale(selectedCountryData.country))
    // then we pass ONLY the reference to the area generator which takes the data passed in the "datum" function
    .attr("d", area);
};

/////////////////////////////////////////////////////////////
////////////////////// LOADING THE DATA /////////////////////
/////////////////////////////////////////////////////////////

(async () => {
  const transformData = (data) => {
    // argument "data" represents a row in the file

    Object.keys(data).forEach((key) => {
      if (key !== "country") {
        // transform all string numerical values to numbers
        data[key] = Number(data[key]);
      }
    });

    return data;
  };

  // a second argument is a function which does a data transformation after the data is loaded from a file
  loadedData = await d3.csv(
    "data/population_growth_annual_percent.csv",
    transformData
  );

  const countries = loadedData.map((row) => row.country);

  // populate selectbox with the list of countries
  const select = $("#country-select");
  $.each(countries, (index, country) => {
    select.append(`<option value="${index}">${country}</option>`);
  });

  // at the beginning show the chart for the first country in the list
  updateChart(loadedData[0]);
})();
