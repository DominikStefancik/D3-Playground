/////////////////////////////////////////////////////////////////////////
////////////////////// SETTING UP THE VISUALISATION /////////////////////
/////////////////////////////////////////////////////////////////////////

const MARGIN = { LEFT: 90, RIGHT: 100, TOP: 70, BOTTOM: 100 };
const WIDTH = 1200 - MARGIN.LEFT - MARGIN.RIGHT;
const HEIGHT = 750 - MARGIN.TOP - MARGIN.BOTTOM;
const AXIS_LABEL_FONT_SIZE = 20;
const FONT_STYLE = "Georgia";
const LABEL_CATEGORY_LENGTH = 200;
const LABEL_SQUARE_LENGTH = 20;
let loadedData;

const svg = d3
  .select("#chart-area")
  .append("svg")
  .attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
  .attr("height", HEIGHT + MARGIN.TOP + MARGIN.BOTTOM);

const group = svg
  .append("g")
  .attr("transform", `translate(${MARGIN.LEFT}, ${MARGIN.TOP})`);

const parseTime = d3.timeParse("%Y");

// scales
// time scale expects a domain of DATE objects (not date as a string)
const xScale = d3.scaleTime().range([0, WIDTH]);
const yScale = d3.scaleLinear().range([HEIGHT, 0]);
const colourScale = d3.scaleOrdinal(d3.schemeSet1);

// axis generators
const xAxisCall = d3.axisBottom().ticks(d3.timeYear.every(20));
const yAxisCall = d3.axisLeft().tickFormat((data) => `${data} mil`);

// area path generator which expects to be given an array of data
// for each element in the array it's described how to interpret that data point as an X and Y coordinate
// the scales are used to return the pixel values of the data
const area = d3.area();

// stack generator which expects an array of data in a specific format
// it generates a stack for the given array of data, returning an array representing each group (basically it retuns an array of arrays)
// the groups are determined by the keys accessor
const stack = d3.stack();

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
  .text("Metric tons")
  .attr("x", -HEIGHT / 2)
  .attr("y", -MARGIN.LEFT + 20)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)");

const getCategoryLabel = (key) => {
  switch (key) {
    case "gas_fuel_consumption":
      return "Gas Fuel";
    case "liquid_fuel_consumption":
      return "Liquid Fuel";
    case "solid_fuel_consumption":
      return "Solid Fuel";
    case "cement_production":
      return "Cement Production";
    case "gas_flaring":
      return "Gas Flaring";
    default:
      return "";
  }
};

////////////////////////////////////////////////////////////////////////
////////////////////// RENDERING THE VISUALISATION /////////////////////
////////////////////////////////////////////////////////////////////////

const renderChart = (emissionData) => {
  // set scale domains
  xScale.domain(d3.extent(emissionData, (data) => data.year));
  yScale.domain([
    d3.min(emissionData, (data) => data.total_carbon_emmisions) / 1.005,
    d3.max(emissionData, (data) => data.total_carbon_emmisions) * 1.005,
  ]);

  // set the transition
  const transition = d3.transition().duration(2000);

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

  // every time we load the data, there is the "columns" property available for us listing the column names
  const keys = emissionData.columns.slice(2, 7);
  // set the colour scale for the keys
  colourScale.domain(keys);

  // we need to tell the stack function which keys are relevant from the whole data
  // the input has to ne an array of strings
  stack.keys(keys);

  // set the data according to which the area generator will draw the area
  area
    .x((layerData) => xScale(layerData.data.year))
    // in each layer there is an array of two elements [y0, y1] for each input value (in our case "year")
    // the first element in the array is the lower value
    .y0((layerData) => yScale(layerData[0]))
    // and the second element in the array is the upper value
    .y1((layerData) => yScale(layerData[1]));

  // a layer represents one area which should be rendered
  const layer = group
    .selectAll(".layer")
    // "stack" generator creates an array with groups of data based on the keys provided in "stack.keys()"
    // for each group it creates an array containing values for "y0" and "y1" for each year
    // based on these values the "area" generator will know how to render the lower and upper line for a particular area
    .data(stack(emissionData))
    // "stack" generator created an array of arrays (representing areas) which will looped over with "enter()"
    .enter()
    .append("g")
    .attr("class", "layer");

  // now we are in a particular group array for which we will render an area
  layer
    .append("path")
    .attr("class", "area")
    .attr("fill", (data) => colourScale(data.key))
    // for each group the area generator will be called
    .attr("d", area);

  // creating a legend
  const legendGroup = group
    .append("g")
    .attr("width", WIDTH)
    .attr("height", 50)
    .attr("transform", "translate(0, -50)");

  const categoryGroup = legendGroup
    .selectAll(".category")
    .data(keys)
    .enter()
    .append("g")
    .attr("class", "category")
    .attr("width", WIDTH / keys.length)
    .attr("height", LABEL_SQUARE_LENGTH)
    .attr(
      "transform",
      (data, index) => `translate(${index * LABEL_CATEGORY_LENGTH}, 0)`
    );

  categoryGroup
    .append("rect")
    .attr("width", LABEL_SQUARE_LENGTH)
    .attr("height", LABEL_SQUARE_LENGTH)
    .attr("fill", (key) => colourScale(key));

  categoryGroup
    .append("text")
    .text((key) => getCategoryLabel(key))
    .attr(
      "transform",
      `translate(${LABEL_SQUARE_LENGTH + 10}, ${LABEL_SQUARE_LENGTH - 5})`
    );
};

/////////////////////////////////////////////////////////////
////////////////////// LOADING THE DATA /////////////////////
/////////////////////////////////////////////////////////////

(async () => {
  const transformData = (data) => {
    // argument "data" represents a row in the file

    Object.keys(data).forEach((key) => {
      if (key === "year") {
        data.year = parseTime(data.year);
      } else {
        data[key] = Number(data[key]);
      }
    });

    return data;
  };

  // a second argument is a function which does a data transformation after it is loaded
  loadedData = await d3.csv(
    "data/global-CO2-emisions-1751_2014.csv",
    transformData
  );

  renderChart(loadedData);
})();
