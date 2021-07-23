const CANVAS_MARGIN = { left: 170, right: 10, top: 10, bottom: 60 };
const GROUP_WIDTH = 1200 - CANVAS_MARGIN.left - CANVAS_MARGIN.right;
const GROUP_HEIGHT = 650 - CANVAS_MARGIN.top - CANVAS_MARGIN.bottom;
const FONT_STYLE = "Georgia";
const FONT_SIZE = 20;
const FIRST_YEAR = 1950;
const LAST_YEAR = 2020;
const TRANSITION_DURATION = 750;
let populationData;
let interval;
let currentYear = FIRST_YEAR;
let numberOfCountries = 5;

const group = d3
  .select("#chart-area")
  .append("svg")
  .attr("width", GROUP_WIDTH + CANVAS_MARGIN.left + CANVAS_MARGIN.right)
  .attr("height", GROUP_HEIGHT + CANVAS_MARGIN.top + CANVAS_MARGIN.bottom)
  .append("g")
  .attr("transform", `translate(${CANVAS_MARGIN.left}, ${CANVAS_MARGIN.top})`);

const xScale = d3.scaleLinear().range([0, GROUP_WIDTH]);

const yScale = d3
  .scaleBand()
  .range([0, GROUP_HEIGHT])
  .paddingInner(0.2)
  .paddingOuter(0.2);

const xAxisCall = d3.axisBottom(xScale);

const yAxisCall = d3.axisLeft(yScale).ticks((data) => data.country);

const xAxisGroup = group
  .append("g")
  .attr("transform", `translate(0, ${GROUP_HEIGHT})`);

const yAxisGroup = group.append("g");

const tooltip = d3
  .tip()
  // this class has to be set, otherwise the tooltil will not be styled and nicely visible
  .attr("class", "d3-tip")
  .html((event, data) => {
    let text = `<strong>Country:</strong> <span style="color:red;text-transform:capitalize">${data.country}</span><br />`;
    text += `<strong>Population:</strong> <span style="color:red">${d3.format(
      ",.0f"
    )(data.population)} mil.</span><br />`;
    text += `<strong>Year:</strong> <span style="color:red">${data.year}</span><br />`;

    return text;
  });

// invoke the tooltip in the context of our visualization
group.call(tooltip);

group
  .append("text")
  .text("Population (in milions)")
  .attr("x", GROUP_WIDTH / 2)
  .attr("y", GROUP_HEIGHT + 55)
  .attr("font-size", FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle");

const yLabel = group
  .append("text")
  .attr("x", -GROUP_HEIGHT / 2 + 120)
  .attr("y", -145)
  .attr("transform", "rotate(-90)")
  .attr("font-size", FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle");

$("#play-button").on("click", function () {
  // grab the button which was clicked
  const button = $(this);
  if (button.text() === "Play") {
    button.text("Pause");
    interval = setInterval(() => {
      updateChart(populationData[currentYear]);

      if (currentYear === LAST_YEAR) {
        currentYear = FIRST_YEAR;
      } else {
        currentYear++;
      }
    }, TRANSITION_DURATION + 50);
  } else {
    button.text("Play");
    clearInterval(interval);
  }
});

$("#reset-button").on("click", () => {
  currentYear = FIRST_YEAR;
  updateChart(populationData[currentYear]);
});

$("#country-number-select").on("change", function () {
  const value = $(this).val();
  numberOfCountries = Number(value);
  updateChart(populationData[currentYear]);
});

// initialise slider
$("#year-slider").slider({
  min: FIRST_YEAR,
  max: 2020,
  step: 1,
  // event handler for sliding
  slide: (event, ui) => {
    currentYear = ui.value;

    updateChart(populationData[currentYear]);
  },
});

const updateChart = (data) => {
  const transition = d3.transition().duration(TRANSITION_DURATION);

  const selectedCountries = data.slice(0, numberOfCountries);

  xScale.domain([0, d3.max(data, (dataItem) => dataItem.population)]);
  yScale.domain(selectedCountries.map((dataItem) => dataItem.country));

  xAxisGroup
    .transition(transition)
    .call(xAxisCall)
    .selectAll("text")
    .attr("font-family", FONT_STYLE);
  yAxisGroup
    .transition(transition)
    .call(yAxisCall)
    .selectAll("text")
    .attr("font-family", FONT_STYLE);

  yLabel.text(`Top ${numberOfCountries} Most Populated Countries`);

  const bars = group
    .selectAll("rect")
    .data(selectedCountries, (dataItem) => dataItem.country);

  bars
    .exit()
    .transition(transition)
    .attr("y", yScale(0))
    .attr("width", 0)
    .remove();

  bars
    .enter()
    .append("rect")
    .attr("fill", "#ff8c00")
    // x-position before the transition
    .attr("x", xScale(0))
    // height before the transition
    .attr("height", 0)
    .attr("width", 0)
    .on("mouseover", tooltip.show)
    .on("mouseout", tooltip.hide)
    // "merge" method sets attributes of UPDATE and ENTER selections at the same time
    // we have to pass the selection we want to merge it with
    // all the attributes set BEFORE calling "merge" are applied only to the ENTER selection
    .merge(bars)
    .transition(transition)
    // y-position after the transition
    .attr("y", (data) => yScale(data.country))
    // width after the transition
    .attr("width", (data) => xScale(data.population))
    .attr("height", yScale.bandwidth());

  // also update slider for each iteration
  $("#year-slider").slider("value", currentYear);
  $("#year")[0].innerHTML = String(currentYear);
};

const transformData = (loadedData) => {
  const transformedData = {};

  loadedData.forEach((countryData) => {
    Object.keys(countryData).forEach((key) => {
      if (key !== "country" && key !== "country_code") {
        if (transformedData[key] === undefined) {
          transformedData[key] = [];
        }

        transformedData[key].push({
          country: countryData.country,
          population: Number(countryData[key]),
          year: key,
        });
      }
    });
  });

  // sort countries for each year according to their population in descending order
  // (i.e. the most populated counries are first)
  Object.keys(transformedData).forEach((yearKey) => {
    transformedData[yearKey].sort((first, second) => {
      return second.population - first.population;
    });
  });

  return transformedData;
};

(async () => {
  const loadedData = await d3.csv("data/UN_Population_1950-2020.csv");

  populationData = transformData(loadedData);

  updateChart(populationData[FIRST_YEAR]);
})();
