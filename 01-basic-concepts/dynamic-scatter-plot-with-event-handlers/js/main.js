/////////////////////////////////////////////////////////////////////////
////////////////////// SETTING UP THE VISUALISATION /////////////////////
/////////////////////////////////////////////////////////////////////////

const MARGIN = { top: 10, right: 10, bottom: 55, left: 65 };
const WIDTH = 1060 - MARGIN.left - MARGIN.right;
const HEIGHT = 740 - MARGIN.top - MARGIN.bottom;
const AXIS_LABEL_FONT_SIZE = 20;
const CONTINENT_BAR = {
  width: 120,
  height: 50,
  x: WIDTH - 140,
  y: (index) => HEIGHT / 2 + index * 60,
  text: {
    x: WIDTH - 80,
    y: (index) => HEIGHT / 2 + index * 60 + 30,
  },
};
const FONT_STYLE = "Courier";
let currentYear;
let dataIndex = 0;
let interval;
let countriesData;

const group = d3
  .select("#plot-area")
  .append("svg")
  .attr("width", WIDTH + MARGIN.left + MARGIN.right)
  .attr("height", HEIGHT + MARGIN.top + MARGIN.bottom)
  .append("g")
  .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

const xScale = d3.scaleLog().base(10).domain([100, 150000]).range([0, WIDTH]);
const yScale = d3.scaleLinear().domain([0, 90]).range([HEIGHT, 0]);
const colourScale = d3.scaleOrdinal().range(d3.schemeSet3);
const circleScale = d3.scaleLinear().range([5, 25]);

const xAxisCall = d3
  .axisBottom(xScale)
  .tickValues([400, 4000, 40000])
  .tickFormat((value) => d3.format("$")(value));
const yAxisCall = d3.axisLeft(yScale);

const xAxisGroup = group
  .append("g")
  .attr("transform", `translate(0, ${HEIGHT})`)
  .attr("width", WIDTH);
xAxisGroup.call(xAxisCall);

const yAxisGroup = group.append("g");
yAxisGroup.call(yAxisCall);

// NOTE: tooltip functionality is provided by the external library "d3-v6-tip.min.js" and is not a part of standart D3 library
// initialize tooltip
const tooltip = d3
  .tip()
  // this class has to be set, otherwise the tooltip will not be styled and nicely visible
  .attr("class", "d3-tip")
  .html((event, data) => {
    let text = `<strong>Country:</strong> <span style="color:red;text-transform:capitalize">${data.country}</span><br />`;
    text += `<strong>Continent:</strong> <span style="color:red;text-transform:capitalize">${data.continent}</span><br />`;
    text += `<strong>Life Expectancy:</strong> <span style="color:red">${d3.format(
      ".2f"
    )(data.life_exp)}</span><br />`;
    text += `<strong>GDP per Capita:</strong> <span style="color:red">${d3.format(
      ",.0f"
    )(data.income)}</span><br />`;
    text += `<strong>Population:</strong> <span style="color:red">${d3.format(
      ",.0f"
    )(data.population)}</span><br />`;

    return text;
  });

// invoke the tooltip in the context of our visualization
group.call(tooltip);

const yearLabel = group
  .append("text")
  .attr("x", WIDTH - 45)
  .attr("y", HEIGHT - 35)
  .attr("font-size", 35)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "end");

group
  .append("text")
  .text("GDP per Capita")
  .attr("x", WIDTH / 2)
  .attr("y", HEIGHT + 40)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle");

group
  .append("text")
  .text("Life Expectancy (Years)")
  .attr("x", -HEIGHT / 2)
  .attr("y", -MARGIN.left + 15)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)");

////////////////////////////////////////////////////////////////////////////////////
////////////////////// ATTACHING EVENT HANDLERS (using jQuery) /////////////////////
////////////////////////////////////////////////////////////////////////////////////

// we cannot use an arrow function here, because if we do "this" would not point to the button which we clicked
$("#play-button").on("click", function () {
  // grab the button which was clicked
  const button = $(this);
  if (button.text() === "Play") {
    button.text("Pause");
    interval = setInterval(() => {
      step();
    }, 200);
  } else {
    button.text("Play");
    clearInterval(interval);
  }
});

$("#reset-button").on("click", () => {
  dataIndex = 0;
  // this is needed for the case when the visualisation is paused and we want to see the plot in the initial state
  updatePlot(countriesData[dataIndex]);
});

$("#continent-select").on("change", () => {
  // this is needed for the case when the visualisation is paused and we want to change the continent
  updatePlot(countriesData[dataIndex]);
});

// initialise slider
$("#date-slider").slider({
  min: 1800,
  max: 2014,
  step: 1,
  // event handler for sliding
  slide: (event, ui) => {
    dataIndex = ui.value - 1800;
    updatePlot(countriesData[dataIndex]);
  },
});

/////////////////////////////////////////////////////////////
////////////////////// HELPER FUNCTIONS /////////////////////
/////////////////////////////////////////////////////////////

const getRadiusFromPopulation = (population) => {
  // Area = PI * Radius^2
  return Math.sqrt(population / Math.PI);
};

const extractContinents = (countries) => {
  const allContinents = countries.countries.map((country) => country.continent);
  return Array.from(new Set(allContinents));
};

const step = () => {
  currentYear = countriesData[dataIndex++];
  updatePlot(currentYear);

  if (dataIndex === countriesData.length) {
    dataIndex = 0;
  }
};

//////////////////////////////////////////////////////////////
////////////////////// UPDATING THE PLOT /////////////////////
//////////////////////////////////////////////////////////////

const updatePlot = (countriesData) => {
  const continentValue = $("#continent-select").val();

  // filter countries according to the value selected on the continent select box
  const countries = countriesData.countries.filter((country) => {
    if (continentValue === "all") return true;

    return country.continent === continentValue;
  });
  const year = countriesData.year;
  const transition = d3.transition().duration(100);

  circleScale.domain([
    0,
    d3.max(countries, (country) => getRadiusFromPopulation(country.population)),
  ]);
  yearLabel.text(year);

  const circles = group
    .selectAll("circle")
    .data(countries, (item) => item.country);

  circles.exit().remove();

  circles
    .enter()
    .append("circle")
    .style("fill", (country) => colourScale(country.continent))
    // show and hide tooltip on mouse events
    // attaching the event handlers for tooltips should be done only once and before a transition is set
    .on("mouseover", tooltip.show)
    .on("mouseout", tooltip.hide)
    .merge(circles)
    .transition(transition)
    .attr("cx", (country) => xScale(country.income))
    .attr("cy", (country) => yScale(country.life_exp))
    .attr("r", (country) =>
      circleScale(getRadiusFromPopulation(country.population))
    );

  // also update slider for each iteration
  $("#date-slider").slider("value", year);
  $("#year")[0].innerHTML = String(year);
};

///////////////////////////////////////////////////////////////////////////
////////////////////// READING AND PREPARING THE DATA /////////////////////
///////////////////////////////////////////////////////////////////////////
(async () => {
  const data = await d3.json("data/data.json");

  // clean data
  countriesData = data.map((year) => {
    const countriesWithoutNull = year.countries
      .filter((country) => country.income && country.life_exp)
      .map((country) => {
        country.population = Number(country.population);
        country.income = Number(country.income);
        country.life_exp = Number(country.life_exp);

        return country;
      });

    return {
      countries: countriesWithoutNull,
      year: year.year,
    };
  });

  const continents = extractContinents(countriesData[0]);
  colourScale.domain(continents);

  const bars = group.selectAll("rect").data(continents);

  bars
    .enter()
    .append("rect")
    .attr("x", CONTINENT_BAR.x)
    .attr("y", (data, index) => CONTINENT_BAR.y(index))
    .attr("width", CONTINENT_BAR.width)
    .attr("height", CONTINENT_BAR.height)
    .style("fill", (continent) => colourScale(continent));

  bars
    .enter()
    .append("text")
    .text((continent) => continent)
    .attr("x", CONTINENT_BAR.text.x)
    .attr("y", (data, index) => CONTINENT_BAR.text.y(index))
    .attr("font-size", AXIS_LABEL_FONT_SIZE)
    .attr("font-family", FONT_STYLE)
    .attr("text-anchor", "middle");

  // initially show the data for the first year before a user starts the visualisation
  updatePlot(countriesData[0]);
})();
